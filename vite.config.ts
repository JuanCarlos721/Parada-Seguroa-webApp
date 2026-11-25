import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

interface StoredCommand {
  action: 'REQUEST_STOP' | 'CANCEL_STOP'
  source: string
  timestamp: number
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let totalBytes = 0

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length
      if (totalBytes > 16 * 1024) {
        reject(new Error('Payload demasiado grande'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim()
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('JSON inválido'))
      }
    })

    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.end(JSON.stringify(body))
}

/**
 * Puente HTTP REST ligero para que el ESP32 o herramientas locales puedan
 * intercambiar estado y comandos en /api/parada/p14/* durante desarrollo y Docker.
 */
function paradaHardwareBridgePlugin(): Plugin {
  let latestTelemetry: Record<string, unknown> | null = null
  let telemetryReceivedAt = 0
  let latestCommand: StoredCommand | null = null

  return {
    name: 'parada-hardware-bridge',
    configureServer(server) {
      server.middlewares.use('/api/parada/p14', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.end()
          return
        }

        const pathname = (req.url ?? '/').split('?')[0]

        if (req.method === 'GET' && pathname === '/health') {
          sendJson(res, 200, {
            ok: true,
            service: 'parada-segura-hardware-bridge',
            stop_id: 14,
            has_telemetry: Boolean(latestTelemetry),
            telemetry_age_ms: telemetryReceivedAt > 0 ? Date.now() - telemetryReceivedAt : null,
          })
          return
        }

        if (pathname === '/estado') {
          if (req.method === 'GET') {
            const isFresh = Boolean(latestTelemetry && Date.now() - telemetryReceivedAt < 30_000)
            sendJson(res, 200, {
              connected: isFresh,
              telemetry: isFresh ? latestTelemetry : null,
              received_at: telemetryReceivedAt || null,
            })
            return
          }

          if (req.method === 'POST') {
            try {
              const body = await readJsonBody(req)
              if (!body || typeof body !== 'object' || Array.isArray(body)) {
                sendJson(res, 400, { ok: false, error: 'Se esperaba un objeto JSON de telemetría' })
                return
              }
              latestTelemetry = body as Record<string, unknown>
              telemetryReceivedAt = Date.now()
              sendJson(res, 200, {
                ok: true,
                received_at: telemetryReceivedAt,
                pending_command: latestCommand,
              })
            } catch (error) {
              sendJson(res, 400, {
                ok: false,
                error: error instanceof Error ? error.message : 'Error leyendo JSON',
              })
            }
            return
          }
        }

        if (pathname === '/comandos') {
          if (req.method === 'GET') {
            sendJson(res, 200, { ok: true, command: latestCommand })
            return
          }

          if (req.method === 'POST') {
            try {
              const body = (await readJsonBody(req)) as Record<string, unknown>
              const action = body?.action
              if (action !== 'REQUEST_STOP' && action !== 'CANCEL_STOP') {
                sendJson(res, 400, {
                  ok: false,
                  error: 'action debe ser REQUEST_STOP o CANCEL_STOP',
                })
                return
              }
              latestCommand = {
                action,
                source: typeof body.source === 'string' ? body.source : 'WEBAPP_PWA',
                timestamp: Date.now(),
              }
              sendJson(res, 200, { ok: true, command: latestCommand })
            } catch (error) {
              sendJson(res, 400, {
                ok: false,
                error: error instanceof Error ? error.message : 'Error leyendo comando',
              })
            }
            return
          }
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), paradaHardwareBridgePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
})
