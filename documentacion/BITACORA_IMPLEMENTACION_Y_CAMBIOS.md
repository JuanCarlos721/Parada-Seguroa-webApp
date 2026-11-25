# Bitácora de Proceso, Implementación y Cambios

Este documento resume la evolución técnica de **Parada Segura** desde la fase de descubrimiento hasta la implementación inicial de la aplicación web progresiva (PWA).

---

## 1. Síntesis de fases previas (Metas 1.1 a 3.3)

- **Investigación y empatía (Metas 1.1, 1.2, 1.3 y 2.1):** Mediante observación en campo y entrevistas a pasajeros frecuentes en Tijuana (estudiantes, trabajadores y adultos mayores), se identificaron tres problemáticas críticas: invisibilidad nocturna en paradas, incertidumbre de tiempos y aforo en el día, y lentitud en cobro en efectivo/validación de credenciales.
- **Agrupación e insights (Meta 2.2):** Se organizaron los hallazgos en tres dimensiones (Hardware y Entorno Físico, Software y Gestión de Datos, Proceso y Usuario) y se definió la necesidad de incluir notificaciones de aproximación, confirmación de pago y accesibilidad visual.
- **Adaptación de hardware con SCAMPER (Metas 3.2 y 3.3):** Durante las pruebas preliminares en protoboard se dañó el sensor climático DHT11. Aplicando la lente *Proponer otro uso*, se sustituyó por una **fotorresistencia LDR** en `GPIO 34`, dotando al poste de encendido autónomo de luz de cortesía nocturna al caer la iluminación ambiental (`< 500 lux`). Asimismo, bajo la lente *Reordenar*, el aro LED WS2812B confirma localmente la pulsación en menos de `5 ms` sin bloquearse esperando respuesta de red.

---

## 2. Evolución del diseño de interfaz

1. **Wireframes preliminares (Avance 2):** Se estructuraron tres vistas base (Mapa/Aforo, Estado del Nodo IoT y Pase QR/NFC con historial) priorizando navegación simplificada.
2. **Prototipo de alta fidelidad en Figma (`ParadaSegura-Prototipo`):**
   - Se adoptó una estética híbrida inspirada en Apple Maps / Uber / iOS nativo, aterrizada a la zona real de **UABC Otay / Calz. del Tecnológico** (`Parada P14`, ruta `Postal/TEC/UABC → Centro`, unidades `Camión #U-24`, `Taxi #U-111` y `Taxi #U-91`).
   - Se reorientaron los textos de la sección de Alertas hacia mensajes centrados en el usuario final (abonos de saldo, cercanía de unidad, permisos de ubicación, avisos de iluminación nocturna y actualizaciones de versión).
   - Se incorporó un difuminado verde superior (`#10B981` al 40%) con desenfoque descendente y superficies translúcidas estilo **Liquid Glass**.

---

## 3. Decisiones técnicas de implementación (Meta 4.2)

### Cambio de plataforma: de React Native (Expo Go) a WebApp PWA (React + Vite)
- **Contexto:** El equipo trabaja en entornos distribuidos (desarrollo de software en Windows con pruebas en iPhone, y desarrollo de hardware en otra entidad federativa).
- **Análisis:**
  - En Windows no es posible compilar nativamente código Swift/Xcode hacia iOS sin una Mac, y las instalaciones gratuitas por cable expiran cada 7 días.
  - Aunque React Native con Expo Go funciona en iPhone, depende del contenedor `Expo Go` en lugar de abrirse con ícono propio, y la estética *Liquid Glass* con desenfoques compuestos requiere librerías nativas adicionales.
- **Decisión:** Implementar la aplicación como **WebApp / PWA en React + Vite + TypeScript**:
  - Permite instalación directa en la pantalla de inicio de iPhone desde Safari en modo `standalone` (sin barra de navegador y con ícono propio).
  - Soporta efectos **Liquid Glass** de forma nativa mediante CSS (`backdrop-filter: blur(...) saturate(...)` y máscaras lineales).
  - Facilita la comunicación remota por MQTT sobre WebSockets seguros (`wss://broker.emqx.io:8084/mqtt`) y la demostración compartida en pruebas a distancia.

### Alcance priorizado (MVP de integración)
Para asegurar una entrega sólida y verificable dentro del calendario académico, se definió:
- **En alcance:** Estructura principal con navegación entre 4 pestañas, vista completa de Mapa con Half Sheet interactivo (filtros, carruseles, campos de texto y semáforo en vivo), integración MQTT bidireccional con el ESP32 remoto, prueba REST con manejo de errores (`try/catch`, `AbortController`, validación de rangos y estado Offline).
- **Fuera de alcance en esta etapa:** Rastreo GPS en flota vehicular real, lector NFC físico en pasamanos, pasarela bancaria real y autenticación JWT.

---

## 4. Primer hito implementado en código (`v0.1.0`)

En esta primera entrega de frontend se estructuró:
- Proyecto **React + Vite + TypeScript** listo para ejecutarse localmente o mediante **Docker Compose**.
- Navegación funcional entre los cuatro módulos principales: **Mapa**, **Parada IoT**, **Mi Pase** y **Alertas**.
- **Barra de pestañas inferior en Liquid Glass** con íconos vectoriales fieles al prototipo de Figma y resaltado activo en azul iOS (`#007AFF`).
- **Capa superior de difuminado verde (`#10B981`, 40%)** con desenfoque descendente progresivo en capa alta.
- **Pantalla Mapa** con el mapa real de Calz. del Tecnológico (UABC), barra flotante de ruta editable, marcadores interactivos y **Half Sheet en Liquid Glass** con campo de texto de filtrado, carrusel de rutas, carrusel de unidades próximas, semáforo en vivo reactivo a la unidad seleccionada y botón de solicitud de parada.
- **Pantallas secundarias (`Parada IoT`, `Mi Pase`, `Alertas`)** habilitadas en la navegación con placeholders descriptivos listos para la siguiente fase de componentes e integración MQTT/REST.

---

## 5. Mapa en tiempo real multi-ciudad y simulación vehicular (`v0.2.0`)

Para permitir pruebas en tiempo real tanto en **Tijuana, Baja California** como en **Guanajuato, Guanajuato**, se sustituyó la imagen estática inicial del mapa por una capa cartográfica viva basada en **Leaflet** y **OpenStreetMap**:

- **Perfiles por ciudad (`src/data/cityProfiles.ts`):** Define las coordenadas de centro, parada principal, polilínea de corredor vial, rutas rápidas y flota inicial para `tijuana` (`Parada P14 · Calz. del Tecnológico`) y `guanajuato` (`Parada P08 · Centro · Teatro Juárez`), además de funciones de distancia geodésica (`haversineMeters`, `detectClosestCity`).
- **Geolocalización con fallback (`src/hooks/useCityLocation.ts`):** Solicita la ubicación del navegador vía `navigator.geolocation`, selecciona automáticamente la ciudad más cercana y muestra el marcador pulsante de posición del usuario cuando hay permiso; en caso contrario o durante pruebas locales por HTTP, permite cambiar manualmente entre **Tijuana**, **Guanajuato** y reintento **📍 GPS** desde píldoras Liquid Glass en la parte superior del mapa, junto con un botón de recentrado (`⌖`).
- **Motor de unidades simuladas (`src/hooks/useSimulatedUnits.ts`):** Interpola de manera continua cada `1200 ms` la coordenada de cada camión y taxi sobre la polilínea de la ciudad activa, actualizando dinámicamente los marcadores del mapa, las tarjetas del Half Sheet (distancia en metros y minutos estimados de llegada) y el componente `SEMÁFORO EN VIVO`.
- **Ajustes visuales Liquid Glass (`src/App.css`):** Integración de los controles de Leaflet sin marca de agua comercial, filtro suave de mosaicos OSM para armonizar con los desenfoques translúcidos y ajuste de altura del Half Sheet (`59%`) para mantener visible el botón de solicitud de parada por encima de la barra de pestañas inferior.

---

## 6. Módulo 2: Pantalla **Parada** e integración de hardware ESP32 (`v0.3.0`)

En esta iteración se habilitó la segunda vista principal de la WebApp alineada al diseño del prototipo y al contrato técnico de pruebas de integración:

- **Renombrado y simplificación visual (`BottomTabBar.tsx`, `ParadaScreen.tsx`):** La pestaña y vista pasaron de `Parada IoT` a **`Parada`**, eliminando la barra segmentada superior (`Nodo IoT`, `Consola Chofer`, `Telemetría`) para priorizar los indicadores clave en una vista única Liquid Glass.
- **Telemetría reactiva en tiempo real (`useParadaHardware.ts`, `paradaHardware.ts`):** Tarjeta Hero del **Aro LED WS2812B** (`0%`, `30%` cortesía LDR, `100%` baliza 360°), **Fotorresistencia LDR** con barra de **nivel de iluminación ambiental** (`GPIO 34`), **Conectividad ESP32** (`MQTT QoS 1` / `HTTP Bridge`) y parámetros en vivo (`button_pressed`, `occupancy_color`, `seats_free`).
- **Endpoints listos para el nodo físico (`mqtt` + `vite.config.ts`):** Integración nativa en navegador con `wss://broker.emqx.io:8084/mqtt` (`parada_segura_uabc_441/p14/estado` y `comandos`), además de puente HTTP REST local en `/api/parada/p14/*` y cajón plegable dentro de la pantalla con la referencia completa de conexión para el hardware ESP32.
- **Bloqueo operativo sin hardware y menú oculto de pruebas QA:** El botón **Solicitar Parada** permanece bloqueado mientras no se identifique un equipo conectado. Mediante un icono discreto en el encabezado se accede a un panel de simulación para alternar entre **Hardware Real**, **Falsa Conexión ESP32** (Penumbra, Día o Rango Inválido) y **Falla Abrupta de Red** (Offline-First con botón de reintento).
