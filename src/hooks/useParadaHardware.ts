import { useCallback, useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import {
  PARADA_HARDWARE_CONFIG,
  parseAndValidateTelemetry,
  type ConnectionState,
  type HardwareMode,
  type MockScenarioPreset,
  type ParadaTelemetry,
} from '../types/paradaHardware'

export interface UseParadaHardwareResult {
  mode: HardwareMode
  connectionState: ConnectionState
  brokerConnected: boolean
  telemetry: ParadaTelemetry | null
  warning: string | null
  latencyMs: number | null
  lastCommandAction: 'REQUEST_STOP' | 'CANCEL_STOP' | null
  lastCommandAt: number | null
  reconnectAttempt: number
  mockPreset: MockScenarioPreset
  isHardwareReady: boolean
  isAlertActive: boolean
  setMode: (nextMode: HardwareMode) => void
  setMockPreset: (preset: MockScenarioPreset) => void
  requestStop: () => Promise<void>
  cancelStop: () => Promise<void>
  retryConnection: () => void
  clearWarning: () => void
}

async function postRestCommand(action: 'REQUEST_STOP' | 'CANCEL_STOP'): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(PARADA_HARDWARE_CONFIG.restComandosPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, source: 'WEBAPP_PWA' }),
      signal: controller.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

export function useParadaHardware(): UseParadaHardwareResult {
  const [mode, setModeState] = useState<HardwareMode>('real')
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [brokerConnected, setBrokerConnected] = useState(false)
  const [telemetry, setTelemetry] = useState<ParadaTelemetry | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [lastCommandAction, setLastCommandAction] = useState<'REQUEST_STOP' | 'CANCEL_STOP' | null>(
    null,
  )
  const [lastCommandAt, setLastCommandAt] = useState<number | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [reconnectNonce, setReconnectNonce] = useState(0)

  // Estado interno para la simulación de falsa conexión QA
  const [mockPreset, setMockPresetState] = useState<MockScenarioPreset>('night')
  const [mockAlertActive, setMockAlertActive] = useState(false)

  const mqttClientRef = useRef<MqttClient | null>(null)
  const lastValidPacketRef = useRef<number>(0)

  const ingestPayload = useCallback((raw: string | unknown, source: 'mqtt' | 'rest' | 'mock') => {
    const parsed = parseAndValidateTelemetry(raw, source)
    if (!parsed.valid || !parsed.telemetry) {
      if (parsed.warning) {
        setWarning(parsed.warning)
      }
      return
    }

    lastValidPacketRef.current = Date.now()
    setWarning(null)
    setTelemetry(parsed.telemetry)
    setConnectionState('connected')
  }, [])

  // Ciclo principal para modo REAL (MQTT over WSS + puente HTTP REST)
  useEffect(() => {
    if (mode !== 'real') {
      if (mqttClientRef.current) {
        mqttClientRef.current.end(true)
        mqttClientRef.current = null
      }
      return
    }

    let cancelled = false
    const connectStartedAt = performance.now()
    setConnectionState('connecting')
    setBrokerConnected(false)
    setWarning(null)

    const clientId = `parada_pwa_${Math.random().toString(16).slice(2, 8)}`
    const client = mqtt.connect(PARADA_HARDWARE_CONFIG.brokerWssUrl, {
      clientId,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 4000,
      keepalive: 30,
    })
    mqttClientRef.current = client

    client.on('connect', () => {
      if (cancelled) return
      const rtt = Math.max(8, Math.round(performance.now() - connectStartedAt))
      setLatencyMs(rtt)
      setBrokerConnected(true)
      setReconnectAttempt(0)

      const hasRecentPacket =
        lastValidPacketRef.current > 0 &&
        Date.now() - lastValidPacketRef.current < PARADA_HARDWARE_CONFIG.heartbeatTimeoutMs

      setConnectionState(hasRecentPacket ? 'connected' : 'waiting_hardware')

      client.subscribe(PARADA_HARDWARE_CONFIG.stateTopic, { qos: 1 }, (err) => {
        if (err && !cancelled) {
          setWarning(`No se pudo suscribir a ${PARADA_HARDWARE_CONFIG.stateTopic}`)
        }
      })
    })

    client.on('message', (topic, payload, packet) => {
      if (cancelled || topic !== PARADA_HARDWARE_CONFIG.stateTopic) return
      if (packet.retain) return
      ingestPayload(payload.toString(), 'mqtt')
    })

    client.on('reconnect', () => {
      if (cancelled) return
      setReconnectAttempt((n) => n + 1)
      setBrokerConnected(false)
      setConnectionState('connecting')
    })

    client.on('offline', () => {
      if (cancelled) return
      setBrokerConnected(false)
      setConnectionState('offline')
    })

    client.on('close', () => {
      if (cancelled) return
      setBrokerConnected(false)
    })

    client.on('error', () => {
      if (cancelled) return
      setBrokerConnected(false)
      setConnectionState('offline')
    })

    // Sondeo ligero al puente HTTP REST local (para pruebas de ESP32 por LAN/HTTP)
    const pollRestBridge = async () => {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 2200)
      try {
        const res = await fetch(PARADA_HARDWARE_CONFIG.restEstadoPath, {
          signal: controller.signal,
        })
        if (!res.ok || cancelled) return
        const contentType = res.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) return
        const data = (await res.json()) as {
          connected?: boolean
          telemetry?: Record<string, unknown> | null
        }
        if (data.connected && data.telemetry && !cancelled) {
          ingestPayload(data.telemetry, 'rest')
        }
      } catch {
        // En compilado Nginx estático no existe el puente local; continúa vía MQTT WSS.
      } finally {
        window.clearTimeout(timer)
      }
    }

    void pollRestBridge()
    const restPollId = window.setInterval(() => {
      void pollRestBridge()
    }, 2500)

    // Vigila expiración de latido del ESP32 para bloquear acciones si deja de transmitir
    const heartbeatCheckId = window.setInterval(() => {
      if (cancelled) return
      if (
        lastValidPacketRef.current > 0 &&
        Date.now() - lastValidPacketRef.current > PARADA_HARDWARE_CONFIG.heartbeatTimeoutMs
      ) {
        setConnectionState((prev) => (prev === 'connected' ? 'waiting_hardware' : prev))
      }
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(restPollId)
      window.clearInterval(heartbeatCheckId)
      client.end(true)
      mqttClientRef.current = null
    }
  }, [ingestPayload, mode, reconnectNonce])

  // Ciclo para simulación QA: Falsa Conexión ESP32
  useEffect(() => {
    if (mode !== 'mock_connected') return

    setBrokerConnected(true)
    setConnectionState('connected')
    setLatencyMs(18)
    setReconnectAttempt(0)

    const emitMockPacket = (step: number) => {
      if (mockPreset === 'out_of_range') {
        ingestPayload({ stop_id: 14, lux: -50, seats_free: -3 }, 'mock')
        return
      }

      const isNight = mockPreset === 'night'
      const luxBase = isNight ? 62 : 842
      const luxJitter = ((step % 5) - 2) * 2
      const lux = luxBase + luxJitter
      const ledState = mockAlertActive ? 'ALERT' : isNight ? 'COURTESY' : 'OFF'
      const brightness = mockAlertActive ? 100 : isNight ? 30 : 0

      ingestPayload(
        {
          stop_id: 14,
          lux,
          night_mode: isNight,
          button_pressed: mockAlertActive,
          led_state: ledState,
          led_brightness: brightness,
          seats_free: mockAlertActive ? 5 : 7,
          occupancy_color: mockAlertActive ? 'YELLOW' : 'GREEN',
          device_id: 'ESP32-P14-SIM',
          rssi: -64 + (step % 3),
        },
        'mock',
      )
    }

    let tick = 0
    emitMockPacket(tick)
    const id = window.setInterval(() => {
      tick += 1
      emitMockPacket(tick)
    }, 1800)

    return () => window.clearInterval(id)
  }, [ingestPayload, mockAlertActive, mockPreset, mode])

  // Ciclo para simulación QA: Falla / Desconexión Abrupta de Red
  useEffect(() => {
    if (mode !== 'mock_offline') return

    setBrokerConnected(false)
    setConnectionState('offline')
    setLatencyMs(null)
    setReconnectAttempt(1)
    setWarning('Enlace MQTT/Wi-Fi interrumpido abruptamente. Conservando última lectura local.')

    const retryTimer = window.setInterval(() => {
      setReconnectAttempt((prev) => (prev < 5 ? prev + 1 : 5))
    }, 2800)

    return () => window.clearInterval(retryTimer)
  }, [mode])

  const setMode = useCallback((nextMode: HardwareMode) => {
    setWarning(null)
    if (nextMode === 'real') {
      setMockAlertActive(false)
      // Al volver de mock a real, requiere paquete auténtico del hardware de Lina
      lastValidPacketRef.current = 0
      setTelemetry(null)
      setLatencyMs(null)
    }
    setModeState(nextMode)
  }, [])

  const setMockPreset = useCallback((preset: MockScenarioPreset) => {
    setMockPresetState(preset)
    if (preset !== 'out_of_range') {
      setWarning(null)
    }
  }, [])

  const sendStopCommand = useCallback(
    async (action: 'REQUEST_STOP' | 'CANCEL_STOP') => {
      if (connectionState !== 'connected') return

      setLastCommandAction(action)
      setLastCommandAt(Date.now())

      if (mode === 'mock_connected') {
        setMockAlertActive(action === 'REQUEST_STOP')
        return
      }

      const payload = JSON.stringify({ action, source: 'WEBAPP_PWA' })
      if (mqttClientRef.current?.connected) {
        mqttClientRef.current.publish(PARADA_HARDWARE_CONFIG.commandTopic, payload, { qos: 1 })
      }
      await postRestCommand(action)
    },
    [connectionState, mode],
  )

  const requestStop = useCallback(() => sendStopCommand('REQUEST_STOP'), [sendStopCommand])
  const cancelStop = useCallback(() => sendStopCommand('CANCEL_STOP'), [sendStopCommand])

  const retryConnection = useCallback(() => {
    setWarning(null)
    if (mode === 'mock_offline') {
      lastValidPacketRef.current = 0
      setTelemetry(null)
      setModeState('real')
    }
    setReconnectNonce((n) => n + 1)
  }, [mode])

  const clearWarning = useCallback(() => setWarning(null), [])

  const isHardwareReady =
    connectionState === 'connected' && telemetry !== null && mode !== 'mock_offline'
  const isAlertActive = Boolean(
    isHardwareReady && (telemetry?.led_state === 'ALERT' || telemetry?.button_pressed),
  )

  return {
    mode,
    connectionState,
    brokerConnected,
    telemetry,
    warning,
    latencyMs,
    lastCommandAction,
    lastCommandAt,
    reconnectAttempt,
    mockPreset,
    isHardwareReady,
    isAlertActive,
    setMode,
    setMockPreset,
    requestStop,
    cancelStop,
    retryConnection,
    clearWarning,
  }
}
