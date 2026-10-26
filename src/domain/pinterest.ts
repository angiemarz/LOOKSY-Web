import { COLORS, colorAdjective, isNeutral, type FashionColor } from './color'
import { CATEGORIES, OCCASIONS, PATTERNS, STYLES, type FashionStyle, type Occasion } from './fashion'
import { garmentPhrase } from './grammar'
import type { Garment } from './models'
import type { OutfitRequest } from './request'
import { slotOf } from './recommend'

export interface PinterestQuery { text: string; language: 'EN' | 'ES' }

/** Public Pinterest search URL (opens the Pinterest app when installed). LOOKSY never scrapes Pinterest. */
export function pinterestSearchURL(query: string): string {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`
}

export function isPinterestURL(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'pin.it' || host.endsWith('.pin.it') || host.includes('pinterest.')
  } catch {
    return false
  }
}

/** Validates a pasted link, adding https:// when missing. */
export function normalizeURL(text: string): string | null {
  let value = text.trim()
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) value = 'https://' + value
  try {
    const url = new URL(value)
    return url.hostname.includes('.') ? url.toString() : null
  } catch {
    return null
  }
}

function collector(limit: number) {
  const list: PinterestQuery[] = []
  const add = (text: string, language: PinterestQuery['language']) => {
    const clean = text.split(/\s+/).filter(Boolean).join(' ').toLowerCase()
    if (clean && !list.some((q) => q.text === clean) && list.length < limit) list.push({ text: clean, language })
  }
  return { list, add }
}

function englishPhrase(g: Garment): string {
  const color = g.primaryColor === 'mezclilla' ? (g.category === 'jeans' ? 'blue' : 'denim') : COLORS[g.primaryColor].en
  return [color, PATTERNS[g.pattern].en, CATEGORIES[g.category].en].filter(Boolean).join(' ')
}

function spanishPhrase(g: Garment): string {
  if (g.primaryColor === 'mezclilla') return g.category === 'jeans' ? 'jeans' : `${CATEGORIES[g.category].singular} de mezclilla`
  return garmentPhrase(g.category, g.primaryColor)
}

/** Searches for an outfit made of the given garments (ES + EN). */
export function queriesForGarments(garments: Garment[], style?: FashionStyle, occasion?: Occasion, feminine = false, limit = 6): PinterestQuery[] {
  const main = garments.filter((g) => ['top', 'onePiece', 'bottom', 'outerwear'].includes(slotOf(g)))
  const order = { outerwear: 0, top: 1, onePiece: 2, bottom: 3 } as Record<string, number>
  main.sort((a, b) => (order[slotOf(a)] ?? 9) - (order[slotOf(b)] ?? 9))
  const shoes = garments.find((g) => slotOf(g) === 'shoes')
  const { list, add } = collector(limit)
  const pieces = main.slice(0, 2)
  if (pieces.length) {
    add(`${pieces.map(englishPhrase).join(' ')} outfit`, 'EN')
    add(`${pieces.map(spanishPhrase).join(' ')} outfit`, 'ES')
  }
  const accent = garments.map((g) => g.primaryColor).find((c) => !isNeutral(c)) ?? pieces[0]?.primaryColor
  if (style && accent) add(`${STYLES[style].en} ${feminine ? 'feminine ' : ''}${COLORS[accent].en} outfit`, 'EN')
  const first = pieces[0]
  if (first && shoes) add(`${COLORS[first.primaryColor].en} ${CATEGORIES[first.category].en} ${CATEGORIES[shoes.category].en} pinterest aesthetic`, 'EN')
  if (occasion && first) {
    add(`${OCCASIONS[occasion].en} outfit ${englishPhrase(first)}`, 'EN')
    add(`outfit para ${OCCASIONS[occasion].label.toLowerCase()} ${spanishPhrase(first)}`, 'ES')
  }
  if (style && !pieces.length) {
    add(`${STYLES[style].en} outfit ideas`, 'EN')
    add(`outfit ${STYLES[style].label.toLowerCase()}`, 'ES')
  }
  return list
}

/** Searches derived from a parsed text request. */
export function queriesForRequest(r: OutfitRequest, limit = 6): PinterestQuery[] {
  const { list, add } = collector(limit)
  const pieceEN = r.requirements.slice(0, 2).map((q) => (q.colors[0] ? COLORS[q.colors[0]].en + ' ' : '') + (q.category ? CATEGORIES[q.category].en : 'shoes')).join(' ')
  const pieceES = r.requirements.slice(0, 2).map((q) => (q.category && q.colors[0] ? garmentPhrase(q.category, q.colors[0]) : q.category ? CATEGORIES[q.category].singular : q.phrase)).join(' ')
  const styleEN = r.styles[0] ? STYLES[r.styles[0]].en : ''
  const occasionEN = r.occasion ? OCCASIONS[r.occasion].en : ''
  const palette = r.paletteColors[0] ? COLORS[r.paletteColors[0]].en : ''
  const feminine = r.feminine ? 'feminine' : ''
  const weather = r.weather === 'cool' ? 'fall' : r.weather === 'warm' ? 'summer' : ''
  add(`${styleEN} ${feminine} ${palette} ${pieceEN} ${occasionEN} outfit`, 'EN')
  if (pieceES || r.occasion || r.styles.length) {
    const occasionES = r.occasion ? `para ${OCCASIONS[r.occasion].label.toLowerCase()}` : ''
    add(`outfit ${r.styles[0] ? STYLES[r.styles[0]].label.toLowerCase() : ''} ${pieceES} ${occasionES}`, 'ES')
  }
  if (pieceEN) add(`${pieceEN} outfit pinterest aesthetic`, 'EN')
  if (occasionEN) add(`${weather} ${occasionEN} outfit ideas ${feminine}`, 'EN')
  if (styleEN) add(`${styleEN} ${weather} outfit inspiration`, 'EN')
  if (!list.length && r.text.trim()) add(r.text, 'ES')
  return list
}

/** Searches inspired by a palette and/or a style. */
export function queriesForPalette(colors: FashionColor[], style?: FashionStyle): PinterestQuery[] {
  const en = colors.slice(0, 3).map((c) => COLORS[c].en).join(' and ')
  const es = colors.slice(0, 3).map(colorAdjective).join(' y ')
  const { list, add } = collector(6)
  if (en) {
    add(`${en} outfit ${style ? STYLES[style].en : ''}`, 'EN')
    add(`outfit ${es} ${style ? STYLES[style].label.toLowerCase() : ''}`, 'ES')
    add(`${en} color palette outfit aesthetic`, 'EN')
  } else if (style) {
    add(`${STYLES[style].en} outfit ideas`, 'EN')
    add(`outfits ${STYLES[style].label.toLowerCase()}`, 'ES')
  }
  return list
}
