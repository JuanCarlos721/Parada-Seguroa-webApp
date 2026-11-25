# Arquitectura y Diseño del Sistema — Parada Segura

## 1. Visión general de la solución

**Parada Segura** articula tres capas tecnológicas para resolver la invisibilidad nocturna en paradas, la incertidumbre sobre tiempos de llegada (ETA) y aforo, y la fricción en el abordaje del transporte público en Tijuana:

1. **Nodo Urbano IoT (Hardware Embebido):**
   - Microcontrolador **ESP32 / ESP8266** programado en C++.
   - **Sensor fotorresistivo LDR** (`GPIO 34 / ADC0` con divisor de tensión `10 kΩ`) para detectar penumbra (`< 500 lux`) y activar iluminación de cortesía al 30%.
   - **Botón antivandálico** (`GPIO 4` con `INPUT_PULLUP` y filtro *debounce* de `50 ms`).
   - **Aro / Tira LED WS2812B** (`GPIO 5`) con cambio inmediato (`< 5 ms`) entre modo cortesía y baliza 360° de alerta.
   - **Semáforo físico de ocupación** (`GPIO 18, 19, 21`) con LEDs verde, amarillo y rojo.
2. **Capa de Comunicación Remota (MQTT + API REST):**
   - Broker MQTT en la nube (`broker.emqx.io`) para desacoplar el nodo físico y el cliente móvil, permitiendo comunicación bidireccional a distancia entre distintos estados/redes sin abrir puertos locales.
   - Canal de hardware hacia app: `parada_segura_uabc_441/p14/estado` (puerto `1883` TCP en ESP32; puerto `8084` WSS TLS en WebApp).
   - Canal de app hacia hardware: `parada_segura_uabc_441/p14/comandos`.
   - Consumo REST (`HTTPS GET`) para consulta de rutas e historial de viajes.
3. **Aplicación Web Progresiva (PWA) — React + Vite + TypeScript:**
   - Interfaz móvil responsiva (`100dvh` con soporte de `safe-area-inset-top` y `safe-area-inset-bottom` para iPhone en modo `standalone`).

---

## 2. Especificación visual y sistema de diseño (Liquid Glass)

La estética de la WebApp toma como referencia directa los tokens definidos en el prototipo de Figma (`ParadaSegura-Prototipo`):

| Elemento | Especificación Técnica | Propósito UX |
| :--- | :--- | :--- |
| **Tipografía** | `Inter` (pesos 400, 600, 700, 800) | Alta legibilidad en pantalla móvil de día y de noche. |
| **Capa superior verde** | `rgba(16, 185, 129, 0.40)` (`#10B981`, 40%) con `backdrop-filter: blur(14px)` y máscara vertical descendente | Identidad visual de seguridad activa sin obstruir la lectura del mapa. |
| **Half Sheet (Liquid Glass)** | `rgba(255, 255, 255, 0.76)` + `backdrop-filter: blur(26px) saturate(190%)` + borde superior especular | Permite contexto continuo del mapa mientras se operan filtros, campos y carruseles. |
| **Barra flotante de ruta** | `rgba(255, 255, 255, 0.52)` + `backdrop-filter: blur(20px)` + ícono de búsqueda `#007AFF` + badge `En vivo` (`#D1FAE5` / `#065F46`) | Acceso inmediato a la ruta activa (`Postal/TEC/UABC → Centro`). |
| **Barra de pestañas inferior** | Cápsula flotante en Liquid Glass (`backdrop-filter: blur(24px) saturate(190%)`), 4 pestañas (`Mapa`, `Parada IoT`, `Mi Pase`, `Alertas`) | Navegación principal a 1 toque; ícono y texto activo en azul iOS `#007AFF` e inactivos en `#64748B`. |
| **Semáforo de aforo** | Verde `#059669`, Ámbar `#DAA000` / `#FFD000`, Rojo `#E80004` | Lectura instantánea de disponibilidad de asientos antes de que la unidad llegue. |

---

## 3. Contratos de datos JSON acordados para integración

### Estado publicado por el nodo ESP32 (`parada_segura_uabc_441/p14/estado`)
```json
{
  "stop_id": 14,
  "lux": 62,
  "night_mode": true,
  "button_pressed": false,
  "led_state": "COURTESY",
  "seats_free": 7,
  "occupancy_color": "GREEN"
}
```

### Comandos enviados desde la WebApp (`parada_segura_uabc_441/p14/comandos`)
```json
{
  "action": "REQUEST_STOP",
  "source": "WEBAPP_PWA"
}
```
Valores válidos de `action`: `"REQUEST_STOP"`, `"CANCEL_STOP"`.

---

## 4. Mapa interactivo multi-ciudad y telemetría simulada (`Leaflet + OpenStreetMap`)

Para validar la aplicación de forma distribuida entre **Tijuana, B.C.** y **Guanajuato, Gto.** sin costos ni llaves de API propietarias, el módulo cartográfico utiliza **Leaflet** sobre mosaicos públicos de **OpenStreetMap** (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) estilizados con filtro suave CSS (`.leaflet-tile-pane`) acorde al sistema Liquid Glass.

- **Detección automática por GPS (`src/hooks/useCityLocation.ts`):** Consulta `navigator.geolocation.getCurrentPosition` al iniciar o cuando el usuario pulsa `📍 GPS`, y determina la ciudad más cercana aplicando la fórmula de **Haversine** (`detectClosestCity` en `src/data/cityProfiles.ts`). Si el permiso es denegado o no está disponible (por ejemplo, en contexto HTTP local no seguro), aplica un *fallback* automático hacia el perfil predeterminado sin bloquear la interfaz.
- **Selector manual en vivo (`MapScreen.tsx`):** Píldoras Liquid Glass (`Tijuana`, `Guanajuato`, `📍 GPS`) y botón de recentrado (`⌖`) que ejecutan transiciones suaves (`map.flyTo(...)`) entre las rutas reales de ambas ciudades:
  - **Tijuana (`tijuana`):** `Calz. del Tecnológico · Parada P14`, ruta `Postal/TEC/UABC → Centro`.
  - **Guanajuato (`guanajuato`):** `Zona Centro · Parada P08`, ruta `Centro → Marfil / Noria Alta`.
- **Simulación vehicular continua (`src/hooks/useSimulatedUnits.ts`):** Actualiza la posición `[lat, lng]` de cada unidad cada `1200 ms` mediante interpolación lineal sobre la polilínea vial de la ciudad activa, recalculando en tiempo real su distancia hacia la parada (`m`), el `ETA` en minutos y el estado en el `SEMÁFORO EN VIVO`.

---

## 5. Módulo **Parada** e integración de hardware ESP32 (`MQTT WSS + REST`)

La segunda pestaña inferior (**`Parada`**, `src/components/ParadaScreen.tsx`) conecta directamente la interfaz Liquid Glass con el nodo físico ESP32 sin barra segmentada superior, centrando la vista en el estado operativo de la parada:

- **Conexión remota MQTT sobre WebSockets TLS (`src/hooks/useParadaHardware.ts`):** Se conecta a `wss://broker.emqx.io:8084/mqtt`, se suscribe a `parada_segura_uabc_441/p14/estado` y publica comandos (`REQUEST_STOP` / `CANCEL_STOP`) en `parada_segura_uabc_441/p14/comandos`.
- **Puente HTTP REST local (`vite.config.ts`):** Expone `/api/parada/p14/health`, `/api/parada/p14/estado` y `/api/parada/p14/comandos` durante el entorno de desarrollo (y Docker dev) para pruebas locales mediante `POST`/`GET` JSON con tiempo máximo de espera de `5 s` (`AbortController`).
- **Validación defensiva (`src/types/paradaHardware.ts`):** `parseAndValidateTelemetry` protege contra tramas JSON truncadas y acota lecturas físicas (`0 ≤ lux ≤ 10000`, `0 ≤ seats_free ≤ 60`), conservando la última lectura válida en pantalla si llega un dato anómalo o si se pierde la red.
- **Control seguro por identificación de equipo:** El botón **Solicitar Parada (Encender Baliza 360°)** solo se habilita cuando existe un ESP32 identificado o cuando se activa el modo de prueba QA desde el icono discreto superior.

### Referencia completa de endpoints para el ESP32
| Medio | Canal / Endpoint | Método / Protocolo | Uso |
| :--- | :--- | :--- | :--- |
| **MQTT ESP32** | `broker.emqx.io:1883` | TCP (`mqtt://`) | Conexión directa del microcontrolador |
| **MQTT WebApp** | `wss://broker.emqx.io:8084/mqtt` | WebSocket TLS (`wss://`) | Cliente en navegador PWA |
| **Tópico Estado** | `parada_segura_uabc_441/p14/estado` | MQTT Publish (`ESP32 → App`) | Envío de `lux`, `night_mode`, `led_state`, `button_pressed`, `seats_free`, `occupancy_color`, `device_id`, `rssi` |
| **Tópico Comandos** | `parada_segura_uabc_441/p14/comandos` | MQTT Subscribe (`App → ESP32`) | Recepción de `REQUEST_STOP` y `CANCEL_STOP` |
| **REST Salud** | `/api/parada/p14/health` | `HTTP GET` (Vite / Docker dev) | Diagnóstico rápido de disponibilidad |
| **REST Estado** | `/api/parada/p14/estado` | `HTTP POST` / `GET` | Alternativa LAN HTTP con retorno de `pending_command` |
| **REST Comandos** | `/api/parada/p14/comandos` | `HTTP GET` / `POST` | Polling de solicitud de parada |
