# Publicar LOOKSY Web gratis en Cloudflare Pages

LOOKSY es un sitio estático (HTML, JS, CSS e íconos). No necesita servidor, base de datos ni claves de API:
cada persona guarda sus datos en su propio navegador. Cloudflare Pages lo publica gratis con HTTPS
(requisito para instalar una PWA) y lo actualiza solo cuando cambia la rama `main`.

> Los nombres de los menús de Cloudflare cambian con el tiempo. Si algo no coincide, busca la opción
> equivalente en **Workers & Pages** y la documentación oficial: https://developers.cloudflare.com/pages/

## 1. Requisitos

- Cuenta gratuita de Cloudflare (no requiere tarjeta para Pages).
- El repositorio `angiemarz/LOOKSY-Web` en GitHub.

## 2. Conectar el repositorio (una sola vez)

1. Entra a https://dash.cloudflare.com → **Workers & Pages** → **Create** → pestaña **Pages** →
   **Connect to Git**.
2. Autoriza a Cloudflare en GitHub **solo** para el repositorio `LOOKSY-Web`.
3. Configuración de compilación:

   | Campo | Valor |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `None` (o `React (Vite)`) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(vacío)* |
   | Variable de entorno | `NODE_VERSION` = `22` |

4. **Save and Deploy**. Al terminar tendrás una dirección como `https://looksy-web.pages.dev`.

## 3. Cómo se actualiza

- Cada merge (PR aprobado) a `main` → Cloudflare compila y publica la nueva versión automáticamente.
- Las ramas y Pull Requests generan **vistas previas** con su propia URL (útil para revisar antes de aprobar).
  Para ahorrar compilaciones del plan gratuito puedes limitarlas en
  *Settings → Builds & deployments → Preview branches*.
- En el dispositivo, LOOKSY detecta la versión nueva y muestra **"Hay una nueva versión de LOOKSY · Actualizar"**.
  Los datos locales **no se borran** al actualizar.

## 4. Lo que ya está configurado en el repositorio

- `public/_headers`: cabeceras de seguridad (CSP estricta: solo recursos propios; las fotos nunca salen del
  dispositivo), y caché correcta para `sw.js` y los archivos con hash.
- Rutas de la app (`/armario`, `/looks/...`): Cloudflare Pages sirve `index.html` en cualquier ruta cuando el sitio
  no tiene `404.html` (modo SPA), así que los enlaces directos funcionan. Lo comprueban las pruebas e2e.
- `.github/workflows/ci.yml`: pruebas y compilación en cada PR (GitHub Actions gratuito, sin secretos).

## 5. Límites del plan gratuito (consulta los vigentes en Cloudflare)

- Ancho de banda y solicitudes para sitios estáticos: sin cargo.
- Compilaciones por mes limitadas (del orden de 500) y una compilación simultánea.
- LOOKSY no usa Functions, KV, D1 ni R2: no hay consumo de servicios de pago.

## 6. Dominio propio (opcional)

*Custom domains* → añade tu dominio. No es necesario: `*.pages.dev` ya tiene HTTPS.

## 7. Instalar la app

Una vez publicada, abre la URL y sigue **Ajustes → Instalar LOOKSY en tu dispositivo** (iPhone: Safari →
Compartir → Agregar a pantalla de inicio; Android/Windows: Instalar app en Chrome o Edge).

> En iPhone, usa siempre LOOKSY desde el ícono de la pantalla de inicio: Safari puede borrar los datos de sitios
> web que no se visitan en varios días, pero no los de apps web agregadas a la pantalla de inicio. Haz respaldos
> periódicos en **Ajustes → Respaldo**.
