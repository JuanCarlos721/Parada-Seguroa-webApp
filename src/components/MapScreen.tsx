import { useMemo, useState } from 'react'
import uabcMapImg from '../assets/uabc-map.png'
import iconSearch from '../assets/icon-search.svg'
import { ROUTE_FILTERS, TRANSIT_UNITS, type TransitUnit } from '../data/mockTransit'

export function MapScreen() {
  const [routeInput, setRouteInput] = useState('Ruta: Postal/TEC/UABC → Centro')
  const [sheetQuery, setSheetQuery] = useState('')
  const [activeChip, setActiveChip] = useState('all')
  const [selectedUnitId, setSelectedUnitId] = useState('u-111')
  const [isSheetExpanded, setIsSheetExpanded] = useState(false)
  const [stopRequested, setStopRequested] = useState(false)

  const filteredUnits = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase()
    return TRANSIT_UNITS.filter((unit) => {
      const matchesChip = activeChip === 'all' || unit.routeKey === activeChip
      const matchesQuery =
        q.length === 0 ||
        unit.name.toLowerCase().includes(q) ||
        unit.routeLabel.toLowerCase().includes(q) ||
        unit.driver.toLowerCase().includes(q)
      return matchesChip && matchesQuery
    })
  }, [activeChip, sheetQuery])

  const highlightedUnit: TransitUnit =
    TRANSIT_UNITS.find((u) => u.id === selectedUnitId) ?? TRANSIT_UNITS[1]

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
              <div className="route-subtitle">Calz. del Tecnológico · Parada P14</div>
            </div>
          </div>
          <span className="live-badge">En vivo</span>
        </div>
      </div>

      {/* Mapa real UABC / Calz. del Tecnológico con trazado de ruta y pines */}
      <div className="map-viewport">
        <div className="map-scene">
          <img src={uabcMapImg} className="map-base-img" alt="Mapa de rutas UABC Tijuana" />

          <svg
            className="map-route-svg"
            viewBox="0 0 1000 562.5"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M365 322 L540 309 L652 329 L756 341 L860 300"
              stroke="#007AFF"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Pin Parada P14 */}
          <div className="map-stop-pin" style={{ left: '57.2%', top: '56.2%' }}>
            <div className="stop-pill">P14 Calz. del Tec.</div>
            <div className="stop-dot" />
          </div>

          {/* Marcador Taxi #U-91 */}
          <button
            type="button"
            className="map-unit-marker"
            style={{ left: '62.5%', top: '57.6%' }}
            onClick={() => setSelectedUnitId('u-91')}
            aria-label="Seleccionar Taxi U-91"
          >
            <span className="unit-map-dot red" />
            <span className="unit-callout red">
              <span className="callout-dot red" />
              <span>Taxi #U-91 · 1 min</span>
            </span>
          </button>

          {/* Marcador punto naranja derecho */}
          <button
            type="button"
            className="map-unit-marker"
            style={{ left: '75.5%', top: '60.5%' }}
            onClick={() => setSelectedUnitId('u-111')}
            aria-label="Seleccionar Taxi U-111"
          >
            <span className="unit-map-dot yellow" />
          </button>
        </div>
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
          {ROUTE_FILTERS.map((chip) => (
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
          <span>Unidades próximas</span>
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
            ? '✓ Parada solicitada en P14 (Tocar para cancelar)'
            : 'Solicitar parada en P14 Calz. del Tec.'}
        </button>
      </section>
    </main>
  )
}
