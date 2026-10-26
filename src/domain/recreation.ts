import { COLORS, colorAdjective, isNeutral, type FashionColor } from './color'
import { CATEGORIES, SLOTS, STYLES, formalityLabel, type FashionStyle, type GarmentCategory, type OutfitSlot } from './fashion'
import { garmentPhrase } from './grammar'
import { garmentColors, defaultPreferences, type Garment, type UserPreferences } from './models'
import { capitalizeFirst } from './normalize'
import { ScoringContext, recommend, signature, slotOf } from './recommend'
import { emptyRequest } from './request'

/** A garment the user identified in a reference look. */
export interface TargetPiece { id: string; slot: OutfitSlot; category: GarmentCategory | null; color: FashionColor | null }

export interface RecreationTarget { pieces: TargetPiece[]; colors: FashionColor[]; style?: FashionStyle; formality: number }

export type CriterionStatus = 'match' | 'partial' | 'miss' | 'unknown'
export interface ComparisonCriterion { title: string; detail: string; status: CriterionStatus }

export type RecreationKind = 'closest' | 'wardrobeOnly' | 'creative'
export const RECREATION_KINDS: Record<RecreationKind, { title: string; subtitle: string }> = {
  closest: { title: 'Recreación más parecida', subtitle: 'Usa solo prendas muy parecidas y te dice qué falta.' },
  wardrobeOnly: { title: 'Solo con mi armario', subtitle: 'Completa el look con tus sustitutos más cercanos.' },
  creative: { title: 'Interpretación creativa', subtitle: 'Mismo estilo y formalidad, con libertad de color.' },
}

export interface Recreation { kind: RecreationKind; items: Garment[]; notes: string[]; criteria: ComparisonCriterion[] }

export function pieceDescription(p: TargetPiece): string {
  const name = p.category ? CATEGORIES[p.category].singular : SLOTS[p.slot].label.toLowerCase()
  if (!p.color) return name
  return p.category ? garmentPhrase(p.category, p.color) : `${name} ${colorAdjective(p.color)}`
}

export function similarity(g: Garment, p: TargetPiece, target: RecreationTarget): number {
  let score = 0
  const slot = slotOf(g)
  if (p.category) {
    if (g.category === p.category) score += 3
    else if (slot === p.slot) score += 1.5
    else return -100
  } else if (slot === p.slot) score += 2
  else return -100
  if (p.color) {
    const colors = garmentColors(g)
    if (colors.includes(p.color)) score += g.primaryColor === p.color ? 3 : 2
    else if (colors.some((c) => COLORS[c].family === COLORS[p.color!].family)) score += 2
    else if (isNeutral(g.primaryColor) && isNeutral(p.color)) score += 0.5
    else score -= 1
  }
  if (target.style && g.styles.includes(target.style)) score += 1
  return score - Math.abs(g.formality - target.formality) * 0.5
}

/** Strong match: right slot and same color family when a color was given. */
export function isClose(g: Garment, p: TargetPiece): boolean {
  if (slotOf(g) !== p.slot) return false
  if (p.category && g.category !== p.category && !p.color) return false
  if (!p.color) return true
  return garmentColors(g).some((c) => c === p.color || COLORS[c].family === COLORS[p.color!].family)
}

const best = (list: Garment[], score: (g: Garment) => number) =>
  list.reduce<Garment | undefined>((b, g) => (!b || score(g) > score(b) ? g : b), undefined)

export function recreate(target: RecreationTarget, wardrobe: Garment[], preferences: UserPreferences = defaultPreferences()): Recreation[] {
  const available = wardrobe.filter((g) => g.isAvailable)

  let used = new Set<string>()
  const closest: Garment[] = []
  const closestNotes: string[] = []
  for (const p of target.pieces) {
    const match = best(available.filter((g) => !used.has(g.id) && isClose(g, p)), (g) => similarity(g, p, target))
    if (match) {
      closest.push(match)
      used.add(match.id)
      closestNotes.push(`${capitalizeFirst(pieceDescription(p))} → ${match.name}`)
    } else {
      closestNotes.push(`Falta: ${pieceDescription(p)} (no hay una prenda parecida en tu armario).`)
    }
  }

  used = new Set()
  let own: Garment[] = []
  const ownNotes: string[] = []
  for (const p of target.pieces) {
    const match = best(available.filter((g) => !used.has(g.id) && slotOf(g) === p.slot), (g) => similarity(g, p, target))
    if (match) {
      own.push(match)
      used.add(match.id)
      ownNotes.push(isClose(match, p) ? `${capitalizeFirst(pieceDescription(p))} → ${match.name}` : `Sustituí ${pieceDescription(p)} por ${match.name}.`)
    } else {
      ownNotes.push(`No tienes ninguna prenda de tipo ${SLOTS[p.slot].label.toLowerCase()}.`)
    }
  }
  own = complete(own, available, target, preferences, ownNotes)

  const request = { ...emptyRequest(), styles: target.style ? [target.style] : [], formalityTarget: target.formality, paletteColors: [...target.colors, ...target.pieces.flatMap((p) => (p.color ? [p.color] : []))].slice(0, 2) }
  const engine = recommend(request, available, { preferences, maxSuggestions: 1, variationSeed: 7, excludingSignatures: new Set([signature(closest), signature(own)]) })
  const creative = engine.suggestions[0]

  return [
    { kind: 'closest', items: closest, notes: closestNotes, criteria: compareCriteria(target, closest) },
    { kind: 'wardrobeOnly', items: own, notes: ownNotes, criteria: compareCriteria(target, own) },
    creative
      ? { kind: 'creative', items: creative.items, notes: creative.reasons, criteria: compareCriteria(target, creative.items, creative.style) }
      : { kind: 'creative', items: [], notes: engine.missing.length ? engine.missing : ['No hay suficientes prendas para una versión distinta.'], criteria: [] },
  ]
}

function complete(items: Garment[], available: Garment[], target: RecreationTarget, preferences: UserPreferences, notes: string[]): Garment[] {
  const result = [...items]
  const ctx = new ScoringContext({ ...emptyRequest(), styles: target.style ? [target.style] : [], formalityTarget: target.formality }, preferences)
  const slots = new Set(result.map(slotOf))
  const needed: OutfitSlot[] = []
  if (!slots.has('onePiece')) {
    if (!slots.has('top')) needed.push('top')
    if (!slots.has('bottom')) needed.push('bottom')
  }
  if (!slots.has('shoes')) needed.push('shoes')
  for (const slot of needed) {
    const ids = new Set(result.map((g) => g.id))
    const pick = best(available.filter((g) => slotOf(g) === slot && !ids.has(g.id)), (g) => ctx.outfitScore([...result, g]))
    if (pick) {
      result.push(pick)
      notes.push(`Añadí ${pick.name} para completar el look.`)
    }
  }
  return result.sort((a, b) => SLOTS[slotOf(a)].order - SLOTS[slotOf(b)].order)
}

/** Explainable comparison between a reference and an outfit (no invented percentages). */
export function compareCriteria(target: RecreationTarget, items: Garment[], style?: FashionStyle): ComparisonCriterion[] {
  const criteria: ComparisonCriterion[] = []
  if (target.pieces.length) {
    const used = new Set<string>()
    let covered = 0
    for (const p of target.pieces) {
      const match = items.find((g) => !used.has(g.id) && isClose(g, p))
      if (match) {
        covered++
        used.add(match.id)
      }
    }
    criteria.push({
      title: 'Prendas equivalentes',
      detail: `${covered} de ${target.pieces.length} prendas de la referencia tienen un equivalente cercano.`,
      status: covered === target.pieces.length ? 'match' : covered === 0 ? 'miss' : 'partial',
    })
  }
  const targetColors = [...new Set([...target.colors, ...target.pieces.flatMap((p) => (p.color ? [p.color] : []))])]
  if (targetColors.length) {
    const outfitColors = items.flatMap(garmentColors)
    const matched = targetColors.filter((c) => outfitColors.some((o) => o === c || COLORS[o].family === COLORS[c].family))
    criteria.push({
      title: 'Colores',
      detail: `${matched.length} de ${targetColors.length} colores de la referencia aparecen en tu look${matched.length ? ` (${matched.map(colorAdjective).join(', ')})` : ''}.`,
      status: matched.length === targetColors.length ? 'match' : matched.length === 0 ? 'miss' : 'partial',
    })
  }
  if (target.style) {
    const styles = new Set([...items.flatMap((g) => g.styles), ...(style ? [style] : [])])
    if (!styles.size) criteria.push({ title: 'Estilo', detail: 'Tus prendas no tienen estilo asignado; no se puede comparar.', status: 'unknown' })
    else if (styles.has(target.style)) criteria.push({ title: 'Estilo', detail: `Ambos son ${STYLES[target.style].label.toLowerCase()}.`, status: 'match' })
    else if (STYLES[target.style].related.some((s) => styles.has(s))) criteria.push({ title: 'Estilo', detail: `Estilo cercano a ${STYLES[target.style].label.toLowerCase()}.`, status: 'partial' })
    else criteria.push({ title: 'Estilo', detail: 'Tu look tiene otro estilo.', status: 'miss' })
  }
  if (items.length) {
    const avg = items.reduce((s, g) => s + g.formality, 0) / items.length
    const diff = Math.abs(avg - target.formality)
    criteria.push({
      title: 'Formalidad',
      detail: `Referencia: ${formalityLabel(target.formality).toLowerCase()}; tu look: ${formalityLabel(Math.round(avg)).toLowerCase()}.`,
      status: diff <= 0.75 ? 'match' : diff <= 1.5 ? 'partial' : 'miss',
    })
  }
  return criteria
}
