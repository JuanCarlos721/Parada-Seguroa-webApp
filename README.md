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

## Documentación del proyecto

- [Arquitectura y Diseño UI/UX](documentacion/ARQUITECTURA_Y_DISENO.md)
- [Bitácora de Implementación y Cambios](documentacion/BITACORA_IMPLEMENTACION_Y_CAMBIOS.md)
- [Guía de Ejecución, Docker e Instalación PWA en iOS](documentacion/GUIA_EJECUCION_Y_DOCKER.md)
