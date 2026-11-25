interface PlaceholderScreenProps {
  screenName: string
}

export function PlaceholderScreen({ screenName }: PlaceholderScreenProps) {
  return (
    <main className="placeholder-screen">
      <span className="placeholder-pill">En desarrollo</span>
      <h1 className="placeholder-title">Pantalla {screenName} aquí</h1>
      <p className="placeholder-subtitle">
        Vista reservada para la siguiente iteración de componentes e integración IoT.
      </p>
    </main>
  )
}
