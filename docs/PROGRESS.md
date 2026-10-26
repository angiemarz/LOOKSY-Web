# LOOKSY Web — Progreso

Leyenda: **Implementado** · **Probado** (unitarias/e2e en este entorno o CI) · **Publicado** (Cloudflare Pages) ·
**Verificado en dispositivo** (iPhone/Android/Windows reales, por la usuaria).

_Última actualización: 2026-10-26 — sesión 1 (inicio de la versión web, publicada)._

**URL pública:** https://looksy-web.ibmarzmichelle.workers.dev/ (Cloudflare Workers, assets estáticos, se publica desde `main`).

## Estado de verificación

| Elemento | Estado |
|---|---|
| TypeScript estricto (`tsc --noEmit`) | ✅ sin errores |
| Pruebas unitarias (Vitest) | ✅ 47/47 — parser, motor de outfits, armonía, Pinterest, collage, color, recorte de fondo, recreación, respaldos |
| Compilación de producción (Vite + PWA) | ✅ `dist/` con service worker y manifest |
| E2E (Playwright, Chromium como iPhone 13 y escritorio) | ✅ 6/6 — armario → estilista → collage → look → Pinterest → respaldo; manifest/SW; enlaces directos |
| CI en GitHub Actions | ✅ verde en el PR #1 (typecheck, 47 unitarias, build, e2e) |
| Publicación en Cloudflare | ✅ desplegada con Workers (`wrangler.jsonc`) desde `main` (merge del PR #1, `5edb9f7`) |
| iPhone real | 🟡 la usuaria confirmó que la URL abre en su teléfono; falta probar instalación y flujos completos |
| Android real / Windows real | ⏳ no probado |

> Las pruebas e2e usan Chromium emulando un iPhone; **no** sustituyen una prueba en Safari de un iPhone real
> (gestos táctiles, instalación, cámara, HEIC).

## Implementado (MVP)

- **Armario**: importar varias fotos y cámara (`capture`), editor con quitar fondo liso (flood fill local),
  recorte manual, auto encuadre, giro, color detectado en el dispositivo, atributos completos, crear/editar/duplicar/
  eliminar con confirmación, búsqueda, filtros (categoría, color, estilo, temporada, etiqueta, favoritas, disponibles),
  orden.
- **Estilista**: parser local ES/EN y motor explicable portados de la versión iOS (mismas reglas y pruebas), 3–6
  propuestas sin duplicados, "Entendí…", faltantes explicados, cambiar/añadir prenda, alternativa por tarjeta y
  global, guardar look, búsquedas de Pinterest.
- **Collages**: layout flat lay automático (1:1, 4:5, 9:16), editor táctil (1 dedo mover, 2 dedos escalar/rotar,
  sliders accesibles), capas, quitar/añadir, fondos, tarjetas limpias, exportar PNG (Compartir/descarga).
- **Inspiración**: búsquedas ES/EN desde texto/estilo/paleta, referencias (enlace y/o captura con paleta detectada),
  favoritas, notas, compartir, **Recrea este look** (3 versiones), **Inspiración vs. mi look** con criterios.
- **Mis looks**: grid con filtros, detalle, editar detalles/collage, duplicar, eliminar, colecciones, calendario
  semanal local, "usado hoy", look manual, aviso de prendas eliminadas.
- **Ajustes**: nombre, preferencias de estilo (usadas por el motor), respaldo/restauración (combinar o reemplazar,
  SHA-256, formato compatible con iOS v1), almacenamiento persistente, limpieza de imágenes huérfanas, guía de
  instalación.
- **PWA**: manifest, íconos (incl. maskable y apple-touch), service worker con aviso de actualización, offline,
  safe areas, modo oscuro, diseño mobile-first con barra inferior y barra lateral en escritorio.

## Pendientes

- [x] Repositorio `angiemarz/LOOKSY-Web` creado y PR #1 fusionado.
- [x] CI verde en GitHub Actions.
- [x] Publicación en Cloudflare Workers.
- [ ] Probar en iPhone real (Safari + instalada), Android (Chrome) y Windows (Edge/Chrome).
- [ ] Verificar la compatibilidad real de respaldos iOS ↔ web con un archivo exportado desde cada app.
- [ ] Revisión de accesibilidad con VoiceOver/TalkBack.
- [ ] Optimizar memoria del respaldo para armarios muy grandes (hoy se arma en memoria).

## Historial de commits

| Commit | Descripción |
|---|---|
| `ad18195` | chore: initialize repository |
| `cebbab8` | feat: PWA MVP |
| `cef7402` | ci: Cloudflare Workers config |
| `5edb9f7` | Merge PR #1 |

## Siguiente paso
Instalar en el iPhone (Safari → Compartir → Agregar a pantalla de inicio), agregar prendas reales y reportar
problemas de cámara, HEIC o gestos.
