# Parada Segura - WebApp (PWA)

Aplicación web progresiva (PWA) para el sistema ciberfísico **Parada Segura**, orientada a mejorar la seguridad nocturna y la visibilidad en tiempo real del transporte público colectivo en **Tijuana** y **Guanajuato** mediante mapa interactivo en vivo (**Leaflet + OpenStreetMap**), detección de ubicación GPS con cambio manual de ciudad y simulación vehicular en tiempo real.

**Universidad Autónoma de Baja California (UABC)**  
**Facultad de Ciencias de la Ingeniería y Tecnología (FCITEC)** — Licenciatura en Desarrollo de Software (Grupo 441)  
**Hecho por:** Lina Lorena Hernández Gutiérrez · Juan Carlos Pérez Hernández

## Requisitos previos en tu PC (Instalación desde cero)

Para ejecutar la aplicación en otra computadora (por ejemplo, en el equipo de pruebas de hardware en Guanajuato), instala primero las herramientas base según la modalidad que prefieras usar:

### Opción A — Ejecución directa con Node.js (Más rápida en Windows/macOS)
1. **Git:** Descarga e instala [Git](https://git-scm.com/downloads) para clonar el repositorio (`git --version`).
2. **Node.js LTS (v20 o v22):** Descarga e instala [Node.js](https://nodejs.org/) (incluye `npm`; verificado con `v22.14.0`).
3. **Navegador web moderno:** Google Chrome, Microsoft Edge o Safari.
4. *(Opcional para editar)* [Visual Studio Code](https://code.visualstudio.com/).

### Opción B — Ejecución aislada con Docker Desktop
1. **Git:** [git-scm.com/downloads](https://git-scm.com/downloads).
2. **Docker Desktop:** Instala [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye `docker compose`) y asegúrate de tenerlo abierto antes de levantar el contenedor.

---

## Clona el repositorio
```bash
git clone https://github.com/JuanCarlos721/Parada-Seguroa-webApp.git
cd Parada-Seguroa-webApp
```

---

## Ejecución rápida con Docker Compose

```bash
docker compose up --build
```

Abre `http://localhost:5173` en tu navegador (o desde tu teléfono conectado a la misma red Wi-Fi usando la IP local de tu PC).

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

> **Nota para Windows PowerShell:** Si aparece un error de política de ejecución al escribir `npm`, usa `npm.cmd install` y `npm.cmd run dev` (o abre una terminal **Git Bash** / **Símbolo del sistema (`cmd`)**).

Al iniciar Vite verás en consola la URL local (`http://localhost:5173`) y la IP de red (`Network`). Para generar el compilado de producción:

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
│   │   ├── AlertasScreen.tsx   # Centro de notificaciones y eventos en vivo
│   │   ├── BottomTabBar.tsx    # Barra inferior Liquid Glass (Mapa, Parada, Mi Pase, Alertas)
│   │   ├── LiveMapCanvas.tsx   # Mapa interactivo Leaflet + OpenStreetMap multi-ciudad
│   │   ├── MapScreen.tsx       # Vista principal de mapa, selector de ciudad y Half Sheet interactivo
│   │   ├── MiPaseScreen.tsx    # Credencial estudiantil, QR de 60s, toggle NFC, recargas y viajes
│   │   ├── ParadaScreen.tsx    # Módulo Parada: Aro LED, LDR, conectividad ESP32 y pruebas QA
│   │   └── TopGreenBlur.tsx    # Capa superior #10B981 (40%) con desenfoque descendente
│   ├── context/
│   │   └── ParadaAppContext.tsx # Estado compartido en memoria entre los 4 módulos
│   ├── data/
│   │   ├── cityProfiles.ts     # Perfiles geográficos y rutas de Tijuana y Guanajuato
│   │   ├── mockTransit.ts      # Tipos base de navegación (TabId)
│   │   └── passAndAlerts.ts    # Notificaciones base, historial y rutas simulables por ciudad
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

## Conexión de Hardware ESP32 (Guía paso a paso para Lina)

Para conectar la placa **ESP32 / ESP8266** a la pestaña **Parada** en tiempo real (incluso probando a distancia entre Guanajuato y Tijuana):

### Requisitos del entorno Arduino / ESP32
- **Arduino IDE** (o PlatformIO) con el soporte de placas **ESP32 by Espressif** instalado.
- Librerías recomendadas en *Gestor de Bibliotecas*: **`PubSubClient`** (MQTT) y **`ArduinoJson`** (o formateo manual de cadena JSON).
- Conexión Wi-Fi con acceso a internet (para llegar al broker público en la nube).

### 1. Conexión Remota por MQTT (Recomendada)
- **Broker MQTT (TCP para ESP32 en C++):** `broker.emqx.io` · Puerto `1883` (`mqtt://broker.emqx.io:1883`)
- **Broker MQTT (WSS usado por la WebApp):** `wss://broker.emqx.io:8084/mqtt`
- **Tópico de Estado (ESP32 → WebApp):** `parada_segura_uabc_441/p14/estado`
- **Tópico de Comandos (WebApp → ESP32, QoS 1):** `parada_segura_uabc_441/p14/comandos`

**Pasos en el firmware del ESP32:**
1. Conecta el ESP32 a tu Wi-Fi y al servidor MQTT `broker.emqx.io` en el puerto `1883` con un `clientId` único (por ejemplo `"esp32_parada_p14_lina"`).
2. Suscríbete al tópico `parada_segura_uabc_441/p14/comandos` para escuchar órdenes de la aplicación (`REQUEST_STOP` / `CANCEL_STOP`).
3. Publica el JSON de estado cada **2 a 5 segundos** (y al presionar el botón físico o cambiar la lectura LDR) en `parada_segura_uabc_441/p14/estado` **sin bandera `retain`** (`retain = false`):
   > Importante: la WebApp identifica automáticamente el equipo al recibir tramas en vivo (`!retain`) y espera un latido al menos cada **25 segundos**; si pasa ese tiempo sin recibir paquetes, vuelve a estado *En espera* y bloquea la solicitud por seguridad.

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

4. Abre la aplicación web en tu navegador (`http://localhost:5173`), entra a la pestaña **Parada**, confirma que **Conectividad ESP32** cambió de `En espera` a **`Online`** y presiona **`Solicitar Parada (Encender Baliza 360°)`** para verificar que tu ESP32 recibe el comando en menos de 1 segundo.

### 2. Puente HTTP REST Local (Alternativa en red Wi-Fi local / Vite dev)
Si una red bloquea los puertos MQTT (`1883` / `8084`), el servidor de desarrollo (`npm run dev` o `docker compose up`) expone los siguientes endpoints en `http://<IP_DE_TU_PC>:5173`:
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
