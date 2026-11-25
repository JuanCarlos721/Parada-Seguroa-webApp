import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { CityProfile } from '../data/cityProfiles'
import type { SimulatedUnit } from '../hooks/useSimulatedUnits'

interface LiveMapCanvasProps {
  profile: CityProfile
  units: SimulatedUnit[]
  selectedUnitId: string
  userCoords: [number, number] | null
  recenterSignal: number
  onSelectUnit: (unitId: string) => void
}

function getOffsetCenter(profile: CityProfile): [number, number] {
  const latOffset = profile.id === 'tijuana' ? -0.0015 : -0.0028
  return [profile.center[0] + latOffset, profile.center[1]]
}

function buildUnitIcon(unit: SimulatedUnit, isSelected: boolean): L.DivIcon {
  const showCallout = isSelected || unit.id === 'u-91' || unit.id === 'g-19'
  const calloutHtml = showCallout
    ? `<span class="unit-callout ${unit.occupancyColor} ${isSelected ? 'is-selected' : ''}">
         <span class="callout-dot ${unit.occupancyColor}"></span>
         <span>${unit.name} · ${unit.etaMinutes} min</span>
       </span>`
    : ''

  return L.divIcon({
    className: 'leaflet-custom-icon',
    html: `<div class="leaflet-unit-wrap">
             <span class="unit-map-dot ${unit.occupancyColor} ${isSelected ? 'pulse-ring' : ''}"></span>
             ${calloutHtml}
           </div>`,
    iconSize: [0, 0],
    iconAnchor: [7, 7],
  })
}

export function LiveMapCanvas({
  profile,
  units,
  selectedUnitId,
  userCoords,
  recenterSignal,
  onSelectUnit,
}: LiveMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const stopMarkerRef = useRef<L.Marker | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const unitMarkersRef = useRef<Record<string, L.Marker>>({})
  const onSelectRef = useRef(onSelectUnit)

  onSelectRef.current = onSelectUnit

  // Inicializa instancia única de Leaflet
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: getOffsetCenter(profile),
      zoom: profile.zoom,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    map.attributionControl.setPrefix(false)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      routeLayerRef.current = null
      stopMarkerRef.current = null
      userMarkerRef.current = null
      unitMarkersRef.current = {}
    }
  }, [])

  // Actualiza ruta, parada y vuela suavemente al cambiar de ciudad o centrar
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.flyTo(getOffsetCenter(profile), profile.zoom, {
      duration: 0.75,
    })

    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
    }
    routeLayerRef.current = L.polyline(profile.routePolyline, {
      color: '#007AFF',
      weight: 5,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map)

    if (stopMarkerRef.current) {
      stopMarkerRef.current.remove()
    }
    const stopIcon = L.divIcon({
      className: 'leaflet-custom-icon',
      html: `<div class="leaflet-stop-pin">
               <div class="stop-pill">${profile.stopName}</div>
               <div class="stop-dot"></div>
             </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })
    stopMarkerRef.current = L.marker(profile.stopCoords, {
      icon: stopIcon,
      interactive: false,
      zIndexOffset: 200,
    }).addTo(map)

    // Limpia marcadores anteriores al cambiar de ciudad
    for (const marker of Object.values(unitMarkersRef.current)) {
      marker.remove()
    }
    unitMarkersRef.current = {}
  }, [profile, recenterSignal])

  // Marcador de ubicación GPS real del usuario (si otorgó permiso)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      return
    }

    const userIcon = L.divIcon({
      className: 'leaflet-custom-icon',
      html: `<div class="user-gps-marker" title="Tu ubicación GPS">
               <span class="user-gps-halo"></span>
               <span class="user-gps-dot"></span>
             </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userCoords)
    } else {
      userMarkerRef.current = L.marker(userCoords, {
        icon: userIcon,
        zIndexOffset: 300,
      }).addTo(map)
    }
  }, [userCoords])

  // Sincroniza posiciones simuladas en tiempo real sin destruir marcadores
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const activeIds = new Set(units.map((u) => u.id))
    for (const [id, marker] of Object.entries(unitMarkersRef.current)) {
      if (!activeIds.has(id)) {
        marker.remove()
        delete unitMarkersRef.current[id]
      }
    }

    for (const unit of units) {
      const isSelected = unit.id === selectedUnitId
      const icon = buildUnitIcon(unit, isSelected)
      const existing = unitMarkersRef.current[unit.id]

      if (existing) {
        existing.setLatLng(unit.coords)
        existing.setIcon(icon)
        existing.setZIndexOffset(isSelected ? 450 : 250)
      } else {
        const marker = L.marker(unit.coords, {
          icon,
          zIndexOffset: isSelected ? 450 : 250,
        }).addTo(map)
        marker.on('click', () => onSelectRef.current(unit.id))
        unitMarkersRef.current[unit.id] = marker
      }
    }
  }, [units, selectedUnitId])

  return (
    <div
      ref={containerRef}
      className="live-leaflet-map"
      aria-label={`Mapa interactivo en tiempo real de ${profile.name}`}
    />
  )
}
