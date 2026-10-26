// Color math and the named garment palette (same raw values as the iOS app).

export interface RGB { r: number; g: number; b: number } // 0...1

export function rgbFromInt(value: number): RGB {
  return { r: ((value >> 16) & 0xff) / 255, g: ((value >> 8) & 0xff) / 255, b: (value & 0xff) / 255 }
}

export function rgbFromHex(hex: string): RGB | null {
  const clean = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  return rgbFromInt(parseInt(clean, 16))
}

export function hexFromRgb({ r, g, b }: RGB): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0').toUpperCase()
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Hue in degrees [0, 360), saturation and lightness in [0, 1]. */
export function hsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d < 0.0001) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = 60 * (((g - b) / d) % 6)
  else if (max === g) h = 60 * ((b - r) / d + 2)
  else h = 60 * ((r - g) / d + 4)
  if (h < 0) h += 360
  return { h, s: Math.min(s, 1), l }
}

/** CIE L*a*b* (D65). */
export function lab({ r, g, b }: RGB): [number, number, number] {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const R = lin(r), G = lin(g), B = lin(b)
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function colorDistance(a: RGB, b: RGB): number {
  const [l1, a1, b1] = lab(a)
  const [l2, a2, b2] = lab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

export type ColorFamily = 'black' | 'white' | 'gray' | 'brown' | 'blue' | 'green' | 'red' | 'pink' | 'purple' | 'yellow' | 'orange' | 'multi'

export type FashionColor =
  | 'negro' | 'blanco' | 'gris' | 'crema' | 'beige' | 'camel' | 'cafe' | 'mezclilla' | 'azulMarino' | 'azul'
  | 'celeste' | 'verde' | 'oliva' | 'menta' | 'rojo' | 'vino' | 'rosa' | 'rosaPalo' | 'fucsia' | 'morado'
  | 'lila' | 'amarillo' | 'mostaza' | 'naranja' | 'coral' | 'dorado' | 'plateado' | 'multicolor'

interface ColorInfo { label: string; en: string; value: number; neutral: boolean; family: ColorFamily }

export const COLORS: Record<FashionColor, ColorInfo> = {
  negro: { label: 'Negro', en: 'black', value: 0x1c1c1e, neutral: true, family: 'black' },
  blanco: { label: 'Blanco', en: 'white', value: 0xf7f7f5, neutral: true, family: 'white' },
  gris: { label: 'Gris', en: 'gray', value: 0x8e8e93, neutral: true, family: 'gray' },
  crema: { label: 'Crema', en: 'cream', value: 0xf1e6d2, neutral: true, family: 'white' },
  beige: { label: 'Beige', en: 'beige', value: 0xd9c6a5, neutral: true, family: 'brown' },
  camel: { label: 'Camel', en: 'camel', value: 0xb48a5a, neutral: true, family: 'brown' },
  cafe: { label: 'Café', en: 'brown', value: 0x6f4e37, neutral: true, family: 'brown' },
  mezclilla: { label: 'Mezclilla', en: 'denim blue', value: 0x4a6a8f, neutral: true, family: 'blue' },
  azulMarino: { label: 'Azul marino', en: 'navy', value: 0x1f2a44, neutral: true, family: 'blue' },
  azul: { label: 'Azul', en: 'blue', value: 0x2e64c8, neutral: false, family: 'blue' },
  celeste: { label: 'Celeste', en: 'light blue', value: 0x9cc7e8, neutral: false, family: 'blue' },
  verde: { label: 'Verde', en: 'green', value: 0x3a8f5c, neutral: false, family: 'green' },
  oliva: { label: 'Verde oliva', en: 'olive', value: 0x6b7340, neutral: false, family: 'green' },
  menta: { label: 'Menta', en: 'mint', value: 0xa8dcc4, neutral: false, family: 'green' },
  rojo: { label: 'Rojo', en: 'red', value: 0xc62828, neutral: false, family: 'red' },
  vino: { label: 'Vino', en: 'burgundy', value: 0x6d1a2c, neutral: false, family: 'red' },
  rosa: { label: 'Rosa', en: 'pink', value: 0xe58fae, neutral: false, family: 'pink' },
  rosaPalo: { label: 'Rosa palo', en: 'blush pink', value: 0xe8c3c8, neutral: false, family: 'pink' },
  fucsia: { label: 'Fucsia', en: 'fuchsia', value: 0xd0217a, neutral: false, family: 'pink' },
  morado: { label: 'Morado', en: 'purple', value: 0x6a3d9a, neutral: false, family: 'purple' },
  lila: { label: 'Lila', en: 'lilac', value: 0xc3a8db, neutral: false, family: 'purple' },
  amarillo: { label: 'Amarillo', en: 'yellow', value: 0xf2d23c, neutral: false, family: 'yellow' },
  mostaza: { label: 'Mostaza', en: 'mustard', value: 0xc9a227, neutral: false, family: 'yellow' },
  naranja: { label: 'Naranja', en: 'orange', value: 0xe8772e, neutral: false, family: 'orange' },
  coral: { label: 'Coral', en: 'coral', value: 0xf08070, neutral: false, family: 'pink' },
  dorado: { label: 'Dorado', en: 'gold', value: 0xc9a74a, neutral: true, family: 'brown' },
  plateado: { label: 'Plateado', en: 'silver', value: 0xc0c0c8, neutral: true, family: 'gray' },
  multicolor: { label: 'Multicolor', en: 'colorful', value: 0x9b7fb5, neutral: false, family: 'multi' },
}
export const COLOR_LIST = Object.keys(COLORS) as FashionColor[]

export const colorRgb = (c: FashionColor): RGB => rgbFromInt(COLORS[c].value)
export const colorHex = (c: FashionColor): string => hexFromRgb(colorRgb(c))
export const colorAdjective = (c: FashionColor): string => COLORS[c].label.toLowerCase()
export const isNeutral = (c: FashionColor): boolean => COLORS[c].neutral

/** Hue for harmony rules (null for neutrals and multicolor). */
export function colorHue(c: FashionColor): number | null {
  if (COLORS[c].neutral || c === 'multicolor') return null
  return hsl(colorRgb(c)).h
}

/** Nearest named color for a measured value (perceptual distance). */
export function nearestColor(rgb: RGB): FashionColor {
  let best: FashionColor = 'gris'
  let bestDistance = Infinity
  for (const c of COLOR_LIST) {
    if (c === 'multicolor') continue
    const d = colorDistance(colorRgb(c), rgb)
    if (d < bestDistance) {
      bestDistance = d
      best = c
    }
  }
  return best
}

export interface ColorEntry { color: FashionColor; share: number; averageHex: string }

/**
 * Dominant colors of a square RGBA pixel buffer (side × side).
 * Transparent pixels are ignored; for opaque photos only the central area is
 * analyzed and pixels similar to the border (likely background) are skipped.
 */
export function analyzePixels(data: Uint8ClampedArray, side: number): ColorEntry[] {
  // Canvas ImageData is not premultiplied.
  const px = (i: number): RGB => ({ r: data[i * 4]! / 255, g: data[i * 4 + 1]! / 255, b: data[i * 4 + 2]! / 255 })
  const alpha = (i: number) => data[i * 4 + 3]! / 255
  let transparent = 0
  for (let i = 0; i < side * side; i++) if (alpha(i) < 0.5) transparent++
  const hasAlpha = transparent > side

  let candidates: RGB[] = []
  if (hasAlpha) {
    for (let i = 0; i < side * side; i++) if (alpha(i) > 0.5) candidates.push(px(i))
  } else {
    const border: RGB[] = []
    for (let y = 0; y < side; y++)
      for (let x = 0; x < side; x++)
        if (x === 0 || y === 0 || x === side - 1 || y === side - 1) border.push(px(y * side + x))
    const background = average(border)
    const inset = Math.floor(side / 6)
    const center: RGB[] = []
    for (let y = inset; y < side - inset; y++)
      for (let x = inset; x < side - inset; x++) {
        const c = px(y * side + x)
        center.push(c)
        if (background && colorDistance(c, background) < 12) continue
        candidates.push(c)
      }
    if (candidates.length < 40) candidates = center
  }
  if (candidates.length === 0) return []

  const buckets = new Map<FashionColor, RGB[]>()
  for (const c of candidates) {
    const key = nearestColor(c)
    const list = buckets.get(key)
    if (list) list.push(c)
    else buckets.set(key, [c])
  }
  return [...buckets.entries()]
    .map(([color, values]) => ({ color, share: values.length / candidates.length, averageHex: hexFromRgb(average(values)!) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 4)
}

/** Secondary colors that cover a meaningful part of the garment. */
export function secondaryColors(entries: ColorEntry[]): FashionColor[] {
  return entries.slice(1).filter((e) => e.share >= 0.12).slice(0, 2).map((e) => e.color)
}

function average(colors: RGB[]): RGB | null {
  if (colors.length === 0) return null
  let r = 0, g = 0, b = 0
  for (const c of colors) { r += c.r; g += c.g; b += c.b }
  return { r: r / colors.length, g: g / colors.length, b: b / colors.length }
}
