import { useState } from 'react'
import { useParadaHardware } from '../hooks/useParadaHardware'
import { PARADA_HARDWARE_CONFIG } from '../types/paradaHardware'

interface ParadaScreenProps {
  onBackToMap: () => void
}

function formatOccupancyLabel(color?: 'GREEN' | 'YELLOW' | 'RED'): string {
  if (color === 'GREEN') return 'Verde'
  if (color === 'YELLOW') return 'Amarillo'
  if (color === 'RED') return 'Rojo'
  return 'Sin datos'
}

function getLightingClassification(lux: number | undefined) {
  if (lux === undefined) {
    return {
      label: 'Sin lectura',
      badgeClass: 'neutral',
      percent: 0,
      detail: 'Esperando señal del sensor LDR',
    }
  }
  const percent = Math.min(100, Math.max(4, Math.round((lux / 1000) * 100)))
  if (lux < PARADA_HARDWARE_CONFIG.luxNightThreshold) {
    return {
      label: 'Penumbra (< 500 lux)',
      badgeClass: 'amber',
      percent,
      detail: 'Iluminación nocturna baja · Cortesía activa',
    }
  }
  return {
    label: 'Luz diurna (≥ 500 lux)',
    badgeClass: 'green',
    percent,
    detail: 'Iluminación ambiental alta · Modo día',
  }
}

export function ParadaScreen({ onBackToMap }: ParadaScreenProps) {
  const {
    mode,
    connectionState,
    brokerConnected,
    telemetry,
    warning,
    latencyMs,
    lastCommandAction,
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
  } = useParadaHardware()

  const [qaMenuOpen, setQaMenuOpen] = useState(false)

  const lighting = getLightingClassification(telemetry?.lux)
  const ledBrightness = telemetry?.led_brightness ?? 0

  const headerBadge = (() => {
    if (connectionState === 'offline') return { text: 'Offline', tone: 'red' }
    if (mode === 'mock_connected') return { text: `Simulado · ${latencyMs ?? 18} ms`, tone: 'blue' }
    if (isAlertActive) return { text: 'QoS 1 OK', tone: 'green' }
    if (isHardwareReady) return { text: `${latencyMs ?? 18} ms`, tone: 'green' }
    if (brokerConnected) return { text: 'Esperando ESP32', tone: 'amber' }
    return { text: 'Conectando...', tone: 'neutral' }
  })()

  const heroModeClass = (() => {
    if (connectionState === 'offline') return 'offline-mode'
    if (isAlertActive) return 'alert-mode'
    if (isHardwareReady && telemetry?.night_mode) return 'normal-mode'
    if (isHardwareReady) return 'day-mode'
    return 'waiting-mode'
  })()

  return (
    <main className="parada-screen">
      {/* Encabezado limpio estilo Figma en Liquid Glass (sin barra segmentada superior) */}
      <header className="parada-header">
        <button type="button" className="parada-back-btn" onClick={onBackToMap}>
          <span aria-hidden="true">‹</span> Mapa
        </button>

        <div className="parada-header-center">
          <h1 className="parada-title">
            Parada #{telemetry?.stop_id ?? PARADA_HARDWARE_CONFIG.defaultStopId} · Calz. del Tec.
          </h1>
        </div>

        <div className="parada-header-actions">
          <span className={`parada-status-pill ${headerBadge.tone}`}>{headerBadge.text}</span>
          <button
            type="button"
            className={`qa-hidden-trigger ${qaMenuOpen || mode !== 'real' ? 'active' : ''}`}
            onClick={() => setQaMenuOpen((prev) => !prev)}
            aria-label="Opciones ocultas de prueba y simulación IoT"
            aria-expanded={qaMenuOpen}
            title="Pruebas QA IoT"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Menú oculto QA: alternar Hardware Real / Falsa Conexión / Falla Abrupta de Red */}
      {qaMenuOpen && (
        <section className="qa-popover" aria-label="Panel oculto de simulación QA">
          <div className="qa-popover-head">
            <span className="qa-popover-title">Simulación QA · Hardware y Red</span>
            <button
              type="button"
              className="qa-close-btn"
              onClick={() => setQaMenuOpen(false)}
              aria-label="Cerrar panel de pruebas"
            >
              ✕
            </button>
          </div>

          <div className="qa-mode-grid">
            <button
              type="button"
              className={`qa-mode-btn ${mode === 'real' ? 'active' : ''}`}
              onClick={() => setMode('real')}
            >
              Hardware Real
            </button>
            <button
              type="button"
              className={`qa-mode-btn ${mode === 'mock_connected' ? 'active-sim' : ''}`}
              onClick={() => setMode('mock_connected')}
            >
              Prueba / Falsa Conexión
            </button>
            <button
              type="button"
              className={`qa-mode-btn ${mode === 'mock_offline' ? 'active-err' : ''}`}
              onClick={() => setMode('mock_offline')}
            >
              Simular desconexión
            </button>
          </div>

          {mode === 'mock_connected' && (
            <div className="qa-preset-row">
              <button
                type="button"
                className={`qa-preset-chip ${mockPreset === 'night' ? 'active' : ''}`}
                onClick={() => setMockPreset('night')}
              >
                Penumbra (62 lux)
              </button>
              <button
                type="button"
                className={`qa-preset-chip ${mockPreset === 'day' ? 'active' : ''}`}
                onClick={() => setMockPreset('day')}
              >
                Día (842 lux)
              </button>
              <button
                type="button"
                className={`qa-preset-chip ${mockPreset === 'out_of_range' ? 'active' : ''}`}
                onClick={() => setMockPreset('out_of_range')}
              >
                Rango inválido (-50)
              </button>
            </div>
          )}
        </section>
      )}

      <div className="parada-scroll-body">
        {/* Tarjeta Hero: Aro LED WS2812B */}
        <section className={`iot-hero-card ${heroModeClass}`} aria-label="Estado del Aro LED">
          <div className="iot-ring-wrap" aria-hidden="true">
            {connectionState === 'offline' ? (
              <svg width="78" height="78" viewBox="0 0 78 78" fill="none">
                <circle
                  cx="39"
                  cy="39"
                  r="33"
                  stroke="#F59E0B"
                  strokeWidth="5"
                  strokeDasharray="8 6"
                />
                <path
                  d="M39 24V42M39 50H39.02"
                  stroke="#FBBF24"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            ) : isAlertActive ? (
              <svg width="78" height="78" viewBox="0 0 78 78" fill="none" className="ring-pulse">
                <circle cx="39" cy="39" r="36" stroke="#10B981" strokeOpacity="0.35" strokeWidth="6" />
                <circle cx="39" cy="39" r="30" stroke="#34D399" strokeWidth="6" />
                <circle cx="39" cy="39" r="20" fill="#064E3B" stroke="#6EE7B7" strokeWidth="2" />
                <circle cx="39" cy="39" r="11" fill="#10B981" />
                <text x="39" y="42" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800">
                  360°
                </text>
              </svg>
            ) : isHardwareReady ? (
              <svg width="78" height="78" viewBox="0 0 78 78" fill="none">
                <circle
                  cx="39"
                  cy="39"
                  r="34"
                  stroke={telemetry?.night_mode ? '#FDE047' : '#38BDF8'}
                  strokeOpacity="0.28"
                  strokeWidth="7"
                />
                <circle
                  cx="39"
                  cy="39"
                  r="34"
                  stroke={telemetry?.night_mode ? '#FEF08A' : '#7DD3FC'}
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                <circle cx="39" cy="39" r="21" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                <circle cx="39" cy="39" r="12" fill="#334155" />
                <text x="39" y="42" textAnchor="middle" fill="#F8FAFC" fontSize="8.5" fontWeight="700">
                  IP65
                </text>
              </svg>
            ) : (
              <svg width="78" height="78" viewBox="0 0 78 78" fill="none">
                <circle
                  cx="39"
                  cy="39"
                  r="33"
                  stroke="#64748B"
                  strokeOpacity="0.45"
                  strokeWidth="4"
                  strokeDasharray="5 5"
                />
                <circle cx="39" cy="39" r="20" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                <text x="39" y="42" textAnchor="middle" fill="#94A3B8" fontSize="8" fontWeight="700">
                  WAIT
                </text>
              </svg>
            )}
          </div>

          <div className="iot-hero-content">
            {connectionState === 'offline' ? (
              <>
                <span className="iot-status-pill warn-amber">⚠ ALERTA DE CONECTIVIDAD MQTT</span>
                <h2 className="iot-hero-title">Modo Offline-First Activo</h2>
                <p className="iot-hero-desc">
                  Conexión interrumpida. El poste conserva encendido local en &lt; 5 ms y
                  reintenta enlace ({reconnectAttempt}/5).
                </p>
              </>
            ) : isAlertActive ? (
              <>
                <span className="iot-status-pill active-green">● ALERTA ACTIVA · BALIZA 360°</span>
                <h2 className="iot-hero-title">Aro LED WS2812B al {ledBrightness}%</h2>
                <p className="iot-hero-desc">
                  Solicitud confirmada (&lt; 5 ms). Baliza visible a más de 300 m para el chofer.
                </p>
              </>
            ) : isHardwareReady && telemetry?.night_mode ? (
              <>
                <span className="iot-status-pill">● NORMAL · LUZ CORTESÍA {ledBrightness}%</span>
                <h2 className="iot-hero-title">Aro LED WS2812B en Espera</h2>
                <p className="iot-hero-desc">
                  Luz blanca cálida encendida por el LDR ({ledBrightness}%). Botón Pull-Up listo.
                </p>
              </>
            ) : isHardwareReady ? (
              <>
                <span className="iot-status-pill day-sky">● MODO DÍA · BRILLO {ledBrightness}%</span>
                <h2 className="iot-hero-title">Aro LED WS2812B en Reposo</h2>
                <p className="iot-hero-desc">
                  Iluminación ambiental suficiente. Listo para activar baliza 360° al solicitar.
                </p>
              </>
            ) : (
              <>
                <span className="iot-status-pill waiting-slate">◌ ESPERANDO HARDWARE ESP32</span>
                <h2 className="iot-hero-title">Aro LED sin vínculo físico</h2>
                <p className="iot-hero-desc">
                  Escuchando en tiempo real en MQTT y HTTP. Conecta la placa ESP32 para operar.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Banner defensivo si llega JSON inválido o lectura fuera de rango (PI-09 / PI-10) */}
        {warning && (
          <div className="parada-warning-banner" role="alert">
            <span>{warning}</span>
            <button type="button" onClick={clearWarning} aria-label="Ocultar aviso">
              ✕
            </button>
          </div>
        )}

        {/* Grid 2 columnas: Fotorresistencia LDR + Nivel de Iluminación y Conectividad ESP32 */}
        <section className="sensor-grid" aria-label="Sensores y conectividad">
          <article className="sensor-card">
            <div className="sensor-card-label">FOTORRESISTENCIA LDR</div>
            <div className="sensor-card-value">
              {telemetry ? `${telemetry.lux} lux` : '-- lux'}
            </div>
            <span className={`parada-badge ${lighting.badgeClass}`}>{lighting.label}</span>
            <div className="light-level-meter" aria-label="Nivel de iluminación">
              <div className="light-level-track">
                <div
                  className={`light-level-fill ${lighting.badgeClass}`}
                  style={{ width: `${lighting.percent}%` }}
                />
              </div>
              <div className="sensor-card-meta">Nivel iluminación · GPIO 34</div>
            </div>
          </article>

          <article className="sensor-card">
            <div className="sensor-card-label">CONECTIVIDAD ESP32</div>
            <div
              className={`sensor-card-value ${
                connectionState === 'connected'
                  ? 'text-green'
                  : connectionState === 'offline'
                    ? 'text-red'
                    : 'text-muted'
              }`}
            >
              {connectionState === 'connected'
                ? 'Online'
                : connectionState === 'offline'
                  ? 'Offline'
                  : connectionState === 'waiting_hardware'
                    ? 'En espera'
                    : 'Conectando'}
            </div>
            <span
              className={`parada-badge ${
                connectionState === 'connected'
                  ? 'green'
                  : connectionState === 'offline'
                    ? 'red'
                    : 'amber'
              }`}
            >
              {connectionState === 'connected'
                ? mode === 'mock_connected'
                  ? 'Simulado · MQTT QoS 1'
                  : telemetry?.source === 'rest'
                    ? 'HTTP Bridge Activo'
                    : 'MQTT QoS 1 Activo'
                : connectionState === 'offline'
                  ? `Sin Red (${reconnectAttempt}/5)`
                  : brokerConnected
                    ? 'Broker OK · Sin ESP32'
                    : 'Handshake WSS...'}
            </span>
            <div className="sensor-card-meta">
              {telemetry
                ? `${telemetry.device_id}${telemetry.rssi ? ` · ${telemetry.rssi} dBm` : ''}`
                : 'broker.emqx.io:8084'}
            </div>
          </article>
        </section>

        {/* Parámetros en vivo y confirmación de solicitud / respuesta Edge */}
        <section
          className={`parada-info-card ${isAlertActive ? 'confirmed' : ''}`}
          aria-label="Parámetros en tiempo real"
        >
          <div className="info-card-row">
            <span className="sensor-card-label">
              {isAlertActive ? '✓ BALIZA Y CONSOLA ACTIVAS' : 'PARÁMETROS DEL NODO EN VIVO'}
            </span>
            <span
              className={`parada-badge ${
                telemetry?.occupancy_color === 'GREEN'
                  ? 'green'
                  : telemetry?.occupancy_color === 'YELLOW'
                    ? 'amber'
                    : telemetry?.occupancy_color === 'RED'
                      ? 'red'
                      : 'neutral'
              }`}
            >
              {telemetry
                ? `${formatOccupancyLabel(telemetry.occupancy_color)} · ${telemetry.seats_free} lugares`
                : 'Sin aforo'}
            </span>
          </div>

          <div className="parada-params-grid">
            <div>
              <span className="param-k">Iluminación Aro</span>
              <strong className="param-v">{telemetry ? `${ledBrightness}% (${telemetry.led_state})` : '--'}</strong>
            </div>
            <div>
              <span className="param-k">Botón Pull-Up</span>
              <strong className="param-v">
                {telemetry ? (telemetry.button_pressed ? 'Pulsado' : 'Listo (50 ms)') : '--'}
              </strong>
            </div>
            <div>
              <span className="param-k">Último Comando</span>
              <strong className="param-v">{lastCommandAction ?? 'Ninguno'}</strong>
            </div>
          </div>
        </section>

        {/* Botones de acción reactivos a la conexión */}
        <div className="parada-actions-stack">
          {connectionState === 'offline' ? (
            <button type="button" className="btn-parada primary" onClick={retryConnection}>
              ↻ Reintentar Conexión MQTT
            </button>
          ) : isAlertActive ? (
            <button
              type="button"
              className="btn-parada danger"
              onClick={() => void cancelStop()}
            >
              Cancelar Solicitud de Parada
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-parada primary"
                disabled={!isHardwareReady}
                onClick={() => void requestStop()}
              >
                Solicitar Parada (Encender Baliza 360°)
              </button>
              {!isHardwareReady && (
                <p className="parada-guard-hint">
                  Conecta el ESP32 a MQTT/HTTP o activa la falsa conexión QA para solicitar parada.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
