export const PARADA_HARDWARE_CONFIG = {
  brokerTcpUrl: 'mqtt://broker.emqx.io:1883',
  brokerWssUrl: 'wss://broker.emqx.io:8084/mqtt',
  stateTopic: 'parada_segura_uabc_441/p14/estado',
  commandTopic: 'parada_segura_uabc_441/p14/comandos',
  restEstadoPath: '/api/parada/p14/estado',
  restComandosPath: '/api/parada/p14/comandos',
  restHealthPath: '/api/parada/p14/health',
  defaultStopId: 14,
  heartbeatTimeoutMs: 25_000,
  luxNightThreshold: 500,
} as const

export type HardwareMode = 'real' | 'mock_connected' | 'mock_offline'

export type ConnectionState = 'connecting' | 'waiting_hardware' | 'connected' | 'offline'

export type LedState = 'OFF' | 'COURTESY' | 'ALERT'

export type OccupancyColor = 'GREEN' | 'YELLOW' | 'RED'

export type MockScenarioPreset = 'night' | 'day' | 'out_of_range'

export interface ParadaTelemetry {
  stop_id: number
  lux: number
  night_mode: boolean
  button_pressed: boolean
  led_state: LedState
  seats_free: number
  occupancy_color: OccupancyColor
  device_id: string
  rssi?: number
  led_brightness: number
  source: 'mqtt' | 'rest' | 'mock'
  last_updated_ms: number
}

export interface TelemetryValidationResult {
  valid: boolean
  telemetry: ParadaTelemetry | null
  warning: string | null
}

function normalizeLedState(rawLed: unknown, nightMode: boolean, buttonPressed: boolean): LedState {
  if (typeof rawLed === 'string') {
    const upper = rawLed.trim().toUpperCase()
    if (upper === 'ALERT' || upper === 'ALERT_360' || upper === 'BEACON') return 'ALERT'
    if (upper === 'COURTESY' || upper === 'CORTESIA') return 'COURTESY'
    if (upper === 'OFF' || upper === 'STANDBY' || upper === 'IDLE') return 'OFF'
  }
  if (buttonPressed) return 'ALERT'
  return nightMode ? 'COURTESY' : 'OFF'
}

function normalizeOccupancyColor(rawColor: unknown, seatsFree: number): OccupancyColor {
  if (typeof rawColor === 'string') {
    const upper = rawColor.trim().toUpperCase()
    if (upper === 'GREEN' || upper === 'VERDE') return 'GREEN'
    if (upper === 'YELLOW' || upper === 'AMBER' || upper === 'AMARILLO') return 'YELLOW'
    if (upper === 'RED' || upper === 'ROJO') return 'RED'
  }
  if (seatsFree >= 6) return 'GREEN'
  if (seatsFree >= 1) return 'YELLOW'
  return 'RED'
}

function defaultLedBrightness(ledState: LedState): number {
  if (ledState === 'ALERT') return 100
  if (ledState === 'COURTESY') return 30
  return 0
}

/**
 * Valida y normaliza una trama JSON proveniente del ESP32 (MQTT, REST o simulación).
 * Protege la UI frente a JSON malformado y lecturas fuera de rango.
 */
export function parseAndValidateTelemetry(
  raw: string | unknown,
  source: 'mqtt' | 'rest' | 'mock',
): TelemetryValidationResult {
  let payload: unknown = raw

  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw)
    } catch {
      return {
        valid: false,
        telemetry: null,
        warning: 'JSON malformado recibido; se conservó la última lectura válida.',
      }
    }
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      telemetry: null,
      warning: 'Formato de paquete inválido; se esperaba un objeto JSON de telemetría.',
    }
  }

  const data = payload as Record<string, unknown>
  const rawLux = Number(data.lux)
  const rawSeats = data.seats_free !== undefined ? Number(data.seats_free) : 0

  if (!Number.isFinite(rawLux) || rawLux < 0 || rawLux > 10000) {
    return {
      valid: false,
      telemetry: null,
      warning: `Valor LDR fuera de rango (${String(data.lux)} lux). Rango permitido: 0 a 10000 lux.`,
    }
  }

  if (!Number.isFinite(rawSeats) || rawSeats < 0 || rawSeats > 60) {
    return {
      valid: false,
      telemetry: null,
      warning: `Aforo fuera de rango (${String(data.seats_free)} asientos). Rango permitido: 0 a 60.`,
    }
  }

  const stopId = Number.isFinite(Number(data.stop_id))
    ? Number(data.stop_id)
    : PARADA_HARDWARE_CONFIG.defaultStopId

  const nightMode =
    typeof data.night_mode === 'boolean'
      ? data.night_mode
      : rawLux < PARADA_HARDWARE_CONFIG.luxNightThreshold

  const buttonPressed = Boolean(data.button_pressed)
  const ledState = normalizeLedState(data.led_state, nightMode, buttonPressed)
  const rawBrightness = Number(data.led_brightness)
  const ledBrightness =
    Number.isFinite(rawBrightness) && rawBrightness >= 0 && rawBrightness <= 100
      ? Math.round(rawBrightness)
      : defaultLedBrightness(ledState)

  const rawRssi = Number(data.rssi ?? data.signal_dbm)
  const rssi = Number.isFinite(rawRssi) && rawRssi <= 0 && rawRssi >= -120 ? rawRssi : undefined

  const deviceId =
    typeof data.device_id === 'string' && data.device_id.trim().length > 0
      ? data.device_id.trim()
      : `ESP32-P${stopId}`

  return {
    valid: true,
    telemetry: {
      stop_id: stopId,
      lux: Math.round(rawLux),
      night_mode: nightMode,
      button_pressed: buttonPressed,
      led_state: ledState,
      seats_free: Math.round(rawSeats),
      occupancy_color: normalizeOccupancyColor(data.occupancy_color, rawSeats),
      device_id: deviceId,
      rssi,
      led_brightness: ledBrightness,
      source,
      last_updated_ms: Date.now(),
    },
    warning: null,
  }
}
