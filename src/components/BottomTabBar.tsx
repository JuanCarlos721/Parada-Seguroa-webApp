import type { TabId } from '../data/mockTransit'
import iconMapa from '../assets/tab-mapa.svg'
import iconParada from '../assets/tab-parada-iot.svg'
import iconPase from '../assets/tab-mi-pase.svg'
import iconAlertas from '../assets/tab-alertas.svg'

interface BottomTabBarProps {
  activeTab: TabId
  onSelectTab: (tab: TabId) => void
}

const TAB_ITEMS: { id: TabId; label: string; icon: string; nativeBlue?: boolean }[] = [
  { id: 'mapa', label: 'Mapa', icon: iconMapa, nativeBlue: true },
  { id: 'parada', label: 'Parada', icon: iconParada },
  { id: 'mi-pase', label: 'Mi Pase', icon: iconPase },
  { id: 'alertas', label: 'Alertas', icon: iconAlertas },
]

export function BottomTabBar({ activeTab, onSelectTab }: BottomTabBarProps) {
  return (
    <nav className="bottom-tab-bar" aria-label="Navegación principal">
      {TAB_ITEMS.map((tab) => {
        const isActive = activeTab === tab.id
        const colorModeClass = tab.nativeBlue
          ? isActive
            ? 'icon-native-blue-active'
            : 'icon-to-slate'
          : isActive
            ? 'icon-to-blue-active'
            : 'icon-native-slate'

        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <img
              src={tab.icon}
              width={20}
              height={20}
              alt=""
              aria-hidden="true"
              className={`tab-svg-img ${colorModeClass}`}
            />
            <span className="tab-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
