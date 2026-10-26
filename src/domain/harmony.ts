import { COLORS, colorAdjective, colorHue, isNeutral, type FashionColor } from './color'

export interface HarmonyEvaluation { score: number; description: string }

export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

const PASTELS: FashionColor[] = ['rosaPalo', 'lila', 'celeste', 'menta', 'crema']
const cap = (c: FashionColor) => COLORS[c].label

/** Explainable color-harmony rules for the main colors of an outfit. */
export function evaluateHarmony(colors: FashionColor[]): HarmonyEvaluation {
  const unique = [...new Set(colors)]
  const neutrals = unique.filter(isNeutral)
  const accents = unique.filter((c) => !isNeutral(c))
  const neutralNames = neutrals.map(colorAdjective).join(', ')

  if (accents.length === 0) {
    return { score: 2, description: neutrals.length ? `Paleta neutra (${neutralNames}): combina sin esfuerzo y se ve pulida.` : 'Paleta sencilla.' }
  }
  if (accents.length === 1) {
    const accent = accents[0]!
    if (accent === 'multicolor') return { score: 1.5, description: 'La prenda multicolor es la protagonista y el resto la acompaña en neutros.' }
    if (neutrals.length === 0) return { score: 2.5, description: `Look monocromático en ${colorAdjective(accent)}: estiliza y se ve intencional.` }
    return { score: 3, description: `El ${colorAdjective(accent)} es el acento y los neutros (${neutralNames}) lo equilibran.` }
  }
  if (accents.length === 2) {
    const [a, b] = accents as [FashionColor, FashionColor]
    if (a === 'multicolor' || b === 'multicolor') return { score: -1, description: 'Una prenda multicolor junto a otro color fuerte puede verse cargado.' }
    if (COLORS[a].family === COLORS[b].family)
      return { score: 2.5, description: `Tonos de la misma familia (${colorAdjective(a)} y ${colorAdjective(b)}): armonía tono sobre tono.` }
    const ha = colorHue(a), hb = colorHue(b)
    if (ha === null || hb === null) return { score: 0.5, description: `Combinación de ${colorAdjective(a)} y ${colorAdjective(b)}.` }
    const d = hueDistance(ha, hb)
    if (d <= 50) return { score: 2, description: `${cap(a)} y ${colorAdjective(b)} son colores análogos: armonía suave.` }
    if (d >= 150) return { score: 1, description: `${cap(a)} y ${colorAdjective(b)} son complementarios: contraste con intención.` }
    if (PASTELS.includes(a) && PASTELS.includes(b)) return { score: 1.5, description: `${cap(a)} y ${colorAdjective(b)} en tonos suaves se ven delicados juntos.` }
    return { score: -1.5, description: `${cap(a)} y ${colorAdjective(b)} compiten entre sí; un neutro ayudaría.` }
  }
  return { score: -2.5, description: `Demasiados colores fuertes juntos (${accents.map(colorAdjective).join(', ')}).` }
}
