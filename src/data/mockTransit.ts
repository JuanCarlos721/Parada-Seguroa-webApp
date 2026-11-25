export type TabId = 'mapa' | 'parada-iot' | 'mi-pase' | 'alertas'

export type OccupancyStatus = 'green' | 'yellow' | 'red'

export interface RouteFilterChip {
  id: string
  label: string
  routeKey: string
}

export interface TransitUnit {
  id: string
  name: string
  etaBadge: string
  routeLabel: string
  driver: string
  seatsFree: number
  capacity: number
  occupancyColor: OccupancyStatus
  occupancyText: string
  routeKey: string
  mapX: number
  mapY: number
}

export const ROUTE_FILTERS: RouteFilterChip[] = [
  { id: 'all', label: 'Todas (3)', routeKey: 'all' },
  { id: 'nido', label: 'Taxi Nido 2000 · 2m', routeKey: 'nido' },
  { id: 'ruta14', label: 'Ruta 14 · 4 min', routeKey: 'ruta14' },
  { id: 'centro', label: 'Postal/TEC → Centro', routeKey: 'centro' },
]

export const TRANSIT_UNITS: TransitUnit[] = [
  {
    id: 'u-24',
    name: 'Camión #U-24',
    etaBadge: '7 min · 930m',
    routeLabel: 'Ruta Nido · Chofer: Roberto S.',
    driver: 'Roberto S.',
    seatsFree: 22,
    capacity: 35,
    occupancyColor: 'green',
    occupancyText: '● Verde: 22 asientos',
    routeKey: 'nido',
    mapX: 84,
    mapY: 57,
  },
  {
    id: 'u-111',
    name: 'Taxi #U-111',
    etaBadge: '4 min · 400m',
    routeLabel: 'Ruta Centro · Chofer: Federico D.',
    driver: 'Federico D.',
    seatsFree: 3,
    capacity: 20,
    occupancyColor: 'yellow',
    occupancyText: '● 3 asientos',
    routeKey: 'centro',
    mapX: 87,
    mapY: 57,
  },
  {
    id: 'u-91',
    name: 'Taxi #U-91',
    etaBadge: '1 min · 100m',
    routeLabel: 'Ruta 14 · Chofer: Guillermo T.',
    driver: 'Guillermo T.',
    seatsFree: 0,
    capacity: 20,
    occupancyColor: 'red',
    occupancyText: '● 0 asientos',
    routeKey: 'ruta14',
    mapX: 59,
    mapY: 51,
  },
]
