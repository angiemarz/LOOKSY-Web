import { parseRequest } from '@/domain/parser'
import { g } from './helpers'

describe('parseRequest', () => {
  it('coffee request with black jeans', () => {
    const r = parseRequest('Quiero un outfit femenino y casual con jeans negros para ir a tomar café')
    expect(r.occasion).toBe('cafe')
    expect(r.feminine).toBe(true)
    expect(r.styles).toContain('casual')
    expect(r.requirements).toHaveLength(1)
    expect(r.requirements[0]!.category).toBe('jeans')
    expect(r.requirements[0]!.colors).toEqual(['negro'])
    expect(r.paletteColors).not.toContain('cafe')
  })

  it('brown boots are a color, not coffee', () => {
    const r = parseRequest('algo con mis botas café')
    expect(r.requirements[0]!.category).toBe('zapatos')
    expect(r.requirements[0]!.colors).toEqual(['cafe'])
    expect(r.occasion).toBeUndefined()
  })

  it('two garments with colors', () => {
    const r = parseRequest('Combina mi blusa rosa con tenis blancos')
    expect(r.requirements.map((q) => q.category)).toEqual(['blusas', 'tenis'])
    expect(r.requirements.map((q) => q.colors)).toEqual([['rosa'], ['blanco']])
  })

  it('elegant work request', () => {
    const r = parseRequest('Quiero algo elegante para trabajar')
    expect(r.occasion).toBe('trabajo')
    expect(r.styles).toContain('elegante')
    expect(r.requirements).toHaveLength(0)
  })

  it('no heels restriction', () => {
    const r = parseRequest('Quiero verme arreglada sin usar tacones')
    expect(r.excludeHeels).toBe(true)
    expect(r.requirements).toHaveLength(0)
    expect(r.formalityTarget).toBeGreaterThanOrEqual(3)
  })

  it('cool weather', () => {
    const r = parseRequest('Necesito un outfit femenino para clima fresco')
    expect(r.weather).toBe('cool')
    expect(r.feminine).toBe(true)
    expect(r.seasons).toContain('otono')
  })

  it('pinterest date', () => {
    const r = parseRequest('Quiero algo estilo Pinterest para una cita')
    expect(r.occasion).toBe('cita')
    expect(r.styles).toContain('pinterestAesthetic')
  })

  it('casual chic is not plain casual', () => {
    expect(parseRequest('un look casual chic').styles).toEqual(['casualChic'])
  })

  it('excluded color and category', () => {
    const r = parseRequest('algo sin negro y sin falda')
    expect(r.excludedColors).toContain('negro')
    expect(r.excludedCategories).toContain('faldas')
    expect(r.requirements).toHaveLength(0)
  })

  it('multi-word color', () => {
    const r = parseRequest('pantalón azul marino')
    expect(r.requirements[0]!.category).toBe('pantalones')
    expect(r.requirements[0]!.colors).toEqual(['azulMarino'])
  })

  it('named garment is recognized', () => {
    const linen = g('Blusa de lino', 'blusas', 'blanco')
    const r = parseRequest('quiero usar mi blusa de lino', [linen])
    expect(r.requirements[0]!.garmentID).toBe(linen.id)
  })

  it('denim jacket is not jeans', () => {
    expect(parseRequest('chamarra de mezclilla').requirements.map((q) => q.category)).toEqual(['chamarras'])
  })
})
