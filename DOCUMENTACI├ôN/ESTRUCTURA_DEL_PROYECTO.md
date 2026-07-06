# 🗂️ Estructura del proyecto — Santo Barril

Esta es la descripción de cada carpeta y archivo importante.

## 📂 Raíz del proyecto

| Archivo / Carpeta | Para qué sirve |
|---|---|
| `src/` | **Todo el código fuente** de la aplicación (frontend + backend). |
| `public/` | Archivos estáticos servidos directamente (favicon, robots.txt, etc.). |
| `supabase/` | Configuración y migraciones SQL de la base de datos. |
| `DOCUMENTACIÓN/` | Esta carpeta — guías y documentación del proyecto. |
| `package.json` | Lista de dependencias y scripts (`dev`, `build`, etc.). |
| `package-lock.json` / `bun.lockb` | Versiones exactas de cada dependencia (no editar a mano). |
| `tsconfig.json` | Configuración de TypeScript. |
| `vite.config.ts` | Configuración del bundler (Vite). |
| `components.json` | Configuración de shadcn/ui (componentes reutilizables). |
| `eslint.config.js` | Reglas de calidad de código. |
| `wrangler.jsonc` | Config de Cloudflare Workers (usado en runtime serverless). |
| `.env.example` | Plantilla de variables de entorno. **Cópialo como `.env`** y completa los valores. |
| `.gitignore` | Le dice a Git qué archivos NO subir (node_modules, .env, etc.). |
| `.prettierrc` / `.prettierignore` | Formato automático de código. |
| `README.md` | Introducción rápida al proyecto. |

---

## 📂 `src/` — Código fuente

```
src/
├── routes/          ← Cada archivo = una página/URL
├── components/      ← Componentes reutilizables de UI
├── hooks/           ← Hooks personalizados de React
├── lib/             ← Lógica de negocio y server functions
├── server/          ← Helpers que SOLO corren en el servidor
├── integrations/    ← Cliente de Supabase (auto-generado)
├── assets/          ← Imágenes y recursos estáticos
├── styles.css       ← Estilos globales y tema de Tailwind v4
├── router.tsx       ← Configuración del router
└── routeTree.gen.ts ← Auto-generado por TanStack Router (no editar)
```

### `src/routes/` — Páginas (file-based routing)

Cada archivo es una URL. Por ejemplo `admin.pedidos.tsx` → `/admin/pedidos`.

| Archivo | URL | Descripción |
|---|---|---|
| `__root.tsx` | — | Layout raíz (HTML, head, providers). |
| `index.tsx` | `/` | Página de inicio. |
| `menu.tsx` | `/menu` | Listado de productos. |
| `carrito.tsx` | `/carrito` | Carrito de compras. |
| `checkout.tsx` | `/checkout` | Finalizar pedido → WhatsApp. |
| `admin.tsx` | `/admin` | Layout del panel admin (con login por PIN). |
| `admin.pedidos.tsx` | `/admin/pedidos` | Listado de pedidos. |
| `admin.productos.tsx` | `/admin/productos` | CRUD de productos. |
| `admin.egresos.tsx` | `/admin/egresos` | Registro de egresos. |
| `mesera.tsx` | `/mesera` | Panel de mesera. |

### `src/components/`

- `SiteHeader.tsx`, `SiteFooter.tsx` — Header/footer del sitio público.
- `AdminLayout.tsx` — Layout compartido del panel admin.
- `CartFab.tsx` — Botón flotante del carrito.
- `ui/` — Componentes shadcn/ui (botones, dialogs, inputs, etc.).

### `src/lib/` — Lógica de negocio

- `admin-auth.functions.ts` — Server functions de autenticación admin.
- `admin-data.functions.ts` — Server functions para CRUD del admin.
- `waiter-auth.functions.ts` — Server functions de autenticación mesera.
- `waiter-data.functions.ts` — Server functions para mesera.
- `cart.ts` — Lógica del carrito (localStorage).
- `whatsapp.ts` — Generación del mensaje de WhatsApp.
- `format.ts` — Formateo de precios y fechas.
- `utils.ts` — Utilidades (cn para clases CSS).
- `admin-token.ts` — Cliente para el token de sesión admin.

### `src/server/` — Solo servidor

- `admin-auth.server.ts` — Verificación y firma de cookies admin.
- `waiter-auth.server.ts` — Verificación y firma de cookies mesera.

> ⚠️ Estos archivos NUNCA se envían al navegador.

### `src/integrations/supabase/` — Cliente de base de datos

- `client.ts` — Cliente para el navegador (clave pública).
- `client.server.ts` — Cliente admin para el servidor (service_role).
- `auth-middleware.ts` — Middleware para server functions autenticadas.
- `auth-attacher.ts` — Adjunta el token al llamar server functions.
- `types.ts` — Tipos TypeScript de la base de datos.

> 🔒 Estos archivos son auto-generados — **no los edites a mano**.

---

## 📂 `supabase/`

```
supabase/
├── config.toml      ← Configuración del proyecto Supabase
└── migrations/      ← Archivos .sql en orden cronológico
```

Cada `.sql` en `migrations/` crea o modifica tablas, políticas y funciones.

**Aplícalas en orden alfabético** desde el SQL Editor de Supabase (ver `GUIA_DESPLIEGUE.md` sección 4.2).

---

## 📂 `public/`

Archivos servidos tal cual sin procesar (favicon, manifest, robots.txt).

---

## 🔑 Variables de entorno (`.env`)

Ver `.env.example` para la lista completa. Resumen:

| Variable | Tipo | Para qué |
|---|---|---|
| `VITE_SUPABASE_URL` | Pública | URL del proyecto Supabase (cliente). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Pública | Clave anon de Supabase (cliente). |
| `VITE_SUPABASE_PROJECT_ID` | Pública | ID del proyecto. |
| `SUPABASE_URL` | Servidor | Igual a la anterior pero para servidor. |
| `SUPABASE_PUBLISHABLE_KEY` | Servidor | Igual. |
| `SUPABASE_SERVICE_ROLE_KEY` | **🔒 Secreta** | Acceso admin a la BD. NUNCA exponer. |
| `ADMIN_PIN` | **🔒 Secreta** | PIN para entrar a `/admin`. |
| `WAITER_PIN` | **🔒 Secreta** | PIN para entrar a `/mesera`. |
| `ADMIN_SESSION_SECRET` | **🔒 Secreta** | Firma criptográfica de cookies de sesión. |

---

## 🧱 Stack tecnológico

- **TanStack Start v1** — Framework full-stack React con SSR.
- **React 19** — UI.
- **TypeScript** — Tipado estático.
- **Vite 7** — Bundler.
- **Tailwind CSS v4** — Estilos.
- **shadcn/ui + Radix** — Componentes accesibles.
- **TanStack Router** — Enrutamiento con tipado.
- **TanStack Query** — Cache y data fetching.
- **Supabase** — Base de datos PostgreSQL + Storage + Auth.
- **Cloudflare Workers** (vía Vercel Edge) — Runtime del servidor.
