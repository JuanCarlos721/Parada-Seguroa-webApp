import { useState } from 'react'
import { BottomTabBar } from './components/BottomTabBar'
import { MapScreen } from './components/MapScreen'
import { PlaceholderScreen } from './components/PlaceholderScreen'
import { TopGreenBlur } from './components/TopGreenBlur'
import type { TabId } from './data/mockTransit'
import './App.css'

const PLACEHOLDER_TITLES: Record<Exclude<TabId, 'mapa'>, string> = {
  'parada-iot': 'Parada IoT',
  'mi-pase': 'Mi Pase',
  alertas: 'Alertas',
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mapa')

  return (
    <div className="app-viewport">
      <div className="app-shell">
        <TopGreenBlur />

        {activeTab === 'mapa' ? (
          <MapScreen />
        ) : (
          <PlaceholderScreen screenName={PLACEHOLDER_TITLES[activeTab]} />
        )}

        <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    </div>
  )
}

export default App
