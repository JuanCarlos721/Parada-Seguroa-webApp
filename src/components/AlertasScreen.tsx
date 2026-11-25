import { useParadaApp } from '../context/ParadaAppContext'
import type { AlertKind } from '../data/passAndAlerts'

function AlertIcon({ kind }: { kind: AlertKind }) {
  switch (kind) {
    case 'wallet':
      return (
        <div className="alert-icon-box icon-green">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#047857"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="6" width="20" height="13" rx="3" />
            <path d="M16 12.5h4" />
            <path d="M6 6V5a2 2 0 0 1 2-2h9" />
          </svg>
        </div>
      )
    case 'bus':
      return (
        <div className="alert-icon-box icon-blue">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1D4ED8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="4" width="16" height="14" rx="3" />
            <path d="M4 11h16M8 18v2M16 18v2" />
            <circle cx="8" cy="14.5" r="0.8" fill="#1D4ED8" />
            <circle cx="16" cy="14.5" r="0.8" fill="#1D4ED8" />
          </svg>
        </div>
      )
    case 'pin':
      return (
        <div className="alert-icon-box icon-amber">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B45309"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10Z" />
            <circle cx="12" cy="11" r="2.2" />
          </svg>
        </div>
      )
    case 'card':
      return (
        <div className="alert-icon-box icon-purple">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6D28D9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
            <path d="M2.5 10h19M7 14.5h4" />
          </svg>
        </div>
      )
    case 'bulb':
      return (
        <div className="alert-icon-box icon-amber">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B45309"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.8 10.65c.55.46.8 1.05.8 1.65V16h6v-.7c0-.6.25-1.19.8-1.65A6 6 0 0 0 12 3Z" />
          </svg>
        </div>
      )
    case 'update':
      return (
        <div className="alert-icon-box icon-sky">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0369A1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
            <path d="M12 8v8" />
          </svg>
        </div>
      )
    case 'beacon':
      return (
        <div className="alert-icon-box icon-green">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#047857"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3.5" fill="#10B981" />
          </svg>
        </div>
      )
    case 'shield':
    default:
      return (
        <div className="alert-icon-box icon-green">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#047857"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      )
  }
}

export function AlertasScreen() {
  const { alerts, markAllAlertsRead } = useParadaApp()
  const unreadCount = alerts.filter((a) => a.unread).length

  return (
    <main className="parada-screen">
      {/* Header flotante Liquid Glass (z-index > TopGreenBlur) */}
      <header className="parada-header alerts-glass-header">
        <div>
          <h1 className="alerts-main-title">Notificaciones</h1>
          <div className="alerts-main-sub">Últimos avisos de tu cuenta y viajes</div>
        </div>
        <div className="alerts-online-pill">
          <span className="alerts-online-dot" />
          <span>En línea</span>
        </div>
      </header>

      <div className="parada-scroll-body">
        <div className="pase-section-row">
          <span>Últimas notificaciones ({alerts.length})</span>
          <button
            type="button"
            className="alerts-mark-read-btn"
            disabled={unreadCount === 0}
            onClick={markAllAlertsRead}
          >
            Marcar como leídas
          </button>
        </div>

        <section className="alerts-scroll-viewport" aria-label="Lista de notificaciones">
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className={`alert-card ${alert.unread ? 'unread' : ''}`}
            >
              <AlertIcon kind={alert.kind} />
              <div className="alert-body">
                <div className="alert-meta-row">
                  <span className={`alert-badge badge-${alert.badgeTone}`}>
                    {alert.badgeLabel}
                  </span>
                  <div className="alert-time-wrap">
                    {alert.unread && <span className="alert-unread-dot" aria-label="No leída" />}
                    <span className="alert-time">{alert.timestampLabel}</span>
                  </div>
                </div>
                <h2 className="alert-title">{alert.title}</h2>
                <p className="alert-text">{alert.message}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
