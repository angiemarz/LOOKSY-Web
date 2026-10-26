import { COLORS, colorAdjective, type FashionColor } from './color'
import { CATEGORIES, OCCASIONS, STYLES, formalityLabel, type FashionStyle, type GarmentCategory, type Occasion, type OutfitSlot, type Season } from './fashion'
import { garmentColors, isHeel, type Garment } from './models'

/** A piece the user explicitly asked for ("mis jeans negros"). */
export interface ItemRequirement {
  category: GarmentCategory | null
  slot: OutfitSlot
  colors: FashionColor[]
  garmentID?: string
  requiresHeel: boolean
  phrase: string
}

export function requirementMatches(req: ItemRequirement, g: Garment): boolean {
  if (req.garmentID) return g.id === req.garmentID
  if (req.category) {
    if (g.category !== req.category) return false
  } else if (CATEGORIES[g.category].slot !== req.slot) {
    return false
  }
  if (req.requiresHeel && !isHeel(g)) return false
  if (req.colors.length === 0) return true
  return garmentColors(g).some((c) =>
    req.colors.includes(c) || req.colors.some((r) => COLORS[r].family === COLORS[c].family && COLORS[r].family !== 'multi'))
}

export type WeatherHint = 'cool' | 'warm'

export interface OutfitRequest {
  text: string
  requirements: ItemRequirement[]
  excludedCategories: GarmentCategory[]
  excludedColors: FashionColor[]
  excludeHeels: boolean
  styles: FashionStyle[]
  occasion?: Occasion
  weather?: WeatherHint
  seasons: Season[]
  formalityTarget?: number
  paletteColors: FashionColor[]
  prefersComfort: boolean
  feminine: boolean
}

export function emptyRequest(text = ''): OutfitRequest {
  return {
    text, requirements: [], excludedCategories: [], excludedColors: [], excludeHeels: false, styles: [],
    seasons: [], paletteColors: [], prefersComfort: false, feminine: false,
  }
}

/** What LOOKSY understood, shown to the user. */
export function interpretation(r: OutfitRequest): string[] {
  const lines: string[] = []
  if (r.requirements.length) lines.push('Incluir: ' + r.requirements.map((q) => q.phrase).join(', '))
  if (r.occasion) lines.push(`Ocasión: ${OCCASIONS[r.occasion].label}`)
  if (r.styles.length) lines.push('Estilo: ' + r.styles.map((s) => STYLES[s].label).join(', '))
  if (r.weather) lines.push(r.weather === 'cool' ? 'Clima fresco' : 'Clima cálido')
  if (r.paletteColors.length) lines.push('Colores: ' + r.paletteColors.map((c) => COLORS[c].label).join(', '))
  const avoid = [
    ...(r.excludeHeels ? ['tacones'] : []),
    ...[...r.excludedCategories].sort().map((c) => CATEGORIES[c].singular),
    ...[...r.excludedColors].sort().map(colorAdjective),
  ]
  if (avoid.length) lines.push('Evitar: ' + avoid.join(', '))
  if (r.prefersComfort) lines.push('Prioridad: comodidad')
  if (r.feminine) lines.push('Toque femenino')
  if (r.formalityTarget !== undefined) lines.push(`Formalidad: ${formalityLabel(r.formalityTarget)}`)
  return lines
}
