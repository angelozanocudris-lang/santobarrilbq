# 🍔 Santo Barril — Aplicación Web

Aplicación de pedidos y administración para Santo Barril, construida con **TanStack Start**, **React 19**, **Tailwind CSS v4** y **Supabase**.

## 🚀 Inicio rápido

```bash
# 1. Instalar dependencias
bun install        # o:  npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 3. Aplicar migraciones SQL a tu Supabase
# (ver DOCUMENTACIÓN/GUIA_DESPLIEGUE.md)

# 4. Ejecutar en desarrollo
bun run dev        # o:  npm run dev
```

Abre http://localhost:8080

## 📁 Estructura

Ver [`DOCUMENTACIÓN/ESTRUCTURA_DEL_PROYECTO.md`](DOCUMENTACIÓN/ESTRUCTURA_DEL_PROYECTO.md).

## 📖 Guía completa de despliegue

Ver [`DOCUMENTACIÓN/GUIA_DESPLIEGUE.md`](DOCUMENTACIÓN/GUIA_DESPLIEGUE.md) — paso a paso para subir a GitHub, Vercel y conectar Supabase.

## 🛠️ Scripts

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Servidor de desarrollo en `localhost:8080` |
| `bun run build` | Build de producción |
| `bun run preview` | Previsualizar el build |
| `bun run lint` | Revisar el código con ESLint |

## 🔐 Acceso

- `/` — Sitio público
- `/menu` — Menú de productos
- `/carrito` — Carrito de compras
- `/checkout` — Finalizar pedido (envía por WhatsApp)
- `/admin` — Panel admin (requiere PIN: variable `ADMIN_PIN`)
- `/mesera` — Panel mesera (requiere PIN: variable `WAITER_PIN`)
