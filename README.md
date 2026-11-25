# Parada Segura - WebApp (PWA)

Aplicación web progresiva (PWA) para el sistema ciberfísico **Parada Segura**, orientada a mejorar la seguridad nocturna y la visibilidad en tiempo real del transporte público colectivo en **Tijuana** y **Guanajuato** mediante mapa interactivo en vivo (**Leaflet + OpenStreetMap**), detección de ubicación GPS con cambio manual de ciudad y simulación vehicular en tiempo real.

**Universidad Autónoma de Baja California (UABC)**  
**Facultad de Ciencias de la Ingeniería y Tecnología (FCITEC)** — Licenciatura en Desarrollo de Software (Grupo 441)  
**Hecho por:** Lina Lorena Hernández Gutiérrez · Juan Carlos Pérez Hernández

## Clona el repositorio
```bash
git clone https://github.com/JuanCarlos721/Parada-Seguroa-webApp.git
```

---

## Ejecución rápida con Docker Compose

```bash
docker compose up --build
```

Abre `http://localhost:5173` en tu navegador (o desde tu teléfono en la misma red local).

Para ejecutar la compilación optimizada servida con Nginx:

```bash
docker compose --profile prod up --build
```

Disponible en `http://localhost:8080`.

---

## Ejecución local sin Docker

```bash
npm install
npm run dev
```

Para generar el compilado de producción:

```bash
npm run build
```

---

## Estructura del repositorio

```text
├── Dockerfile
├── docker-compose.yml
├── index.html
├── package.json
├── public/
│   ├── icon.svg
│   └── manifest.webmanifest
├── src/
│   ├── assets/                 # Íconos SVG vectoriales
│   ├── components/
│   │   ├── BottomTabBar.tsx    # Barra inferior Liquid Glass (Mapa, Parada, Mi Pase, Alertas)
│   │   ├── LiveMapCanvas.tsx   # Mapa interactivo Leaflet + OpenStreetMap multi-ciudad
│   │   ├── MapScreen.tsx       # Vista principal de mapa, selector de ciudad y Half Sheet interactivo
│   │   ├── ParadaScreen.tsx    # Módulo Parada: Aro LED, LDR, conectividad ESP32 y pruebas QA
│   │   ├── PlaceholderScreen.tsx
│   │   └── TopGreenBlur.tsx    # Capa superior #10B981 (40%) con desenfoque descendente
│   ├── data/
│   │   ├── cityProfiles.ts     # Perfiles geográficos y rutas de Tijuana y Guanajuato
│   │   └── mockTransit.ts      # Tipos base de navegación (TabId)
│   ├── hooks/
│   │   ├── useCityLocation.ts  # Geolocalización GPS, detección Haversine y fallback manual
│   │   ├── useParadaHardware.ts # Conexión MQTT WSS + puente REST + simulación QA del ESP32
│   │   └── useSimulatedUnits.ts # Simulación continua de unidades sobre polilíneas
│   ├── types/
│   │   └── paradaHardware.ts   # Contratos JSON y validación de rangos para sensores ESP32
│   ├── App.css
│   └── App.tsx
└── documentacion/
    ├── metas/                  # Entregables PDF de las metas previas del proyecto
    ├── ARQUITECTURA_Y_DISENO.md
    ├── BITACORA_IMPLEMENTACION_Y_CAMBIOS.md
    └── GUIA_EJECUCION_Y_DOCKER.md
```

---

## Conexión de Hardware ESP32 (MQTT y Endpoints REST)

Para conectar la placa **ESP32 / ESP8266** a la pestaña **Parada** en tiempo real (incluso entre distintas ciudades):

### 1. Conexión Remota por MQTT (Recomendada)
- **Broker MQTT (TCP para ESP32 en C++):** `broker.emqx.io` · Puerto `1883` (`mqtt://broker.emqx.io:1883`)
- **Broker MQTT (WSS usado por la WebApp):** `wss://broker.emqx.io:8084/mqtt`
- **Tópico de Estado (ESP32 → WebApp, publicar cada 1–5 s o al cambiar):** `parada_segura_uabc_441/p14/estado`
- **Tópico de Comandos (WebApp → ESP32, suscripción QoS 1):** `parada_segura_uabc_441/p14/comandos`

Payload JSON de estado publicado por el ESP32:
```json
{
  "stop_id": 14,
  "lux": 62,
  "night_mode": true,
  "button_pressed": false,
  "led_state": "COURTESY",
  "seats_free": 7,
  "occupancy_color": "GREEN",
  "device_id": "ESP32-P14",
  "rssi": -64
}
```
*(Valores válidos de `led_state`: `"OFF"`, `"COURTESY"`, `"ALERT"`. Rango admitido: `0 <= lux <= 10000` y `0 <= seats_free <= 60`.)*

Comandos JSON enviados por la WebApp hacia el ESP32:
```json
{
  "action": "REQUEST_STOP",
  "source": "WEBAPP_PWA"
}
```
*(Valores de `action`: `"REQUEST_STOP"` para encender la baliza 360° y `"CANCEL_STOP"` para cancelarla.)*

### 2. Puente HTTP REST Local (Alternativa en red Wi-Fi local / Vite dev)
Si una red bloquea los puertos MQTT, el servidor de desarrollo expone los siguientes endpoints en `http://<IP_DE_TU_PC>:5173`:
- `GET /api/parada/p14/health` — Verifica que el servidor está activo.
- `POST /api/parada/p14/estado` — Recibe el mismo JSON de telemetría del ESP32 y responde con `pending_command` si hay una parada solicitada.
- `GET /api/parada/p14/estado` — Devuelve la última trama válida almacenada.
- `GET /api/parada/p14/comandos` — Permite consultar el último comando emitido desde la app (`REQUEST_STOP` / `CANCEL_STOP`).
- `POST /api/parada/p14/comandos` — Encola manualmente un comando JSON.

---

## Documentación del proyecto

- [Arquitectura y Diseño UI/UX](documentacion/ARQUITECTURA_Y_DISENO.md)
- [Bitácora de Implementación y Cambios](documentacion/BITACORA_IMPLEMENTACION_Y_CAMBIOS.md)
- [Guía de Ejecución, Docker e Instalación PWA en iOS](documentacion/GUIA_EJECUCION_Y_DOCKER.md)
