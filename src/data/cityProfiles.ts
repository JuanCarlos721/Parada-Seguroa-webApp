export type CityId = 'tijuana' | 'guanajuato'

export type OccupancyStatus = 'green' | 'yellow' | 'red'

export interface RouteFilterChip {
  id: string
  label: string
  routeKey: string
}

export interface TransitUnitTemplate {
  id: string
  name: string
  routeLabel: string
  driver: string
  seatsFree: number
  capacity: number
  occupancyColor: OccupancyStatus
  occupancyText: string
  routeKey: string
  initialProgress: number
  speedPerTick: number
}

export interface CityProfile {
  id: CityId
  name: string
  shortCode: string
  center: [number, number]
  zoom: number
  stopName: string
  stopSubtitle: string
  stopCoords: [number, number]
  defaultRouteTitle: string
  routePolyline: [number, number][]
  filters: RouteFilterChip[]
  units: TransitUnitTemplate[]
}

export const CITY_PROFILES: Record<CityId, CityProfile> = {
  tijuana: {
    id: 'tijuana',
    name: 'Tijuana, B.C.',
    shortCode: 'TJ',
    center: [32.5313, -116.9642],
    zoom: 16,
    stopName: 'P14 Calz. del Tec.',
    stopSubtitle: 'Calz. del Tecnológico · Parada P14',
    stopCoords: [32.5305, -116.9642],
    defaultRouteTitle: 'Ruta: Postal/TEC/UABC → Centro',
    routePolyline: [
      [32.5304, -116.9785],
      [32.5311, -116.9735],
      [32.5313, -116.9688],
      [32.5305, -116.9642],
      [32.5301, -116.9605],
      [32.5314, -116.9565],
      [32.5342, -116.9522],
    ],
    filters: [
      { id: 'all', label: 'Todas (3)', routeKey: 'all' },
      { id: 'nido', label: 'Taxi Nido 2000 · 2m', routeKey: 'nido' },
      { id: 'ruta14', label: 'Ruta 14 · 4 min', routeKey: 'ruta14' },
      { id: 'centro', label: 'Postal/TEC → Centro', routeKey: 'centro' },
    ],
    units: [
      {
        id: 'u-24',
        name: 'Camión #U-24',
        routeLabel: 'Ruta Nido · Chofer: Roberto S.',
        driver: 'Roberto S.',
        seatsFree: 22,
        capacity: 35,
        occupancyColor: 'green',
        occupancyText: '● Verde: 22 asientos',
        routeKey: 'nido',
        initialProgress: 0.14,
        speedPerTick: 0.016,
      },
      {
        id: 'u-111',
        name: 'Taxi #U-111',
        routeLabel: 'Ruta Centro · Chofer: Federico D.',
        driver: 'Federico D.',
        seatsFree: 3,
        capacity: 20,
        occupancyColor: 'yellow',
        occupancyText: '● 3 asientos',
        routeKey: 'centro',
        initialProgress: 0.34,
        speedPerTick: 0.02,
      },
      {
        id: 'u-91',
        name: 'Taxi #U-91',
        routeLabel: 'Ruta 14 · Chofer: Guillermo T.',
        driver: 'Guillermo T.',
        seatsFree: 0,
        capacity: 20,
        occupancyColor: 'red',
        occupancyText: '● 0 asientos',
        routeKey: 'ruta14',
        initialProgress: 0.56,
        speedPerTick: 0.024,
      },
    ],
  },
  guanajuato: {
    id: 'guanajuato',
    name: 'Guanajuato, Gto.',
    shortCode: 'GTO',
    center: [21.0164, -101.2546],
    zoom: 15,
    stopName: 'P08 Centro · Teatro Juárez',
    stopSubtitle: 'Zona Centro · Parada P08',
    stopCoords: [21.0169, -101.2535],
    defaultRouteTitle: 'Ruta: Pozuelos → Centro → Presa',
    routePolyline: [
      [21.0128, -101.2698],
      [21.0156, -101.2644],
      [21.0168, -101.2610],
      [21.0176, -101.2570],
      [21.0169, -101.2535],
      [21.0143, -101.2496],
      [21.0126, -101.2465],
      [21.0088, -101.2412],
    ],
    filters: [
      { id: 'all', label: 'Todas (3)', routeKey: 'all' },
      { id: 'presa', label: 'Presa de la Olla · 3m', routeKey: 'presa' },
      { id: 'marfil', label: 'Ruta Marfil · 5 min', routeKey: 'marfil' },
      { id: 'noria', label: 'Noria Alta → Centro', routeKey: 'noria' },
    ],
    units: [
      {
        id: 'g-12',
        name: 'Camión #G-12',
        routeLabel: 'Ruta Presa · Chofer: Miguel R.',
        driver: 'Miguel R.',
        seatsFree: 16,
        capacity: 30,
        occupancyColor: 'green',
        occupancyText: '● Verde: 16 asientos',
        routeKey: 'presa',
        initialProgress: 0.22,
        speedPerTick: 0.017,
      },
      {
        id: 'g-04',
        name: 'Ruta #G-04',
        routeLabel: 'Ruta Marfil · Chofer: Elena M.',
        driver: 'Elena M.',
        seatsFree: 4,
        capacity: 22,
        occupancyColor: 'yellow',
        occupancyText: '● 4 asientos',
        routeKey: 'marfil',
        initialProgress: 0.45,
        speedPerTick: 0.021,
      },
      {
        id: 'g-19',
        name: 'Taxi #G-19',
        routeLabel: 'Noria Alta · Chofer: Carlos V.',
        driver: 'Carlos V.',
        seatsFree: 0,
        capacity: 15,
        occupancyColor: 'red',
        occupancyText: '● 0 asientos',
        routeKey: 'noria',
        initialProgress: 0.64,
        speedPerTick: 0.025,
      },
    ],
  },
}

const EARTH_RADIUS_M = 6371000

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function detectClosestCity(coords: [number, number]): CityId {
  const distTj = haversineMeters(coords, CITY_PROFILES.tijuana.center)
  const distGto = haversineMeters(coords, CITY_PROFILES.guanajuato.center)
  return distGto < distTj ? 'guanajuato' : 'tijuana'
}
