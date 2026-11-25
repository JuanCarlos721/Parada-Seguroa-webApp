import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CITY_PROFILES, type CityId } from '../data/cityProfiles'
import {
  formatAlertDateTime,
  formatTimeOnly,
  INITIAL_FIGMA_ALERTS,
  INITIAL_SAMPLE_TRIPS,
  type AlertItem,
  type TripMethod,
  type TripRecord,
} from '../data/passAndAlerts'
import { useCityLocation, type UseCityLocationResult } from '../hooks/useCityLocation'
import { useParadaHardware, type UseParadaHardwareResult } from '../hooks/useParadaHardware'

export interface SimulateTripInput {
  cityId: CityId
  routeTitle: string
  fare: number
  method: TripMethod
}

export interface WalletActionResult {
  ok: boolean
  error?: string
}

interface ParadaAppContextValue {
  cityLocation: UseCityLocationResult
  hardware: UseParadaHardwareResult
  balance: number
  trips: TripRecord[]
  alerts: AlertItem[]
  rechargeBalance: (amount: number) => WalletActionResult
  simulateTrip: (input: SimulateTripInput) => WalletActionResult
  markAllAlertsRead: () => void
}

const ParadaAppContext = createContext<ParadaAppContextValue | null>(null)

export function ParadaAppProvider({ children }: { children: ReactNode }) {
  const cityLocation = useCityLocation('tijuana')
  const rawHardware = useParadaHardware()

  const [balance, setBalance] = useState<number>(0)
  const [trips, setTrips] = useState<TripRecord[]>(INITIAL_SAMPLE_TRIPS)
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_FIGMA_ALERTS)

  const prependAlert = useCallback((alert: Omit<AlertItem, 'id' | 'unread'>) => {
    setAlerts((prev) => [
      {
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        unread: true,
      },
      ...prev,
    ])
  }, [])

  // Envuelve requestStop para generar alerta cada vez que se solicita parada en el módulo Parada
  const wrappedRequestStop = useCallback(async () => {
    await rawHardware.requestStop()
    const stopId = rawHardware.telemetry?.stop_id ?? 14
    const deviceId = rawHardware.telemetry?.device_id ?? 'ESP32-P14'
    const isSimulated = rawHardware.mode === 'mock_connected'
    const now = new Date()

    prependAlert({
      kind: 'beacon',
      badgeLabel: isSimulated ? 'Parada · Simulada' : 'Parada · ESP32',
      badgeTone: 'green',
      timestampLabel: `Hoy, ${formatTimeOnly(now)}`,
      title: `Parada solicitada en P${stopId} (Baliza 360°)`,
      message: `${formatAlertDateTime(now)} · Aro LED encendido al 100% en ${deviceId} (${isSimulated ? 'conexión simulada' : 'hardware conectado'}).`,
    })
  }, [prependAlert, rawHardware])

  const hardware = useMemo<UseParadaHardwareResult>(
    () => ({
      ...rawHardware,
      requestStop: wrappedRequestStop,
    }),
    [rawHardware, wrappedRequestStop],
  )

  const rechargeBalance = useCallback(
    (amount: number): WalletActionResult => {
      const normalized = Math.round(amount * 100) / 100
      if (!Number.isFinite(normalized) || normalized <= 0 || normalized > 5000) {
        return {
          ok: false,
          error: 'Ingresa un monto válido entre $1.00 y $5,000.00 MXN.',
        }
      }

      const prevBalance = balance
      const nextBalance = Math.round((prevBalance + normalized) * 100) / 100
      const now = new Date()
      setBalance(nextBalance)

      prependAlert({
        kind: 'wallet',
        badgeLabel: 'Abono Mi Pase',
        badgeTone: 'green',
        timestampLabel: `Hoy, ${formatTimeOnly(now)}`,
        title: `Abono de $${normalized.toFixed(2)} MXN exitoso`,
        message: `${formatAlertDateTime(now)} · Monto: +$${normalized.toFixed(2)} · Saldo previo: $${prevBalance.toFixed(2)} MXN · Saldo posterior: $${nextBalance.toFixed(2)} MXN.`,
      })

      return { ok: true }
    },
    [balance, prependAlert],
  )

  const simulateTrip = useCallback(
    ({ cityId, routeTitle, fare, method }: SimulateTripInput): WalletActionResult => {
      if (balance < fare) {
        return {
          ok: false,
          error: `Saldo insuficiente ($${balance.toFixed(2)} MXN). Recarga al menos $${fare.toFixed(2)} MXN.`,
        }
      }

      const prevBalance = balance
      const nextBalance = Math.round((prevBalance - fare) * 100) / 100
      const now = new Date()
      const timeLabel = formatTimeOnly(now)
      const cityShort = CITY_PROFILES[cityId].shortCode

      setBalance(nextBalance)
      setTrips((prev) => [
        {
          id: `trip-${Date.now()}`,
          cityId,
          routeTitle,
          subtitle: `Hoy, ${timeLabel} · ${method} · ${cityShort}`,
          amount: fare,
        },
        ...prev,
      ])

      prependAlert({
        kind: 'card',
        badgeLabel: `Viaje ${cityShort}`,
        badgeTone: 'purple',
        timestampLabel: `Hoy, ${timeLabel}`,
        title: `Viaje cobrado: -$${fare.toFixed(2)} MXN`,
        message: `${formatAlertDateTime(now)} · ${routeTitle} (${method}). Saldo previo: $${prevBalance.toFixed(2)} → Saldo actual: $${nextBalance.toFixed(2)} MXN.`,
      })

      return { ok: true }
    },
    [balance, prependAlert],
  )

  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((item) => ({ ...item, unread: false })))
  }, [])

  const value = useMemo<ParadaAppContextValue>(
    () => ({
      cityLocation,
      hardware,
      balance,
      trips,
      alerts,
      rechargeBalance,
      simulateTrip,
      markAllAlertsRead,
    }),
    [alerts, balance, cityLocation, hardware, markAllAlertsRead, rechargeBalance, simulateTrip, trips],
  )

  return <ParadaAppContext.Provider value={value}>{children}</ParadaAppContext.Provider>
}

export function useParadaApp(): ParadaAppContextValue {
  const ctx = useContext(ParadaAppContext)
  if (!ctx) {
    throw new Error('useParadaApp debe usarse dentro de ParadaAppProvider')
  }
  return ctx
}
