import { useEffect, useMemo, useState } from 'react'
import iconSearch from '../assets/icon-search.svg'
import { useParadaApp } from '../context/ParadaAppContext'
import { CITY_PROFILES } from '../data/cityProfiles'
import { useSimulatedUnits, type SimulatedUnit } from '../hooks/useSimulatedUnits'
import { LiveMapCanvas } from './LiveMapCanvas'

export function MapScreen() {
  const {
    cityLocation: { cityId, userCoords, geoStatus, manualOverride, selectCity, requestGps },
  } = useParadaApp()
  const profile = CITY_PROFILES[cityId]
  const simulatedUnits = useSimulatedUnits(profile)

  const [routeInput, setRouteInput] = useState(profile.defaultRouteTitle)
  const [sheetQuery, setSheetQuery] = useState('')
  const [activeChip, setActiveChip] = useState('all')
  const [selectedUnitId, setSelectedUnitId] = useState(profile.units[1]?.id ?? profile.units[0].id)
  const [isSheetExpanded, setIsSheetExpanded] = useState(false)
  const [stopRequested, setStopRequested] = useState(false)
  const [recenterSignal, setRecenterSignal] = useState(0)

  // Sincroniza textos y selección cuando cambia la ciudad activa
  useEffect(() => {
    setRouteInput(profile.defaultRouteTitle)
    setActiveChip('all')
    setSheetQuery('')
    setStopRequested(false)
    setSelectedUnitId(profile.units[1]?.id ?? profile.units[0].id)
  }, [profile])

  const filteredUnits = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase()
    return simulatedUnits.filter((unit) => {
      const matchesChip = activeChip === 'all' || unit.routeKey === activeChip
      const matchesQuery =
        q.length === 0 ||
        unit.name.toLowerCase().includes(q) ||
        unit.routeLabel.toLowerCase().includes(q) ||
        unit.driver.toLowerCase().includes(q)
      return matchesChip && matchesQuery
    })
  }, [activeChip, sheetQuery, simulatedUnits])

  const highlightedUnit: SimulatedUnit =
    simulatedUnits.find((u) => u.id === selectedUnitId) ?? simulatedUnits[0]

  return (
    <main className="map-screen">
      {/* Barra flotante superior en Liquid Glass */}
      <div className="floating-route-bar-wrap">
        <div className="floating-route-bar">
          <div className="route-bar-left">
            <img src={iconSearch} width={16} height={16} alt="" aria-hidden="true" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                type="text"
                className="route-title-input"
                value={routeInput}
                onChange={(e) => setRouteInput(e.target.value)}
                aria-label="Ruta actual"
                placeholder="Buscar ruta o destino..."
              />
              <div className="route-subtitle">{profile.stopSubtitle}</div>
            </div>
          </div>
          <span className="live-badge">Simulado · En vivo</span>
        </div>

        {/* Selector de ciudad (TJ / GTO) + estado GPS en Liquid Glass */}
        <div className="city-controls-row">
          <div className="city-switcher-pill" role="group" aria-label="Seleccionar ciudad">
            <button
              type="button"
              className={`city-pill-btn ${cityId === 'tijuana' ? 'active' : ''}`}
              onClick={() => selectCity('tijuana')}
            >
              Tijuana
            </button>
            <button
              type="button"
              className={`city-pill-btn ${cityId === 'guanajuato' ? 'active' : ''}`}
              onClick={() => selectCity('guanajuato')}
            >
              Guanajuato
            </button>
            <button
              type="button"
              className={`city-pill-btn ${!manualOverride && geoStatus === 'active' ? 'active-gps' : ''}`}
              onClick={() => {
                requestGps()
                setRecenterSignal((n) => n + 1)
              }}
              title="Detectar mi ciudad por GPS"
            >
              {geoStatus === 'active' ? '📍 GPS' : geoStatus === 'detecting' ? 'GPS…' : '📍 Auto'}
            </button>
          </div>

          <button
            type="button"
            className="recenter-glass-btn"
            onClick={() => setRecenterSignal((n) => n + 1)}
            aria-label="Centrar mapa en parada"
            title="Centrar mapa"
          >
            ⌖
          </button>
        </div>
      </div>

      {/* Mapa real interactivo multi-ciudad con Leaflet */}
      <div className="map-viewport">
        <LiveMapCanvas
          profile={profile}
          units={filteredUnits}
          selectedUnitId={highlightedUnit.id}
          userCoords={userCoords}
          recenterSignal={recenterSignal}
          onSelectUnit={setSelectedUnitId}
        />
      </div>

      {/* Half Sheet en Liquid Glass */}
      <section
        className={`half-sheet ${isSheetExpanded ? 'expanded' : ''}`}
        aria-label="Panel de unidades próximas"
      >
        <button
          type="button"
          className="sheet-handle-btn"
          onClick={() => setIsSheetExpanded((prev) => !prev)}
          aria-label={isSheetExpanded ? 'Contraer panel' : 'Expandir panel'}
        >
          <span className="sheet-handle-bar" />
        </button>

        {/* Campo de texto interactivo dentro del Half Sheet */}
        <div className="sheet-search-field">
          <img src={iconSearch} width={14} height={14} alt="" aria-hidden="true" />
          <input
            type="text"
            className="sheet-search-input"
            value={sheetQuery}
            onChange={(e) => setSheetQuery(e.target.value)}
            placeholder="Filtrar unidad, ruta o chofer..."
            aria-label="Filtrar unidades en el panel"
          />
          {sheetQuery && (
            <button
              type="button"
              className="clear-input-btn"
              onClick={() => setSheetQuery('')}
              aria-label="Limpiar filtro"
            >
              ×
            </button>
          )}
        </div>

        {/* Carrusel de botones de rutas */}
        <div className="routes-carousel" role="group" aria-label="Filtro de rutas">
          {profile.filters.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`route-chip ${activeChip === chip.routeKey ? 'active' : ''}`}
              onClick={() => setActiveChip(chip.routeKey)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="section-uppercase-label">
          <span>Unidades próximas · {profile.shortCode}</span>
          <span style={{ color: '#007aff' }}>
            {filteredUnits.length} {filteredUnits.length === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>

        {/* Carrusel horizontal de tarjetas de unidades */}
        <div className="units-carousel" role="list">
          {filteredUnits.length > 0 ? (
            filteredUnits.map((unit) => {
              const isSelected = unit.id === highlightedUnit.id
              return (
                <button
                  key={unit.id}
                  type="button"
                  role="listitem"
                  className={`unit-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedUnitId(unit.id)}
                >
                  <div className="unit-card-top">
                    <span className="unit-name">{unit.name}</span>
                    <span className="unit-eta-pill">{unit.etaBadge}</span>
                  </div>
                  <div className="unit-driver">{unit.routeLabel}</div>
                  <div className="unit-card-bottom">
                    <span className={`unit-occupancy ${unit.occupancyColor}`}>
                      {unit.occupancyText}
                    </span>
                    <span className="unit-ratio">
                      {unit.capacity - unit.seatsFree}/{unit.capacity}
                    </span>
                  </div>
                </button>
              )
            })
          ) : (
            <div style={{ fontSize: 12, color: '#64748b', padding: '12px 4px' }}>
              Sin unidades que coincidan con "{sheetQuery}".
            </div>
          )}
        </div>

        {/* Semáforo de aforo en vivo */}
        <div className="semaforo-banner">
          <div>
            <div className="semaforo-title">SEMÁFORO EN VIVO</div>
            <div className="semaforo-sub">
              {highlightedUnit.name} ·{' '}
              {highlightedUnit.seatsFree > 0
                ? `${highlightedUnit.seatsFree} asientos disponibles`
                : 'Unidad llena'}
            </div>
          </div>
          <div className="semaforo-lights-pill" aria-hidden="true">
            <span
              className={`semaforo-dot ${
                highlightedUnit.occupancyColor === 'green' ? 'green-active' : ''
              }`}
            />
            <span
              className={`semaforo-dot ${
                highlightedUnit.occupancyColor === 'yellow' ? 'yellow-active' : ''
              }`}
            />
            <span
              className={`semaforo-dot ${
                highlightedUnit.occupancyColor === 'red' ? 'red-active' : ''
              }`}
            />
          </div>
        </div>

        {/* Botón de acción en el Half Sheet */}
        <button
          type="button"
          className={`sheet-action-btn ${stopRequested ? 'requested' : ''}`}
          onClick={() => setStopRequested((prev) => !prev)}
        >
          {stopRequested
            ? `✓ Parada solicitada en ${profile.stopName} (Tocar para cancelar)`
            : `Solicitar parada en ${profile.stopName}`}
        </button>
      </section>
    </main>
  )
}
