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
