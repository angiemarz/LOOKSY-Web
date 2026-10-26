# LOOKSY Web

Armario digital y estilista personal como **aplicación web progresiva (PWA)**: funciona en iPhone, Android y Windows,
se instala desde Safari, Chrome o Edge, y guarda todo **solo en tu dispositivo**.

- 📸 **Mi armario**: importa varias fotos o usa la cámara; el color se mide en el dispositivo; quita fondos lisos,
  recorta, encuadra y gira; filtra, busca, ordena, marca favoritas y disponibilidad.
- ✨ **Crear outfit**: escribe lo que necesitas ("algo casual con mis jeans negros para un café") y LOOKSY combina
  prendas **reales** de tu armario con reglas explicables (estilo, ocasión, formalidad, clima, armonía de color,
  preferencias). Cambia prendas, pide alternativas y guarda looks.
- 🧩 **Collages flat lay** editables con los dedos (mover, pellizcar, rotar, capas, fondos, 1:1 · 4:5 · 9:16) y
  exportables en PNG (menú Compartir → Guardar imagen en iPhone, o descarga).
- 📌 **Inspiración**: búsquedas auténticas de Pinterest en español e inglés (sin scraping), referencias guardadas,
  **Recrea este look** y **Inspiración vs. mi look** con criterios explicables.
- 🗓 **Mis looks**: favoritos, colecciones y calendario semanal local.
- 🔒 **Privacidad y respaldos**: IndexedDB local, sin cuentas ni servidores; respaldo `.json` con verificación SHA-256,
  compatible con la versión iOS de LOOKSY.

## Desarrollo

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # pruebas unitarias (Vitest)
npm run build        # compilación de producción en dist/
npm run test:e2e     # pruebas de extremo a extremo (Playwright) sobre la compilación
```

Requisitos: Node.js 22 (ver `.nvmrc`).

## Publicación gratuita

Cloudflare Pages compila y publica automáticamente cada cambio aprobado en `main`.
Guía paso a paso: [`docs/DEPLOY_CLOUDFLARE.md`](docs/DEPLOY_CLOUDFLARE.md).

## Documentación

- [`CLAUDE.md`](CLAUDE.md): arquitectura, reglas y continuidad entre sesiones.
- [`docs/PROGRESS.md`](docs/PROGRESS.md): estado verificado y pendientes.
- [`docs/DEPLOY_CLOUDFLARE.md`](docs/DEPLOY_CLOUDFLARE.md): publicación y dominio.
- La versión nativa SwiftUI vive en el repositorio independiente `angiemarz/LOOKSY-iOS`.
