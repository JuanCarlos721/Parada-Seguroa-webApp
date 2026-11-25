# Guía de Ejecución, Docker e Instalación PWA

Esta guía explica cómo levantar el proyecto **Parada Segura WebApp** en cualquier computadora (Windows, macOS o Linux) y cómo instalarlo como aplicación independiente en un iPhone.

---

## Opción 1: Ejecutar con Docker Compose (Recomendado entre distintas PC)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye `docker compose`).

### Modo desarrollo (con recarga en vivo / HMR)
Desde la raíz del repositorio ejecuta:

```bash
docker compose up --build
```

- La aplicación quedará disponible en: `http://localhost:5173`
- Cualquier modificación en `src/` se reflejará automáticamente en el navegador.
- Para detener el contenedor:

```bash
docker compose down
```

### Modo producción (compilado estático servido con Nginx)
```bash
docker compose --profile prod up --build
```

- La aplicación compilada quedará disponible en: `http://localhost:8080`
- Para detenerla:

```bash
docker compose --profile prod down
```

---

## Opción 2: Ejecutar en local con Node.js

### Requisitos
- Node.js 20 o superior (`node -v` verificado en `v22.14.0`).

### Pasos
```bash
# 1. Instalar dependencias
npm install

# 2. Levantar servidor de desarrollo (accesible también desde el celular en red local)
npm run dev
```

*(Nota para Windows PowerShell: si la política de ejecución bloquea `npm`, ejecutar `npm.cmd install` y `npm.cmd run dev`.)*

### Verificación de compilación TypeScript y bundle Vite
```bash
npm run build
```

---

## Cómo probar e instalar como app en iPhone (PWA)

1. Ejecuta el servidor en tu PC (`npm run dev` o `docker compose up`) y asegúrate de que tu iPhone esté conectado a la misma red Wi-Fi (o accede mediante la URL pública HTTPS cuando esté desplegada).
2. Abre el enlace en **Safari** desde el iPhone.
3. Toca el botón **Compartir** (ícono inferior central con flecha hacia arriba).
4. Selecciona **"Agregar a pantalla de inicio"**.
5. Abre **Parada Segura** desde el ícono creado en tu pantalla de inicio: la aplicación iniciará en modo `standalone` a pantalla completa, respetando el área superior verde y la barra inferior Liquid Glass sin barras del navegador.
