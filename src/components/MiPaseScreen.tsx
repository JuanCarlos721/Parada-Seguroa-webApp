import { useEffect, useState } from 'react'
import { useParadaApp } from '../context/ParadaAppContext'
import { CITY_PROFILES } from '../data/cityProfiles'
import { SIMULATED_ROUTES_BY_CITY } from '../data/passAndAlerts'

const RECHARGE_PRESETS = [20, 50, 100, 200]

function GenericQrMatrix({ active, seed }: { active: boolean; seed: number }) {
  // Matriz QR genérica con patrón determinista que cambia al regenerarse cada clic
  const extraBlock = seed % 3
  return (
    <svg
      width="102"
      height="102"
      viewBox="0 0 29 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={active ? 'qr-svg active' : 'qr-svg idle'}
      aria-hidden="true"
    >
      <rect width="29" height="29" rx="2" fill="#FFFFFF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 2H9V9H2V2ZM3 3V8H8V3H3ZM4.5 4.5H6.5V6.5H4.5V4.5Z"
        fill={active ? '#0F172A' : '#94A3B8'}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 2H27V9H20V2ZM21 3V8H26V3H21ZM22.5 4.5H24.5V6.5H22.5V4.5Z"
        fill={active ? '#0F172A' : '#94A3B8'}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 20H9V27H2V20ZM3 21V26H8V21H3ZM4.5 22.5H6.5V24.5H4.5V22.5Z"
        fill={active ? '#0F172A' : '#94A3B8'}
      />
      {active && (
        <>
          <path
            d="M11 2H13V4H11V2ZM15 2H18V3H15V2ZM11 6H14V8H11V6ZM16 5H18V9H16V5ZM11 10H15V12H11V10ZM17 11H21V13H17V11ZM23 11H27V14H23V11ZM2 11H5V13H2V11ZM7 11H9V15H7V11ZM3 15H6V18H3V15ZM10 14H13V17H10V14ZM15 14H19V18H15V14ZM21 15H24V17H21V15ZM25 16H27V20H25V16ZM11 19H14V22H11V19ZM16 20H18V24H16V20ZM20 20H23V22H20V20ZM11 24H15V27H11V24ZM19 24H22V27H19V24ZM24 23H27V27H24V23Z"
            fill="#0F172A"
          />
          {extraBlock === 1 && <rect x="13" y="12" width="3" height="3" fill="#007AFF" />}
          {extraBlock === 2 && <rect x="19" y="17" width="3" height="3" fill="#059669" />}
        </>
      )}
    </svg>
  )
}

export function MiPaseScreen() {
  const {
    cityLocation: { cityId },
    balance,
    trips,
    rechargeBalance,
    simulateTrip,
  } = useParadaApp()

  const cityRoutes = SIMULATED_ROUTES_BY_CITY[cityId]
  const cityProfile = CITY_PROFILES[cityId]

  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [customAmount, setCustomAmount] = useState('50')
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0)
  const [qrSeed, setQrSeed] = useState(0)
  const [nfcEnabled, setNfcEnabled] = useState(true)
  const [selectedRouteId, setSelectedRouteId] = useState(cityRoutes[0].id)
  const [selectedFare, setSelectedFare] = useState<number>(8)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Mantiene seleccionada una ruta válida cuando el usuario cambia de ciudad en Mapa
  useEffect(() => {
    const firstRoute = SIMULATED_ROUTES_BY_CITY[cityId][0]
    setSelectedRouteId(firstRoute.id)
    setSelectedFare(firstRoute.defaultFare)
  }, [cityId])

  // Temporizador decreciente de 60 segundos para el QR dinámico
  useEffect(() => {
    if (qrSecondsLeft <= 0) return
    const timer = window.setInterval(() => {
      setQrSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [qrSecondsLeft])

  const handleGenerateQr = () => {
    setQrSeed((n) => n + 1)
    setQrSecondsLeft(60)
    setFeedback(null)
  }

  const handleConfirmRecharge = (amount: number) => {
    const result = rechargeBalance(amount)
    if (!result.ok) {
      setFeedback({ type: 'err', text: result.error ?? 'Error al recargar.' })
      return
    }
    setFeedback({ type: 'ok', text: `Abono de +$${amount.toFixed(2)} MXN aplicado.` })
    setRechargeOpen(false)
  }

  const handleSimulateTrip = () => {
    if (!nfcEnabled && qrSecondsLeft <= 0) {
      setFeedback({
        type: 'err',
        text: 'Enciende el NFC o haz clic en el QR para generar un código (60 s) antes de abordar.',
      })
      return
    }

    const activeRoute =
      cityRoutes.find((route) => route.id === selectedRouteId) ?? cityRoutes[0]
    const method = nfcEnabled ? 'NFC Validado' : 'QR Dinámico'

    const result = simulateTrip({
      cityId,
      routeTitle: activeRoute.routeTitle,
      fare: selectedFare,
      method,
    })

    if (!result.ok) {
      setFeedback({ type: 'err', text: result.error ?? 'No se pudo cobrar el viaje.' })
      return
    }

    setFeedback({
      type: 'ok',
      text: `Viaje simulado en ${cityProfile.shortCode}: -$${selectedFare.toFixed(2)} MXN (${method}).`,
    })
  }

  const formattedSeconds = String(qrSecondsLeft).padStart(2, '0')

  return (
    <main className="parada-screen">
      {/* Encabezado flotante Liquid Glass (z-index > TopGreenBlur) */}
      <header className="parada-header">
        <div className="pase-header-left">
          <h1 className="pase-nav-title">Mi Pase y Viajes</h1>
        </div>

        <div className="pase-header-right">
          <span
            className={`pase-balance-text ${balance > 0 ? 'positive' : 'zero'}`}
            aria-label="Saldo actual"
          >
            ${balance.toFixed(2)}
          </span>
          <button
            type="button"
            className="pase-recharge-pill"
            onClick={() => {
              setRechargeOpen((prev) => !prev)
              setFeedback(null)
            }}
            aria-expanded={rechargeOpen}
          >
            + Recargar
          </button>
        </div>
      </header>

      {/* Panel compacto de recarga simulada */}
      {rechargeOpen && (
        <section className="qa-popover" aria-label="Recargar saldo Mi Pase">
          <div className="qa-popover-head">
            <span className="qa-popover-title">Simular abono de saldo (MXN)</span>
            <button
              type="button"
              className="qa-close-btn"
              onClick={() => setRechargeOpen(false)}
              aria-label="Cerrar panel de recarga"
            >
              ✕
            </button>
          </div>

          <div className="recharge-presets-grid">
            {RECHARGE_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="recharge-preset-btn"
                onClick={() => handleConfirmRecharge(amount)}
              >
                +${amount}
              </button>
            ))}
          </div>

          <div className="recharge-custom-row">
            <input
              type="number"
              min="1"
              max="5000"
              step="1"
              className="recharge-custom-input"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              aria-label="Monto personalizado en MXN"
              placeholder="Otro monto"
            />
            <button
              type="button"
              className="recharge-apply-btn"
              onClick={() => handleConfirmRecharge(Number(customAmount))}
            >
              Abonar
            </button>
          </div>
        </section>
      )}

      <div className="parada-scroll-body">
        {/* Tarjeta principal de estudiante (Figma 06_Pase_Digital_QR_NFC) */}
        <section className="wallet-card" aria-label="Credencial y toque dinámico">
          <div className="wallet-card-head">
            <div>
              <div className="wallet-kicker">TARIFA PREFERENCIAL ESTUDIANTE</div>
              <div className="wallet-student-name">Marcel Díaz · UABC</div>
            </div>
            <span className="wallet-fare-badge">$8.00 MXN</span>
          </div>

          <div className="qr-box">
            <button
              type="button"
              className="qr-trigger-btn"
              onClick={handleGenerateQr}
              aria-label="Generar o renovar código QR por 60 segundos"
            >
              <GenericQrMatrix active={qrSecondsLeft > 0} seed={qrSeed} />
              <div className="qr-timer-text">
                {qrSecondsLeft > 0 ? (
                  <>
                    Token Dinámico · Expira en{' '}
                    <span className="qr-timer-accent">00:{formattedSeconds}s</span>
                  </>
                ) : qrSeed > 0 ? (
                  'QR expirado · Toca para regenerar (60 s)'
                ) : (
                  'QR genérico inactivo · Toca para generar (60 s)'
                )}
              </div>
            </button>

            <div className="nfc-toggle-row">
              <div className="nfc-status-pill-wrap">
                <span className={`nfc-indicator-dot ${nfcEnabled ? 'on' : 'off'}`} />
                <span className={`nfc-status-text ${nfcEnabled ? 'on' : 'off'}`}>
                  {nfcEnabled ? 'NFC Encendido · Acerca al lector' : 'NFC Apagado'}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={nfcEnabled}
                aria-label="Activar o desactivar NFC"
                className={`ios-switch ${nfcEnabled ? 'on' : ''}`}
                onClick={() => {
                  setNfcEnabled((prev) => !prev)
                  setFeedback(null)
                }}
              >
                <span className="ios-switch-thumb" />
              </button>
            </div>
          </div>
        </section>

        {/* Aviso de operación o validación */}
        {feedback && (
          <div
            className={`pase-feedback-banner ${feedback.type === 'err' ? 'err' : 'ok'}`}
            role="status"
          >
            <span>{feedback.text}</span>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Cerrar mensaje">
              ✕
            </button>
          </div>
        )}

        {/* Simulador de viaje según ciudad activa (Tijuana o Guanajuato) */}
        <section className="parada-info-card" aria-label="Simulador de viaje">
          <div className="info-card-row">
            <span className="sensor-card-label">
              SIMULAR VIAJE · {cityProfile.name.toUpperCase()}
            </span>
            <span className="parada-badge green">{cityProfile.shortCode}</span>
          </div>

          <div className="trip-route-pills" role="group" aria-label="Ruta del viaje simulado">
            {cityRoutes.map((route) => {
              const isSelected = route.id === selectedRouteId
              return (
                <button
                  key={route.id}
                  type="button"
                  className={`trip-route-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedRouteId(route.id)
                    setSelectedFare(route.defaultFare)
                  }}
                >
                  {route.routeTitle.split('·')[0].trim()}
                </button>
              )
            })}
          </div>

          <div className="trip-sim-footer">
            <div className="fare-pill-group" role="group" aria-label="Tarifa">
              <button
                type="button"
                className={`fare-chip ${selectedFare === 8 ? 'active' : ''}`}
                onClick={() => setSelectedFare(8)}
              >
                $8 Est.
              </button>
              <button
                type="button"
                className={`fare-chip ${selectedFare === 15 ? 'active' : ''}`}
                onClick={() => setSelectedFare(15)}
              >
                $15 Gral.
              </button>
            </div>

            <button type="button" className="btn-simulate-trip" onClick={handleSimulateTrip}>
              Simular viaje (-${selectedFare.toFixed(2)})
            </button>
          </div>
        </section>

        {/* Historial de viajes con scroll */}
        <div className="pase-section-row">
          <span>HISTORIAL DE VIAJES</span>
          <span className="pase-count-accent">{trips.length} viajes</span>
        </div>

        <section className="history-scroll-box" aria-label="Historial de viajes realizados">
          {trips.map((trip) => (
            <article key={trip.id} className="history-item">
              <div className="history-item-text">
                <div className="history-route">{trip.routeTitle}</div>
                <div className="history-sub">{trip.subtitle}</div>
              </div>
              <span className="history-amount">-${trip.amount.toFixed(2)}</span>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
