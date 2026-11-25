import { useState } from 'react'
import { AlertasScreen } from './components/AlertasScreen'
import { BottomTabBar } from './components/BottomTabBar'
import { MapScreen } from './components/MapScreen'
import { MiPaseScreen } from './components/MiPaseScreen'
import { ParadaScreen } from './components/ParadaScreen'
import { TopGreenBlur } from './components/TopGreenBlur'
import { ParadaAppProvider } from './context/ParadaAppContext'
import type { TabId } from './data/mockTransit'
import './App.css'

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mapa')

  return (
    <ParadaAppProvider>
      <div className="app-viewport">
        <div className="app-shell">
          <TopGreenBlur />

          {activeTab === 'mapa' ? (
            <MapScreen />
          ) : activeTab === 'parada' ? (
            <ParadaScreen onBackToMap={() => setActiveTab('mapa')} />
          ) : activeTab === 'mi-pase' ? (
            <MiPaseScreen />
          ) : (
            <AlertasScreen />
          )}

          <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
      </div>
    </ParadaAppProvider>
  )
}

export default App
