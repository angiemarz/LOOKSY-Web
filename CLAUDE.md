# CLAUDE.md — LOOKSY Web (PWA)

Lee este archivo y `docs/PROGRESS.md` antes de trabajar. Cuando la usuaria diga **"Continúa LOOKSY"**:
inspecciona el repositorio, revisa el último estado de CI y de Cloudflare Pages, y retoma desde el último
avance **verificado**. No repitas trabajo ni reemplaces algo que funciona por un prototipo.

## 1. Objetivo

LOOKSY es un armario digital y estilista personal en español, como **PWA instalable** (iPhone vía Safari, Android y
Windows vía Chrome/Edge), mobile-first y con diseño premium. Funciones: armario con fotos reales, estilista de
outfits en lenguaje natural, collages editables, inspiración auténtica de Pinterest, "Recrea este look",
comparación, looks, favoritos, colecciones, calendario y respaldos.

La versión nativa SwiftUI vive en **otro repositorio** (`angiemarz/LOOKSY-iOS`) y no se toca desde aquí.

## 2. Restricciones (no negociables)

- Costo cero: sin APIs de pago ni obligatorias, sin backend, sin cuentas, sin servicios de IA remotos.
- Hosting gratuito en **Cloudflare** (Workers con assets estáticos vía `wrangler.jsonc`, o Pages) con integración Git (publica `main`). Sin código de servidor, KV, D1 ni R2.
- Sin scraping ni endpoints privados de Pinterest; solo URLs públicas de búsqueda. Nunca inventar pines,
  resultados, análisis ni porcentajes. Si solo hay una URL, no afirmar que se analizó la imagen.
- Datos solo en el dispositivo (IndexedDB). Las fotos nunca se suben. Nada de datos personales en logs.
- Ninguna funcionalidad simulada: toda acción visible funciona o indica claramente que está pendiente.

## 3. Stack

React 19 · TypeScript (estricto) · Vite 7 · Tailwind CSS 4 · Dexie 4 (IndexedDB) · vite-plugin-pwa (Workbox) ·
lucide-react · Fraunces (fuente incluida, sin CDN) · Vitest + fake-indexeddb · Playwright (e2e).
Versiones fijadas exactas en `package.json`; Node 22 (`.nvmrc`).

## 4. Arquitectura

```
src/
  domain/      Lógica pura y testeable (sin DOM): fashion (categorías, estilos, ocasiones…), color (Lab, paleta,
               análisis de píxeles), models, normalize, grammar (concordancia ES), lexicon, parser (lenguaje
               natural local), request, harmony, recommend (motor + ScoringContext), collage (layout flat lay),
               pinterest (consultas ES/EN), recreation (Recrea este look + criterios), segmentation (fondo liso)
  db/          Dexie: garments, looks, collections, plans, references, images (Blobs), settings
  services/    images (canvas: decodificar, redimensionar, girar, recortar, color, fondo), wardrobe, looks,
               collageRender (carga de piezas, render PNG, compartir/descargar), backup
  state/       preferencias (live query), toasts, cola de importación
  ui/          Layout (tabs/barra lateral, PageHeader, aviso de actualización), primitives, cards, CollageCanvas,
               CollageEditor (gestos), CropTool, GarmentPicker, PinterestList, CriteriaList, TagInput
  pages/       Home, Wardrobe, GarmentEditor, GarmentDetail, Stylist, Inspiration, ReferenceForm/Detail,
               Recreate, Compare, Looks (+colecciones, calendario), LookDetail, Collection, ManualLook,
               Settings, Preferences, Backup, Install
tests/         Vitest (dominio + respaldo con fake-indexeddb)
e2e/           Playwright sobre `vite preview` (iPhone 13 emulado + escritorio)
```

### Decisiones clave
- Los valores crudos (categorías, colores, estilos…) son **idénticos a los de iOS**; el respaldo usa el mismo
  formato `LOOKSY-backup` v1 (fechas ISO sin milisegundos, IDs UUID en mayúsculas, fotos base64 + SHA-256).
- Relaciones por ID (no claves foráneas): si se borra una prenda, los looks conservan el ID y muestran aviso.
- Imágenes como Blobs en la tabla `images` con IDs tipo nombre de archivo (`<uuid>-orig-xxx.jpg`).
- El motor es determinista; las alternativas usan `variationSeed` y excluyen firmas ya mostradas.
- Collages: geometría normalizada (0…1); la vista HTML y el render canvas usan las mismas fórmulas.
- Rutas con `BrowserRouter`; Cloudflare Pages sirve `index.html` para rutas desconocidas (SPA).
- `public/_headers` define CSP estricta (solo `self`, `blob:`, `data:` para imágenes).

## 5. Convenciones

- UI 100 % en español; código y comentarios técnicos en inglés.
- Tokens de color en `src/styles.css` (`--lx-*`, modo oscuro incluido); usa clases `bg-surface`, `text-ink`,
  `text-accent`, `card`, etc. Paleta: rosa #D8A7B1, beige #E8DDD0, crema #F5EFE8, blanco cálido #FAF8F5,
  texto #292522, acento accesible #A35E6E.
- Accesibilidad: `aria-label` en botones de ícono, objetivos táctiles ≥44 px, `input` de 16 px (evita zoom en iOS),
  `prefers-reduced-motion`.
- Confirmar antes de borrar. Lógica nueva en `domain/` o `services/` con pruebas.

## 6. Verificación antes de cada commit

```bash
npm run typecheck && npm test && npm run build
PW_CHROMIUM_PATH=<chromium local opcional> npm run test:e2e
```
En el contenedor de Claude Code hay Chromium en `/opt/pw-browsers/chromium-*/chrome-linux64/chrome`.

## 7. Git y publicación

- Conventional Commits. Nunca `push --force` ni reescribir historia; nunca merge a `main` sin aprobación.
- Trabajo en ramas `claude/...` → Pull Request a `main` → CI verde → aprobación → Cloudflare publica `main`.
- PR con: funcionalidades, archivos, pruebas ejecutadas, pendientes, estado de compilación y cómo verificar.

## 8. Continuidad

Al terminar cada sesión: actualizar `docs/PROGRESS.md` (implementado / probado / publicado / verificado en
dispositivo), este archivo si cambió la arquitectura, commit y push, y reportar hashes, CI y siguiente paso.
