import type { CityId } from './cityProfiles'

export type AlertKind =
  | 'wallet'
  | 'bus'
  | 'pin'
  | 'card'
  | 'bulb'
  | 'update'
  | 'shield'
  | 'beacon'

export type AlertBadgeTone = 'green' | 'blue' | 'amber' | 'purple' | 'sky'

export interface AlertItem {
  id: string
  kind: AlertKind
  badgeLabel: string
  badgeTone: AlertBadgeTone
  timestampLabel: string
  title: string
  message: string
  unread: boolean
}

export type TripMethod = 'NFC Validado' | 'QR Dinámico'

export interface TripRecord {
  id: string
  cityId: CityId
  routeTitle: string
  subtitle: string
  amount: number
}

export interface SimulatedRouteOption {
  id: string
  routeTitle: string
  defaultFare: number
}

export const SIMULATED_ROUTES_BY_CITY: Record<CityId, SimulatedRouteOption[]> = {
  tijuana: [
    { id: 'tj-r14', routeTitle: 'Ruta 14 · Parada #14 → Centro', defaultFare: 8 },
    { id: 'tj-nido', routeTitle: 'Taxi Nido 2000 · UABC → Otay', defaultFare: 8 },
    { id: 'tj-c2000', routeTitle: 'Taxi Corredor 2000 · Calz. del Tec.', defaultFare: 15 },
  ],
  guanajuato: [
    { id: 'gto-presa', routeTitle: 'Presa de la Olla · P08 Centro → Presa', defaultFare: 8 },
    { id: 'gto-marfil', routeTitle: 'Ruta Marfil · Zona Centro → Marfil', defaultFare: 8 },
    { id: 'gto-noria', routeTitle: 'Taxi Noria Alta · Centro → Noria Alta', defaultFare: 15 },
  ],
}

export const INITIAL_FIGMA_ALERTS: AlertItem[] = [
  {
    id: 'figma-1',
    kind: 'wallet',
    badgeLabel: 'Saldo',
    badgeTone: 'green',
    timestampLabel: 'Hace 5 min',
    title: 'Abono de $50.00 MXN exitoso',
    message: 'Se abonaron $50.00 a tu cuenta Parada Segura. Saldo de ejemplo de referencia.',
    unread: true,
  },
  {
    id: 'figma-2',
    kind: 'bus',
    badgeLabel: 'Ruta 14',
    badgeTone: 'blue',
    timestampLabel: 'Hace 12 min',
    title: 'Tu unidad #U-24 está por llegar',
    message: 'Llegará en 2 minutos a Parada P14 Calz. del Tec. con 7 asientos disponibles.',
    unread: true,
  },
  {
    id: 'figma-3',
    kind: 'pin',
    badgeLabel: 'Configuración',
    badgeTone: 'amber',
    timestampLabel: 'Hace 1 h',
    title: 'Recordatorio: Permite usar tu ubicación',
    message:
      'Activa el permiso para mostrarte automáticamente tu parada más cercana y tiempos reales.',
    unread: false,
  },
  {
    id: 'figma-4',
    kind: 'card',
    badgeLabel: 'Mi Pase',
    badgeTone: 'purple',
    timestampLabel: 'Hoy, 07:05',
    title: 'Cobro realizado: -$8.00 MXN',
    message: 'Tarifa preferencial Estudiante UABC aplicada con éxito al abordar Ruta 14.',
    unread: false,
  },
  {
    id: 'figma-5',
    kind: 'bulb',
    badgeLabel: 'Seguridad',
    badgeTone: 'amber',
    timestampLabel: 'Ayer, 20:10',
    title: 'Iluminación nocturna activa en tu parada',
    message: 'La parada P14 Calz. del Tec. encendió su luz de cortesía para mayor visibilidad.',
    unread: false,
  },
  {
    id: 'figma-6',
    kind: 'update',
    badgeLabel: 'Novedades',
    badgeTone: 'sky',
    timestampLabel: '14 Nov',
    title: 'Actualización 0.0.5: Información para usuarios',
    message: 'Consulta con mayor precisión los horarios de Taxi Nido 2000 y Ruta 14 en Tijuana.',
    unread: false,
  },
  {
    id: 'figma-7',
    kind: 'shield',
    badgeLabel: 'Cuenta',
    badgeTone: 'green',
    timestampLabel: '10 Nov',
    title: 'Credencial estudiantil UABC verificada',
    message: 'Tu tarifa preferencial de $8.00 MXN quedó renovada para todo el semestre.',
    unread: false,
  },
]

export const INITIAL_SAMPLE_TRIPS: TripRecord[] = [
  {
    id: 'hist-1',
    cityId: 'tijuana',
    routeTitle: 'Ruta 14 · Parada #14 → Centro',
    subtitle: 'Ayer, 20:10 · NFC Validado',
    amount: 8,
  },
  {
    id: 'hist-2',
    cityId: 'tijuana',
    routeTitle: 'Ruta 14 · Centro → UABC FCITEC',
    subtitle: 'Ayer, 07:05 · QR Dinámico',
    amount: 8,
  },
  {
    id: 'hist-3',
    cityId: 'tijuana',
    routeTitle: 'Taxi de Ruta · Corredor 2000',
    subtitle: '09 Nov, 19:45 · NFC Validado',
    amount: 15,
  },
  {
    id: 'hist-4',
    cityId: 'tijuana',
    routeTitle: 'Ruta 14 · UABC → Parada #14',
    subtitle: '08 Nov, 14:20 · NFC Validado',
    amount: 8,
  },
  {
    id: 'hist-5',
    cityId: 'tijuana',
    routeTitle: 'Macroplaza → UABC Otay',
    subtitle: '06 Nov, 13:40 · QR Dinámico',
    amount: 8,
  },
]

export function formatAlertDateTime(date = new Date()): string {
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatTimeOnly(date = new Date()): string {
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
