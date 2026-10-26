import { pinterestSearchURL, queriesForGarments, isPinterestURL, normalizeURL } from '@/domain/pinterest'
import { garmentPhrase } from '@/domain/grammar'
import { layoutCollage, heightFraction, ASPECT_LIST, reorder, type CollageComposition } from '@/domain/collage'
import { COLOR_LIST, colorRgb, nearestColor, rgbFromHex, hexFromRgb, analyzePixels } from '@/domain/color'
import { recreate } from '@/domain/recreation'
import { g } from './helpers'

describe('pinterest', () => {
  it('builds an authentic search URL', () => {
    const url = new URL(pinterestSearchURL('pink blouse blue jeans outfit'))
    expect(url.hostname).toBe('www.pinterest.com')
    expect(url.pathname).toBe('/search/pins/')
    expect(url.searchParams.get('q')).toBe('pink blouse blue jeans outfit')
  })

  it('generates queries in both languages', () => {
    const texts = queriesForGarments([g('Blusa', 'blusas', 'rosa'), g('Jeans', 'jeans', 'mezclilla'), g('Tenis', 'tenis', 'blanco')], 'casual', undefined, true).map((q) => q.text)
    expect(texts).toContain('pink blouse blue jeans outfit')
    expect(texts).toContain('blusa rosa jeans outfit')
    expect(texts).toContain('casual feminine pink outfit')
    expect(texts).toContain('pink blouse sneakers pinterest aesthetic')
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('validates links', () => {
    expect(isPinterestURL('https://pin.it/abc123')).toBe(true)
    expect(isPinterestURL('https://mx.pinterest.com/pin/123/')).toBe(true)
    expect(isPinterestURL('https://example.com')).toBe(false)
    expect(normalizeURL('pin.it/xyz')).toBe('https://pin.it/xyz')
    expect(normalizeURL('   ')).toBeNull()
  })

  it('agrees Spanish adjectives', () => {
    expect(garmentPhrase('jeans', 'negro')).toBe('jeans negros')
    expect(garmentPhrase('blusas', 'blanco')).toBe('blusa blanca')
    expect(garmentPhrase('sandalias', 'dorado')).toBe('sandalias doradas')
    expect(garmentPhrase('tenis', 'rosa')).toBe('tenis rosa')
  })
})

describe('colors', () => {
  it('hex round trip', () => {
    expect(hexFromRgb(rgbFromHex('#D8A7B1')!)).toBe('#D8A7B1')
    expect(rgbFromHex('nope')).toBeNull()
  })

  it('every named color maps to itself', () => {
    for (const c of COLOR_LIST) if (c !== 'multicolor') expect(nearestColor(colorRgb(c))).toBe(c)
  })

  it('analysis ignores a plain background', () => {
    const side = 64
    const data = new Uint8ClampedArray(side * side * 4)
    for (let y = 0; y < side; y++)
      for (let x = 0; x < side; x++) {
        const inside = x >= 16 && x < 48 && y >= 12 && y < 52
        const i = (y * side + x) * 4
        data.set(inside ? [217, 26, 26, 255] : [255, 255, 255, 255], i)
      }
    expect(analyzePixels(data, side)[0]!.color).toBe('rojo')
  })

  it('analysis ignores transparent pixels', () => {
    const side = 64
    const data = new Uint8ClampedArray(side * side * 4)
    for (let i = 0; i < side * side; i++) data.set(i % 3 === 0 ? [28, 28, 30, 255] : [255, 0, 0, 0], i * 4)
    expect(analyzePixels(data, side)[0]!.color).toBe('negro')
  })
})

describe('collage layout', () => {
  it('lays out a flat lay in order for every aspect', () => {
    const inputs = [
      { garmentID: 'top', slot: 'top' as const, imageAspect: 1.1 },
      { garmentID: 'bottom', slot: 'bottom' as const, imageAspect: 1.5 },
      { garmentID: 'shoes', slot: 'shoes' as const, imageAspect: 0.6 },
      { garmentID: 'bag', slot: 'bag' as const, imageAspect: 1 },
    ]
    for (const aspect of ASPECT_LIST) {
      const items = layoutCollage(inputs, aspect)
      const by = Object.fromEntries(items.map((i) => [i.garmentID, i]))
      expect(by.top!.centerY).toBeLessThan(by.bottom!.centerY)
      expect(by.bottom!.centerY).toBeLessThan(by.shoes!.centerY)
      expect(by.bag!.centerX).toBeGreaterThan(by.top!.centerX)
      expect(new Set(items.map((i) => i.zIndex)).size).toBe(items.length)
      for (const item of items) expect(heightFraction(item, 1.5, aspect)).toBeGreaterThan(0)
    }
  })

  it('fits tall images inside their box', () => {
    const item = layoutCollage([{ garmentID: 'x', slot: 'bottom', imageAspect: 3 }], 'square')[0]!
    expect(heightFraction(item, 3, 'square')).toBeLessThanOrEqual(0.41)
  })

  it('reorders layers', () => {
    const items = layoutCollage([
      { garmentID: 'a', slot: 'top', imageAspect: 1 },
      { garmentID: 'b', slot: 'bottom', imageAspect: 1 },
      { garmentID: 'c', slot: 'shoes', imageAspect: 1 },
    ], 'portrait')
    const c: CollageComposition = { version: 1, aspect: 'portrait', backgroundHex: '#FFF', cardStyleForPhotos: true, items }
    const bottom = items.find((i) => i.garmentID === 'b')!
    const front = reorder(c, bottom.id, 'front')
    expect(front.items.find((i) => i.id === bottom.id)!.zIndex).toBe(2)
    const back = reorder(front, bottom.id, 'back')
    expect(back.items.find((i) => i.id === bottom.id)!.zIndex).toBe(0)
  })
})

describe('recreation', () => {
  it('builds three variants from the wardrobe only', () => {
    const wardrobe = [
      g('Blusa blanca', 'blusas', 'blanco', { styles: ['minimalista'] }),
      g('Top crema', 'tops', 'crema'),
      g('Jeans azules', 'jeans', 'mezclilla'),
      g('Falda negra', 'faldas', 'negro'),
      g('Tenis blancos', 'tenis', 'blanco'),
      g('Sandalias', 'sandalias', 'camel'),
    ]
    const results = recreate({
      pieces: [
        { id: '1', slot: 'top', category: 'blusas', color: 'blanco' },
        { id: '2', slot: 'bottom', category: 'faldas', color: 'rojo' },
        { id: '3', slot: 'bag', category: 'bolsos', color: 'negro' },
      ],
      colors: ['blanco', 'rojo'], style: 'minimalista', formality: 2,
    }, wardrobe)
    expect(results.map((r) => r.kind)).toEqual(['closest', 'wardrobeOnly', 'creative'])
    const ids = new Set(wardrobe.map((x) => x.id))
    const [closest, own] = results
    expect(closest!.items.some((x) => x.name === 'Blusa blanca')).toBe(true)
    expect(closest!.items.some((x) => x.name === 'Falda negra')).toBe(false)
    expect(closest!.notes.some((n) => n.startsWith('Falta'))).toBe(true)
    expect(own!.items.some((x) => x.category === 'faldas' || x.category === 'jeans')).toBe(true)
    expect(own!.items.some((x) => x.category === 'tenis' || x.category === 'sandalias')).toBe(true)
    for (const r of results) for (const item of r.items) expect(ids.has(item.id)).toBe(true)
    expect(closest!.criteria.some((c) => c.title === 'Prendas equivalentes' && c.status === 'partial')).toBe(true)
  })
})

import { removePlainBackground, isUsableCutout } from '@/domain/segmentation'

describe('plain background removal', () => {
  it('removes a uniform background and finds the garment', () => {
    const width = 40, height = 50
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const inside = x >= 10 && x < 30 && y >= 10 && y < 40
        data.set(inside ? [30, 60, 160, 255] : [240, 238, 232, 255], (y * width + x) * 4)
      }
    const result = removePlainBackground({ width, height, data })
    expect(result.bounds).toEqual({ x: 10, y: 10, width: 20, height: 30 })
    expect(isUsableCutout(result)).toBe(true)
    expect(result.image.data[3]).toBe(0)
    expect(result.image.data[(20 * width + 20) * 4 + 3]).toBe(255)
  })

  it('reports an unusable result when there is no contrast', () => {
    const data = new Uint8ClampedArray(20 * 20 * 4).fill(200)
    expect(isUsableCutout(removePlainBackground({ width: 20, height: 20, data }))).toBe(false)
  })
})
