import { recommend, alternativesFor, signature, slotOf } from '@/domain/recommend'
import { parseRequest } from '@/domain/parser'
import { emptyRequest } from '@/domain/request'
import { defaultPreferences } from '@/domain/models'
import { evaluateHarmony, hueDistance } from '@/domain/harmony'
import { g } from './helpers'

const wardrobe = [
  g('Blusa rosa', 'blusas', 'rosa', { styles: ['casualChic', 'romantico'] }),
  g('Blusa blanca', 'blusas', 'blanco', { styles: ['minimalista', 'oficina'], formality: 3 }),
  g('Top negro', 'tops', 'negro', { styles: ['casual'] }),
  g('Camisa celeste', 'camisas', 'celeste', { styles: ['oficina'], formality: 4 }),
  g('Jeans negros', 'jeans', 'negro', { styles: ['casual', 'casualChic'] }),
  g('Jeans azules', 'jeans', 'mezclilla', { styles: ['casual'] }),
  g('Pantalón beige', 'pantalones', 'beige', { styles: ['oficina', 'oldMoney'], formality: 4 }),
  g('Falda verde', 'faldas', 'verde', { styles: ['romantico'] }),
  g('Tenis blancos', 'tenis', 'blanco', { styles: ['casual'] }),
  g('Zapatos negros', 'zapatos', 'negro', { styles: ['oficina'], formality: 4 }),
  g('Tacones nude', 'zapatos', 'beige', { styles: ['elegante'], formality: 4, tags: ['tacones'] }),
  g('Bolso camel', 'bolsos', 'camel'),
  g('Blazer negro', 'chamarras', 'negro', { styles: ['oficina'], formality: 4 }),
]
const req = emptyRequest()

describe('recommend', () => {
  it('never invents garments', () => {
    const ids = new Set(wardrobe.map((x) => x.id))
    const result = recommend(req, wardrobe)
    expect(result.suggestions.length).toBeGreaterThan(0)
    for (const s of result.suggestions) for (const item of s.items) expect(ids.has(item.id)).toBe(true)
  })

  it('generates 3-6 complete outfits', () => {
    const { suggestions } = recommend(req, wardrobe)
    expect(suggestions.length).toBeGreaterThanOrEqual(3)
    expect(suggestions.length).toBeLessThanOrEqual(6)
    for (const s of suggestions) {
      const slots = new Set(s.items.map(slotOf))
      expect(slots.has('onePiece') || (slots.has('top') && slots.has('bottom'))).toBe(true)
      expect(slots.has('shoes')).toBe(true)
      expect(slots.size).toBe(s.items.length)
      expect(s.reasons.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate outfits', () => {
    const sigs = recommend(req, wardrobe).suggestions.map((s) => signature(s.items))
    expect(new Set(sigs).size).toBe(sigs.length)
  })

  it('always includes the required garment', () => {
    const r = parseRequest('algo casual con mis jeans negros para un café')
    const result = recommend(r, wardrobe)
    expect(result.suggestions.length).toBeGreaterThan(0)
    for (const s of result.suggestions) expect(s.items.some((x) => x.name === 'Jeans negros')).toBe(true)
  })

  it('honors two required pieces', () => {
    const result = recommend(parseRequest('Combina mi blusa rosa con tenis blancos'), wardrobe)
    expect(result.suggestions.length).toBeGreaterThan(0)
    for (const s of result.suggestions) {
      expect(s.items.some((x) => x.name === 'Blusa rosa')).toBe(true)
      expect(s.items.some((x) => x.name === 'Tenis blancos')).toBe(true)
    }
  })

  it('excludes heels', () => {
    const result = recommend(parseRequest('quiero verme arreglada sin usar tacones'), wardrobe)
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.flatMap((s) => s.items).some((x) => x.name === 'Tacones nude')).toBe(false)
  })

  it('prunes avoided colors unless requested', () => {
    const prefs = { ...defaultPreferences(), avoidedColors: ['verde' as const] }
    expect(recommend(req, wardrobe, { preferences: prefs }).suggestions.flatMap((s) => s.items).some((x) => x.primaryColor === 'verde')).toBe(false)
    const explicit = recommend(parseRequest('con mi falda verde'), wardrobe, { preferences: prefs })
    expect(explicit.suggestions.length).toBeGreaterThan(0)
    expect(explicit.suggestions.every((s) => s.items.some((x) => x.name === 'Falda verde'))).toBe(true)
  })

  it('skips unavailable garments', () => {
    const items = wardrobe.map((x) => (x.name === 'Tenis blancos' ? { ...x, isAvailable: false } : x))
    expect(recommend(req, items).suggestions.flatMap((s) => s.items).some((x) => x.name === 'Tenis blancos')).toBe(false)
  })

  it('explains missing requirements', () => {
    expect(recommend(parseRequest('con mi vestido rojo'), wardrobe).missing.some((m) => m.includes('vestido'))).toBe(true)
  })

  it('incomplete wardrobe returns no outfit and explains', () => {
    const result = recommend(req, [g('Blusa', 'blusas', 'blanco'), g('Top', 'tops', 'negro')])
    expect(result.suggestions).toHaveLength(0)
    expect(result.missing.length).toBeGreaterThan(0)
  })

  it('empty wardrobe', () => {
    const result = recommend(req, [])
    expect(result.suggestions).toHaveLength(0)
    expect(result.missing.length).toBeGreaterThan(0)
  })

  it('alternatives exclude shown signatures', () => {
    const shown = new Set(recommend(req, wardrobe).suggestions.map((s) => signature(s.items)))
    const second = recommend(req, wardrobe, { excludingSignatures: shown, variationSeed: 1 })
    expect(second.suggestions.every((s) => !shown.has(signature(s.items)))).toBe(true)
  })

  it('cool weather adds a layer', () => {
    const result = recommend(parseRequest('outfit para clima frío'), wardrobe)
    expect(result.suggestions.some((s) => s.items.some((x) => slotOf(x) === 'outerwear'))).toBe(true)
  })

  it('is deterministic', () => {
    const a = recommend(req, wardrobe).suggestions.map((s) => signature(s.items))
    const b = recommend(req, wardrobe).suggestions.map((s) => signature(s.items))
    expect(a).toEqual(b)
  })

  it('swap alternatives stay in slot and exist', () => {
    const first = recommend(req, wardrobe).suggestions[0]!
    const options = alternativesFor('shoes', first, wardrobe)
    expect(options.length).toBeGreaterThan(0)
    expect(options.every((o) => slotOf(o) === 'shoes' && !first.items.some((i) => i.id === o.id))).toBe(true)
  })

  it('color harmony rules', () => {
    expect(evaluateHarmony(['rosa', 'negro', 'blanco']).score).toBeGreaterThan(0)
    expect(evaluateHarmony(['negro', 'blanco', 'beige']).score).toBeGreaterThan(0)
    expect(evaluateHarmony(['rojo', 'verde', 'morado', 'amarillo']).score).toBeLessThan(0)
    expect(hueDistance(350, 10)).toBeCloseTo(20)
  })
})
