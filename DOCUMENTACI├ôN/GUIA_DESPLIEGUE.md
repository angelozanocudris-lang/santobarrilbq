# 📘 Guía completa de despliegue — Santo Barril

Esta guía está pensada para alguien con **muy pocos conocimientos de programación**. Sigue los pasos en orden, sin saltarte ninguno.

---

## 📑 Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Crear un repositorio en GitHub](#2-crear-un-repositorio-en-github)
3. [Subir este proyecto a GitHub](#3-subir-este-proyecto-a-github)
4. [Configurar Supabase](#4-configurar-supabase)
5. [Crear un proyecto en Vercel](#5-crear-un-proyecto-en-vercel)
6. [Conectar GitHub con Vercel](#6-conectar-github-con-vercel)
7. [Configurar variables de entorno en Vercel](#7-configurar-variables-de-entorno-en-vercel)
8. [Desplegar la aplicación](#8-desplegar-la-aplicación)
9. [Configurar un dominio personalizado](#9-configurar-un-dominio-personalizado)
10. [Verificar que todo funciona](#10-verificar-que-todo-funciona)
11. [Cómo actualizar el proyecto en el futuro](#11-cómo-actualizar-el-proyecto-en-el-futuro)
12. [Solución de problemas comunes](#12-solución-de-problemas-comunes)

---

## 1. Requisitos previos

Antes de empezar, instala estos programas gratuitos en tu computador:

| Programa | Para qué sirve | Enlace |
|---------|----------------|--------|
| **Git** | Subir el código a GitHub | https://git-scm.com/downloads |
| **Node.js (versión 20 o superior)** | Ejecutar el proyecto | https://nodejs.org/ |
| **Visual Studio Code** | Editar los archivos del proyecto | https://code.visualstudio.com/ |

Y crea estas cuentas (todas gratis):

- **GitHub** → https://github.com/signup
- **Vercel** → https://vercel.com/signup (inicia sesión con GitHub)
- **Supabase** → https://supabase.com/dashboard/sign-up (inicia sesión con GitHub)

✅ **Resultado esperado:** tienes Git, Node.js y VS Code instalados, y las 3 cuentas creadas.

---

## 2. Crear un repositorio en GitHub

Un "repositorio" es una carpeta en la nube donde vivirá tu código.

1. Ve a https://github.com y entra a tu cuenta.
2. Arriba a la derecha, haz clic en el botón **`+`** → **`New repository`**.
3. Llena el formulario:
   - **Repository name:** `santo-barril`
   - **Description:** *(opcional)* `App de pedidos de Santo Barril`
   - Marca **Private** (privado) — así nadie más lo verá.
   - **NO marques** "Add a README file", "Add .gitignore" ni "Choose a license". El proyecto ya los trae.
4. Haz clic en **`Create repository`**.
5. GitHub te mostrará una página con instrucciones — **déjala abierta**, la usaremos en el siguiente paso.

✅ **Resultado esperado:** tienes un repositorio vacío en `https://github.com/TU_USUARIO/santo-barril`.

---

## 3. Subir este proyecto a GitHub

1. Abre **VS Code**.
2. Arriba en el menú: **`File`** → **`Open Folder...`** y selecciona la carpeta `santo-barril` (la que descomprimiste del .zip).
3. Abre la terminal integrada: **`View`** → **`Terminal`** (o `Ctrl + Ñ`).
4. Copia y pega cada comando, uno a uno, presionando **Enter** después de cada uno.

   > 🔁 En el cuarto comando, **reemplaza** `TU_USUARIO` por tu nombre de usuario real de GitHub.

   ```bash
   git init
   git add .
   git commit -m "Primer commit: proyecto Santo Barril"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/santo-barril.git
   git push -u origin main
   ```

5. Si te pide usuario y contraseña, usa tu usuario de GitHub y un **Personal Access Token** (no la contraseña). Crea uno aquí: https://github.com/settings/tokens → **Generate new token (classic)** → marca el permiso `repo` → cópialo y úsalo como contraseña.

6. Recarga la página de tu repositorio en GitHub. Ahora deberías ver todos los archivos.

✅ **Resultado esperado:** los archivos del proyecto aparecen en `https://github.com/TU_USUARIO/santo-barril`.

---

## 4. Configurar Supabase

Supabase es la base de datos y el sistema de autenticación.

### 4.1 Crear el proyecto

1. Ve a https://supabase.com/dashboard y haz clic en **`New project`**.
2. Llena:
   - **Name:** `santo-barril`
   - **Database Password:** crea una contraseña segura y **guárdala bien**.
   - **Region:** elige la más cercana (ej. `South America (São Paulo)`).
3. Haz clic en **`Create new project`** y espera ~2 minutos a que termine de crearse.

### 4.2 Aplicar las migraciones SQL

Las migraciones crean las tablas (`products`, `orders`, etc.).

1. En el menú lateral izquierdo de Supabase, haz clic en **`SQL Editor`**.
2. Abre la carpeta `supabase/migrations/` del proyecto en VS Code.
3. Verás archivos como `20260428175427_xxx.sql`. **Ábrelos por orden alfabético** (el número al inicio es la fecha).
4. Para cada archivo:
   - Copia **todo su contenido**.
   - Pégalo en el SQL Editor de Supabase.
   - Haz clic en **`Run`** (botón verde abajo a la derecha).
   - Espera a ver `Success. No rows returned`.
   - Pasa al siguiente archivo.

### 4.3 Copiar las credenciales

1. En Supabase, ve a **`Project Settings`** (engranaje abajo a la izquierda) → **`API`**.
2. Anota estos 3 valores (los usarás más adelante):

   | Etiqueta en Supabase | Variable en tu proyecto |
   |---|---|
   | **Project URL** | `VITE_SUPABASE_URL` y `SUPABASE_URL` |
   | **Project API Key → `anon` `public`** | `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_PUBLISHABLE_KEY` |
   | **Project API Key → `service_role` `secret`** ⚠️ | `SUPABASE_SERVICE_ROLE_KEY` |
   | **Reference ID** (en la URL del dashboard) | `VITE_SUPABASE_PROJECT_ID` y `SUPABASE_PROJECT_ID` |

   ⚠️ **`service_role`** es ultra-secreta. NUNCA la subas a GitHub ni la compartas.

### 4.4 Crear el bucket de imágenes

1. En el menú lateral → **`Storage`** → **`New bucket`**.
2. Nombre: `product-images`. Marca **`Public bucket`**. Crear.

✅ **Resultado esperado:** Supabase listo con tablas, credenciales anotadas y bucket creado.

---

## 5. Crear un proyecto en Vercel

Vercel es donde se publicará tu aplicación.

1. Ve a https://vercel.com/dashboard.
2. Haz clic en **`Add New...`** → **`Project`**.
3. Si es la primera vez, te pedirá conectar tu cuenta de GitHub: acéptalo y dale permiso a Vercel.

---

## 6. Conectar GitHub con Vercel

1. En la página "Import Git Repository", busca `santo-barril` y haz clic en **`Import`**.
2. **Framework Preset:** Vercel detecta **`TanStack Start`** automáticamente. Si no, elige `Other`.
3. **Build & Output Settings:** deja los valores por defecto:
   - Build Command: `npm run build`
   - Output Directory: *(en blanco)*
   - Install Command: `npm install`
4. **NO hagas clic en Deploy todavía** — primero configura las variables de entorno (siguiente paso).

---

## 7. Configurar variables de entorno en Vercel

1. En la misma pantalla de importación, abre la sección **`Environment Variables`**.
2. Agrega una por una las siguientes variables (mira `.env.example` para la lista completa):

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | (Project URL de Supabase) |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | (anon key) |
   | `VITE_SUPABASE_PROJECT_ID` | (Reference ID) |
   | `SUPABASE_URL` | (igual a la de arriba) |
   | `SUPABASE_PUBLISHABLE_KEY` | (igual a la anon) |
   | `SUPABASE_PROJECT_ID` | (igual al Reference ID) |
   | `SUPABASE_SERVICE_ROLE_KEY` | (service_role secreta) |
   | `ADMIN_PIN` | (4-8 dígitos, ej: `4521`) |
   | `WAITER_PIN` | (4-8 dígitos, ej: `8830`) |
   | `ADMIN_SESSION_SECRET` | una cadena aleatoria larga. Genera una con: `openssl rand -hex 32` en la terminal, o usa https://www.random.org/strings/ |

3. Para cada una: nombre → valor → **Add**.

---

## 8. Desplegar la aplicación

1. Haz clic en el botón **`Deploy`** (abajo en la pantalla de Vercel).
2. Espera 2-4 minutos. Verás logs de construcción.
3. Cuando termine, verás 🎉 fuegos artificiales y un enlace tipo `santo-barril-xxxxx.vercel.app`.
4. Haz clic en el enlace — ¡tu app está en vivo!

✅ **Resultado esperado:** la app abre en el navegador y muestra la portada de Santo Barril.

---

## 9. Configurar un dominio personalizado

Si tienes un dominio propio (ej. `santobarril.com`):

1. En Vercel, abre tu proyecto → pestaña **`Settings`** → **`Domains`**.
2. Escribe tu dominio (`santobarril.com`) y haz clic en **`Add`**.
3. Vercel te dará instrucciones según tu proveedor del dominio (GoDaddy, Namecheap, etc.). Generalmente debes agregar:
   - Un registro **A** apuntando a `76.76.21.21`
   - Un registro **CNAME** `www` apuntando a `cname.vercel-dns.com`
4. Entra al panel de tu proveedor de dominio, agrega esos registros DNS y guarda.
5. Vuelve a Vercel y espera (puede tardar de 10 minutos a varias horas). Cuando aparezca un ✅ verde, listo.

---

## 10. Verificar que todo funciona

Visita tu URL y comprueba:

- [ ] La portada carga sin errores.
- [ ] `/menu` muestra los productos.
- [ ] Puedes agregar items al carrito.
- [ ] `/checkout` te lleva a WhatsApp con el pedido.
- [ ] `/admin` te pide el PIN y, con el correcto, entra al panel.
- [ ] `/mesera` igual con su PIN.
- [ ] En el admin, puedes crear/editar productos y ver pedidos.

Si algo falla, ve a la sección **[12. Solución de problemas](#12-solución-de-problemas-comunes)**.

---

## 11. Cómo actualizar el proyecto en el futuro

Cada vez que hagas cambios al código:

1. En VS Code, edita lo que necesites.
2. En la terminal:
   ```bash
   git add .
   git commit -m "Describe brevemente el cambio"
   git push
   ```
3. Vercel detectará el cambio automáticamente y desplegará la nueva versión en 1-3 minutos.

📌 Para ver el progreso: https://vercel.com/dashboard → tu proyecto → pestaña **`Deployments`**.

---

## 12. Solución de problemas comunes

### ❌ "Failed to fetch" o pantalla en blanco
- Revisa en Vercel → Settings → Environment Variables que **todas** estén llenas.
- Después de cambiar variables, debes **redespegar**: pestaña Deployments → los tres puntos del último → **Redeploy**.

### ❌ "Invalid PIN" al entrar a /admin
- Verifica que `ADMIN_PIN` esté configurado en Vercel y que sea el que estás escribiendo.

### ❌ Los productos no aparecen
- Revisa que aplicaste **todas** las migraciones SQL en Supabase (sección 4.2).
- En Supabase → Table Editor → tabla `products`, debe haber filas con `available = true`.

### ❌ Las imágenes de productos no cargan
- Verifica que el bucket `product-images` exista en Supabase Storage y sea **público**.

### ❌ El build de Vercel falla
- Abre el log del deploy en Vercel y busca la línea en rojo.
- Causa común: olvidaste alguna variable de entorno o un valor está mal pegado (con espacios al inicio/fin).

### ❌ "git push" pide contraseña y falla
- GitHub ya no acepta contraseñas. Usa un **Personal Access Token**: https://github.com/settings/tokens (ver paso 3).

---

## 🆘 ¿Necesitas más ayuda?

- Documentación TanStack Start: https://tanstack.com/start
- Documentación Supabase: https://supabase.com/docs
- Documentación Vercel: https://vercel.com/docs
