import { COLORS, isNeutral, type FashionColor } from './color'
import {
  CATEGORIES, OCCASIONS, SEASONS, SLOTS, STYLES, formalityLabel,
  type FashionStyle, type GarmentCategory, type Occasion, type OutfitSlot,
} from './fashion'
import { evaluateHarmony } from './harmony'
import { garmentColors, isHeel, defaultPreferences, type Garment, type UserPreferences } from './models'
import { emptyRequest, requirementMatches, type OutfitRequest } from './request'

/** One proposed outfit. Every item is a real garment from the wardrobe. */
export interface OutfitSuggestion {
  id: string
  name: string
  items: Garment[]
  style?: FashionStyle
  occasion?: Occasion
  reasons: string[]
  warnings: string[]
  score: number
}

export interface RecommendationResult {
  suggestions: OutfitSuggestion[]
  missing: string[]
  request: OutfitRequest
}

export const CORE_SLOTS: OutfitSlot[] = ['top', 'bottom', 'onePiece', 'shoes']
export const slotOf = (g: Garment): OutfitSlot => CATEGORIES[g.category].slot
export const signature = (items: Garment[]): string => items.map((g) => g.id).sort().join('|')
const nameOf = (g: Garment) => g.name || CATEGORIES[g.category].singular

let counter = 0
const nextID = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`

/** Scoring rules. Each component is explainable. */
export class ScoringContext {
  constructor(readonly request: OutfitRequest, readonly preferences: UserPreferences, readonly seed = 0) {}

  get targetStyles(): Set<FashionStyle> {
    if (this.request.styles.length) return new Set(this.request.styles)
    if (this.request.occasion) return new Set(OCCASIONS[this.request.occasion].styles)
    return new Set(this.preferences.favoriteStyles)
  }

  get targetFormality(): number {
    if (this.request.formalityTarget !== undefined) return this.request.formalityTarget
    const values: number[] = []
    if (this.request.occasion) values.push(OCCASIONS[this.request.occasion].formality)
    if (this.request.styles.length)
      values.push(this.request.styles.reduce((sum, s) => sum + STYLES[s].formality, 0) / this.request.styles.length)
    if (values.length === 0) return this.preferences.usualFormality
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  get requestedColors(): Set<FashionColor> {
    return new Set([...this.request.requirements.flatMap((r) => r.colors), ...this.request.paletteColors])
  }

  get prefersComfort(): boolean {
    return this.request.prefersComfort || this.preferences.comfortLevel <= 2
  }

  itemScore(g: Garment): number {
    let score = 0
    const styles = new Set(g.styles)
    const targets = this.targetStyles
    if (targets.size && styles.size) {
      const related = new Set([...targets].flatMap((t) => STYLES[t].related))
      if ([...styles].some((s) => targets.has(s))) score += 3
      else if ([...styles].some((s) => related.has(s))) score += 1.5
      else score -= 1
    }
    if (g.styles.some((s) => this.preferences.favoriteStyles.includes(s))) score += 1

    const occasion = this.request.occasion
    if (occasion && g.occasions.length) score += g.occasions.includes(occasion) ? 2 : -0.5

    const slot = slotOf(g)
    const weight = slot === 'bag' || slot === 'accessory' ? 0.5 : 1.2
    score -= Math.abs(g.formality - this.targetFormality) * weight

    if (this.request.seasons.length && g.seasons.length) {
      score += g.seasons.some((s) => this.request.seasons.includes(s)) ? 1 : -2
    } else if (!this.request.seasons.length && this.preferences.seasons.length && g.seasons.length) {
      score += g.seasons.some((s) => this.preferences.seasons.includes(s)) ? 0.3 : -0.5
    }

    const c = g.category
    if (this.request.weather === 'cool') {
      if ((['sueteres', 'chamarras', 'abrigos', 'jeans', 'pantalones'] as GarmentCategory[]).includes(c)) score += 1
      if (c === 'shorts' || c === 'sandalias') score -= 3
    } else if (this.request.weather === 'warm') {
      if (c === 'sueteres' || c === 'abrigos') score -= 2.5
      if ((['shorts', 'sandalias', 'vestidos', 'faldas', 'tops'] as GarmentCategory[]).includes(c)) score += 1
    }

    const colors = garmentColors(g)
    const requested = this.requestedColors
    const isRequested = colors.some((x) => requested.has(x))
    if (isRequested) score += 2
    if (colors.some((x) => this.preferences.favoriteColors.includes(x))) score += 1
    if (colors.some((x) => this.preferences.avoidedColors.includes(x)) && !isRequested) score -= 4

    if (this.prefersComfort) {
      if (c === 'tenis' || c === 'sandalias') score += 1.5
      if (isHeel(g)) score -= 3
    }
    if (this.preferences.preferredShoes.includes(c)) score += 1
    if (g.isFavorite || this.preferences.favoriteGarmentIDs.includes(g.id)) score += 0.7
    if (this.preferences.silhouettePreferences.includes(g.silhouette)) score += 0.5
    if (this.request.feminine) {
      if ((['blusas', 'faldas', 'vestidos', 'tops'] as GarmentCategory[]).includes(c)) score += 1
      if (COLORS[g.primaryColor].family === 'pink') score += 0.5
    }
    if (g.wearCount === 0) score += 0.3
    return score + this.jitter(g.id)
  }

  outfitScore(items: Garment[]): number {
    let score = items.reduce((sum, g) => sum + this.itemScore(g), 0)
    const main = items.filter((g) => slotOf(g) !== 'bag' && slotOf(g) !== 'accessory')
    score += evaluateHarmony(main.map((g) => g.primaryColor)).score * 1.5
    if (main.filter((g) => g.pattern !== 'liso').length >= 2) score -= 2.5
    if (main.length) {
      const f = main.map((g) => g.formality)
      const spread = Math.max(...f) - Math.min(...f)
      if (spread >= 3) score -= 3
      else if (spread === 2) score -= 1
    }
    const styleSets = main.map((g) => new Set(g.styles)).filter((s) => s.size)
    if (styleSets.length >= 2) {
      const shared = [...styleSets[0]!].filter((s) => styleSets.every((set) => set.has(s)))
      if (shared.length) score += 1.5
    }
    const accents = new Set(main.map((g) => g.primaryColor).filter((c) => !isNeutral(c)))
    for (const comp of items) {
      const s = slotOf(comp)
      if (s !== 'bag' && s !== 'accessory') continue
      if (isNeutral(comp.primaryColor) || accents.has(comp.primaryColor)) score += 0.8
      else if (accents.size) score -= 1
    }
    return score
  }

  dominantStyle(items: Garment[]): FashionStyle {
    const counts = new Map<FashionStyle, number>()
    for (const g of items) for (const s of g.styles) counts.set(s, (counts.get(s) ?? 0) + 1)
    const requested = this.request.styles
    const best = [...requested].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0]
    if (best && counts.has(best)) return best
    if (requested[0]) return requested[0]
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    if (top) return top[0]
    const avg = items.length ? items.reduce((s, g) => s + g.formality, 0) / items.length : 2
    return avg < 2.5 ? 'casual' : avg < 3.5 ? 'casualChic' : 'elegante'
  }

  explanation(items: Garment[], style: FashionStyle | undefined): { reasons: string[]; warnings: string[] } {
    const reasons: string[] = []
    const warnings: string[] = []
    const main = items.filter((g) => slotOf(g) !== 'bag' && slotOf(g) !== 'accessory')
    for (const req of this.request.requirements) {
      const item = items.find((g) => requirementMatches(req, g))
      if (item) reasons.push(`Incluye ${item.name || req.phrase}, como pediste.`)
    }
    const harmony = evaluateHarmony(main.map((g) => g.primaryColor))
    if (harmony.score < 0) warnings.push(harmony.description)
    else reasons.push(harmony.description)

    if (style) {
      if (this.targetStyles.has(style)) reasons.push(`Estilo ${STYLES[style].label.toLowerCase()}, acorde a lo que buscas.`)
      else reasons.push(`Las prendas comparten un aire ${STYLES[style].label.toLowerCase()}.`)
    }
    if (this.request.occasion) reasons.push(`Pensado para: ${OCCASIONS[this.request.occasion].label.toLowerCase()}.`)

    if (main.length) {
      const f = main.map((g) => g.formality)
      const spread = Math.max(...f) - Math.min(...f)
      if (spread <= 1) {
        const avg = Math.round(f.reduce((a, b) => a + b, 0) / f.length)
        reasons.push(`Todas las prendas tienen una formalidad similar (${formalityLabel(avg).toLowerCase()}).`)
      } else if (spread >= 3) warnings.push('Mezcla prendas muy casuales con otras muy formales.')
    }
    const patterned = main.filter((g) => g.pattern !== 'liso')
    if (patterned.length === 1) reasons.push(`Solo ${nameOf(patterned[0]!)} lleva estampado, así el look no se satura.`)
    else if (patterned.length >= 2) warnings.push('Combina dos estampados; puede verse cargado.')

    if (this.request.weather === 'cool') {
      const layer = items.find((g) => slotOf(g) === 'outerwear' || g.category === 'sueteres')
      if (layer) reasons.push(`${nameOf(layer)} abriga para el clima fresco.`)
    }
    if (this.prefersComfort) {
      const shoe = items.find((g) => slotOf(g) === 'shoes')
      if (shoe && !isHeel(shoe)) reasons.push(`Calzado cómodo: ${nameOf(shoe)}.`)
    }
    const unused = items.find((g) => g.wearCount === 0)
    if (unused && items.length > 1) reasons.push(`Aprovecha ${nameOf(unused)}, que aún no has usado.`)
    if (!items.some((g) => slotOf(g) === 'shoes')) warnings.push('Este look no incluye calzado de tu armario.')
    return { reasons, warnings }
  }

  /** Small deterministic variation so "Generar alternativas" explores other combinations. */
  private jitter(id: string): number {
    if (this.seed === 0) return 0
    let hash = 2166136261
    for (const ch of id + ':' + this.seed) {
      hash ^= ch.charCodeAt(0)
      hash = Math.imul(hash, 16777619) >>> 0
    }
    return ((hash % 1000) / 1000) * 1.5
  }
}

export interface RecommendOptions {
  preferences?: UserPreferences
  excludingSignatures?: Set<string>
  variationSeed?: number
  maxSuggestions?: number
}

export function suggestionName(items: Garment[], style?: FashionStyle): string {
  const colors = [...new Set(items.filter((g) => CORE_SLOTS.includes(slotOf(g)) || slotOf(g) === 'outerwear').map((g) => g.primaryColor))]
  const ordered = [...colors.filter((c) => !isNeutral(c)), ...colors.filter(isNeutral)]
  let title = 'Look'
  if (ordered.length === 1) title = `Total ${COLORS[ordered[0]!].label.toLowerCase()}`
  else if (ordered.length >= 2) title = `${COLORS[ordered[0]!].label} y ${COLORS[ordered[1]!].label.toLowerCase()}`
  return style ? `${title} · ${STYLES[style].label}` : title
}

function makeSuggestion(items: Garment[], score: number, ctx: ScoringContext): OutfitSuggestion {
  const ordered = [...items].sort((a, b) => SLOTS[slotOf(a)].order - SLOTS[slotOf(b)].order)
  const style = ctx.dominantStyle(ordered)
  const { reasons, warnings } = ctx.explanation(ordered, style)
  return { id: nextID(), name: suggestionName(ordered, style), items: ordered, style, occasion: ctx.request.occasion, reasons, warnings, score }
}

function eligiblePool(wardrobe: Garment[], request: OutfitRequest, prefs: UserPreferences): Garment[] {
  const ids = new Set(request.requirements.map((r) => r.garmentID).filter(Boolean))
  const colors = new Set([...request.requirements.flatMap((r) => r.colors), ...request.paletteColors])
  const avoidHeels = request.excludeHeels || (prefs.avoidHeels && !request.requirements.some((r) => r.requiresHeel))
  return wardrobe.filter((g) => {
    if (!g.isAvailable) return false
    if (ids.has(g.id)) return true
    if (request.excludedCategories.includes(g.category)) return false
    if (request.excludedColors.includes(g.primaryColor)) return false
    if (avoidHeels && isHeel(g)) return false
    if (prefs.avoidedColors.includes(g.primaryColor) && !colors.has(g.primaryColor)) return false
    return true
  })
}

function bestAddition(options: Garment[], items: Garment[], ctx: ScoringContext): { garment: Garment; delta: number } | undefined {
  if (!options.length) return undefined
  const base = ctx.outfitScore(items)
  return options
    .map((g) => ({ garment: g, delta: ctx.outfitScore([...items, g]) - base }))
    .reduce((best, cur) => (cur.delta > best.delta ? cur : best))
}

/** Local recommendation engine. Deterministic for the same inputs and seed. */
export function recommend(request: OutfitRequest, wardrobe: Garment[], options: RecommendOptions = {}): RecommendationResult {
  const prefs = options.preferences ?? defaultPreferences()
  const max = options.maxSuggestions ?? 6
  const ctx = new ScoringContext(request, prefs, options.variationSeed ?? 0)
  const missing: string[] = []

  const pool = eligiblePool(wardrobe, request, prefs)
  if (!pool.length) {
    missing.push(wardrobe.length ? 'No hay prendas disponibles que cumplan la solicitud.' : 'Tu armario está vacío. Agrega fotos de tus prendas para crear outfits.')
    return { suggestions: [], missing, request }
  }

  const locked = new Map<OutfitSlot, Garment[]>()
  for (const req of request.requirements) {
    const matches = pool.filter((g) => requirementMatches(req, g))
    if (!matches.length) {
      const unavailable = wardrobe.some((g) => requirementMatches(req, g) && !g.isAvailable)
      missing.push(unavailable
        ? `Tus ${req.phrase} están marcados como no disponibles.`
        : `No encontré ${req.phrase} en tu armario; propongo alternativas con lo que tienes.`)
      continue
    }
    const existing = locked.get(req.slot)
    if (existing) {
      const inter = existing.filter((g) => matches.some((m) => m.id === g.id))
      locked.set(req.slot, inter.length ? inter : existing)
    } else {
      locked.set(req.slot, matches)
    }
  }

  const candidates = (slot: OutfitSlot, limit = 6) => {
    const source = locked.get(slot) ?? pool.filter((g) => slotOf(g) === slot)
    return [...source].sort((a, b) => ctx.itemScore(b) - ctx.itemScore(a)).slice(0, limit)
  }
  const tops = candidates('top'), bottoms = candidates('bottom'), dresses = candidates('onePiece'), shoes = candidates('shoes', 5)
  const wantsSeparates = locked.has('top') || locked.has('bottom')
  const wantsDress = locked.has('onePiece')
  const canSeparates = tops.length > 0 && bottoms.length > 0 && !wantsDress
  const canDress = dresses.length > 0 && !wantsSeparates

  if (!canSeparates && !canDress) {
    if (!tops.length && !dresses.length) missing.push('Para armar un look completo necesitas al menos una prenda superior (blusa, top, camisa…) o un vestido.')
    else if (!bottoms.length && !dresses.length) missing.push('Para armar un look completo necesitas al menos una prenda inferior (jeans, pantalón, falda…) o un vestido.')
    else if (wantsDress) missing.push('No hay vestidos disponibles para esta solicitud.')
    else missing.push('No hay suficientes prendas compatibles para completar un look.')
    return { suggestions: [], missing, request }
  }

  const shoeOptions: (Garment | null)[] = shoes.length ? shoes : [null]
  if (!shoes.length) {
    missing.push(wardrobe.some((g) => slotOf(g) === 'shoes')
      ? 'No encontré calzado compatible con esta solicitud; los looks no incluyen zapatos.'
      : 'Agrega calzado a tu armario para completar los looks.')
  }

  const bases: Garment[][] = []
  if (canSeparates) for (const t of tops) for (const b of bottoms) for (const s of shoeOptions) bases.push(s ? [t, b, s] : [t, b])
  if (canDress) for (const d of dresses) for (const s of shoeOptions) bases.push(s ? [d, s] : [d])

  const scored = bases.map((items) => ({ items, score: ctx.outfitScore(items) })).sort((a, b) => b.score - a.score).slice(0, 80)
  const outer = candidates('outerwear', 4), bags = candidates('bag', 4), accs = candidates('accessory', 4)
  const needsLayer = locked.has('outerwear') || request.weather === 'cool' || request.seasons.some((s) => SEASONS[s].cool)

  const complete = scored.map(({ items, score }) => {
    let list = items
    let total = score
    const layer = bestAddition(outer, list, ctx)
    if (layer && (needsLayer || layer.delta > 1.5 || (request.occasion === 'trabajo' && layer.delta > 0))) {
      list = [...list, layer.garment]
      total += layer.delta
    }
    const bag = bestAddition(bags, list, ctx)
    if (bag && (locked.has('bag') || bag.delta > -1)) {
      list = [...list, bag.garment]
      total += Math.max(bag.delta, 0)
    }
    const acc = bestAddition(accs, list, ctx)
    if (acc && (locked.has('accessory') || acc.delta > 0)) {
      list = [...list, acc.garment]
      total += acc.delta
    }
    return { items: list, score: total }
  })

  const ranked = complete.sort((a, b) => b.score - a.score)
  const selected: typeof ranked = []
  const seen = new Set(options.excludingSignatures ?? [])
  const coreIDs = (items: Garment[]) => new Set(items.filter((g) => CORE_SLOTS.includes(slotOf(g))).map((g) => g.id))
  for (const maxShared of [1, 2, 3]) {
    for (const cand of ranked) {
      if (selected.length >= max) break
      const sig = signature(cand.items)
      if (seen.has(sig)) continue
      const core = coreIDs(cand.items)
      const tooSimilar = selected.some((o) => [...coreIDs(o.items)].filter((id) => core.has(id)).length > maxShared)
      if (tooSimilar) continue
      selected.push(cand)
      seen.add(sig)
    }
    if (selected.length >= max) break
  }
  const suggestions = selected.map((s) => makeSuggestion(s.items, s.score, ctx))
  if (suggestions.length > 0 && suggestions.length < 3)
    missing.push(`Con las prendas actuales solo hay ${suggestions.length} combinación(es) distinta(s). Agrega más prendas para obtener más variedad.`)
  return { suggestions, missing, request }
}

/** Ranked replacements for one slot, considering the other pieces. */
export function alternativesFor(slot: OutfitSlot, suggestion: OutfitSuggestion, wardrobe: Garment[], request: OutfitRequest = emptyRequest(), preferences = defaultPreferences(), limit = 12): Garment[] {
  const ctx = new ScoringContext(request, preferences)
  const others = suggestion.items.filter((g) => slotOf(g) !== slot)
  const inOutfit = new Set(suggestion.items.map((g) => g.id))
  return wardrobe
    .filter((g) => g.isAvailable && slotOf(g) === slot && !inOutfit.has(g.id))
    .map((g) => ({ g, score: ctx.outfitScore([...others, g]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.g)
}

/** Rebuilds a suggestion after swapping, adding or removing pieces. */
export function rebuildSuggestion(suggestion: OutfitSuggestion, items: Garment[], request: OutfitRequest = emptyRequest(), preferences = defaultPreferences()): OutfitSuggestion {
  const ctx = new ScoringContext(request, preferences)
  return { ...makeSuggestion(items, ctx.outfitScore(items), ctx), id: suggestion.id }
}
