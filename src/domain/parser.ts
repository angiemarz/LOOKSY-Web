import { colorAdjective, type FashionColor } from './color'
import { CATEGORIES, OCCASIONS } from './fashion'
import { garmentPhrase } from './grammar'
import {
  AMBIGUOUS_COLOR_WORDS, COLOR_PHRASES, COLOR_WORDS, COMFORT_WORDS, COOL_WEATHER, FEMININE_WORDS, GARMENT_WORDS,
  NEGATION_WORDS, OCCASION_PHRASES, STOP_WORDS, STYLE_PHRASES, WARM_WEATHER,
} from './lexicon'
import type { Garment } from './models'
import { tokens as tokenize } from './normalize'
import { emptyRequest, type ItemRequirement, type OutfitRequest } from './request'

const FILLERS = new Set(['de', 'color', 'en', 'tono', 'tonos', 'y'])

/** Rule-based, fully local interpretation of outfit requests (no remote language model). */
export function parseRequest(text: string, wardrobe: Garment[] = []): OutfitRequest {
  const request = emptyRequest(text)
  let working = ' ' + tokenize(text).join(' ') + ' '

  // 1. Multi-word colors become placeholder tokens.
  const phraseColors = new Map<string, FashionColor>()
  COLOR_PHRASES.forEach(([phrase, color], index) => {
    const placeholder = `colorphrase${index}`
    if (working.includes(` ${phrase} `)) {
      working = working.split(` ${phrase} `).join(` ${placeholder} `)
      phraseColors.set(placeholder, color)
    }
  })
  const words = working.split(' ').filter(Boolean)
  const consumed = new Set<number>()

  const colorAt = (i: number): FashionColor | undefined => {
    const w = words[i]
    if (w === undefined) return undefined
    return phraseColors.get(w) ?? COLOR_WORDS.get(w)
  }
  const negatedBefore = (i: number) => {
    for (let k = Math.max(0, i - 3); k < i; k++) if (NEGATION_WORDS.has(words[k]!)) return true
    return false
  }

  // 2. Garment mentions with attached colors.
  let i = 0
  while (i < words.length) {
    const word = words[i]!
    if (word === 'mezclilla' && i >= 2 && words[i - 1] === 'de' && GARMENT_WORDS.has(words[i - 2]!)) {
      consumed.add(i)
      i++
      continue
    }
    const term = GARMENT_WORDS.get(word)
    if (!term) {
      i++
      continue
    }
    consumed.add(i)
    const colors: FashionColor[] = []
    let ahead = i + 1
    let steps = 0
    while (ahead < words.length && steps < 4) {
      if (FILLERS.has(words[ahead]!)) {
        ahead++
        steps++
        continue
      }
      const c = colorAt(ahead)
      if (c) {
        colors.push(c)
        consumed.add(ahead)
        ahead++
        steps++
        continue
      }
      break
    }
    if (colors.length === 0 && i > 0 && !consumed.has(i - 1)) {
      const c = colorAt(i - 1)
      if (c && !AMBIGUOUS_COLOR_WORDS.has(words[i - 1]!)) {
        colors.push(c)
        consumed.add(i - 1)
      }
    }

    if (negatedBefore(i)) {
      if (term.isHeel) request.excludeHeels = true
      else if (term.category && !request.excludedCategories.includes(term.category)) request.excludedCategories.push(term.category)
    } else {
      const requirement: ItemRequirement = {
        category: term.category, slot: term.slot, colors, requiresHeel: term.isHeel,
        phrase: term.category && colors.length === 1 ? garmentPhrase(term.category, colors[0]!) : [word, ...colors.map(colorAdjective)].join(' '),
      }
      const last = request.requirements[request.requirements.length - 1]
      if (last && last.category === requirement.category && last.slot === requirement.slot) {
        last.colors = [...new Set([...last.colors, ...colors])].sort()
        if (colors.length) last.phrase = requirement.phrase
      } else {
        request.requirements.push(requirement)
      }
    }
    i = Math.max(ahead, i + 1)
  }

  // 3. Free colors: palette or exclusions ("sin negro").
  words.forEach((word, index) => {
    if (consumed.has(index)) return
    const c = colorAt(index)
    if (!c || AMBIGUOUS_COLOR_WORDS.has(word)) return
    if (negatedBefore(index)) {
      if (!request.excludedColors.includes(c)) request.excludedColors.push(c)
    } else if (!request.paletteColors.includes(c)) {
      request.paletteColors.push(c)
    }
    consumed.add(index)
  })

  // 4. Phrase-level signals.
  const padded = ' ' + words.join(' ') + ' '
  const has = (phrase: string) => padded.includes(` ${phrase} `)

  for (const [phrase, occasion] of OCCASION_PHRASES) {
    if (has(phrase)) {
      request.occasion = occasion
      break
    }
  }
  if (!request.occasion && words.some((w, idx) => w === 'cafe' && !consumed.has(idx))) request.occasion = 'cafe'

  let styleText = padded
  for (const [phrase, style] of STYLE_PHRASES) {
    if (styleText.includes(` ${phrase} `)) {
      if (!request.styles.includes(style)) request.styles.push(style)
      styleText = styleText.split(` ${phrase} `).join(' ')
    }
  }

  if (COOL_WEATHER.some(has)) {
    request.weather = 'cool'
    request.seasons = ['otono', 'invierno']
  } else if (WARM_WEATHER.some(has)) {
    request.weather = 'warm'
    request.seasons = ['primavera', 'verano']
  }
  if (has('invierno')) request.seasons = ['invierno']
  if (has('verano')) request.seasons = ['verano']
  if (has('primavera')) request.seasons = ['primavera']
  if (has('otono')) request.seasons = ['otono']

  request.prefersComfort = COMFORT_WORDS.some(has)
  request.feminine = FEMININE_WORDS.some(has)

  // 5. Formality target.
  if (has('muy formal') || has('de gala')) request.formalityTarget = 5
  else if (has('arreglada') || has('arreglado') || has('verme bien'))
    request.formalityTarget = Math.max(3, request.occasion ? OCCASIONS[request.occasion].formality : 3)
  else if (has('muy casual') || has('relajada') || has('relajado')) request.formalityTarget = 1

  // 6. Specific garments mentioned by name ("mi blusa de lino").
  const requestWords = new Set(words)
  const named: [Garment, number][] = []
  for (const g of wardrobe) {
    const nameWords = [...new Set(tokenize(g.name))].filter((w) => !STOP_WORDS.has(w))
    if (nameWords.length < 2 || !nameWords.every((w) => requestWords.has(w))) continue
    if (!nameWords.some((w) => !GARMENT_WORDS.has(w) && !COLOR_WORDS.has(w))) continue
    named.push([g, nameWords.length])
  }
  named.sort((a, b) => b[1] - a[1])
  for (const [g] of named) {
    const slot = CATEGORIES[g.category].slot
    const existing = request.requirements.find((r) => r.slot === slot && (r.category === null || r.category === g.category))
    if (existing) {
      if (!existing.garmentID) {
        existing.garmentID = g.id
        existing.phrase = g.name
      }
    } else if (!request.requirements.some((r) => r.garmentID === g.id)) {
      request.requirements.push({ category: g.category, slot, colors: [], garmentID: g.id, requiresHeel: false, phrase: g.name })
    }
  }
  return request
}
