import { CATEGORIES, type GarmentCategory } from './fashion'
import { colorAdjective, type FashionColor } from './color'

const VARIABLE: FashionColor[] = ['negro', 'blanco', 'rojo', 'morado', 'amarillo', 'dorado', 'plateado']

/** Color adjective agreeing with gender and number ("negros", "blanca"). */
export function agreeColor(color: FashionColor, feminine: boolean, plural: boolean): string {
  let word = colorAdjective(color)
  if (VARIABLE.includes(color) && feminine) word = word.slice(0, -1) + 'a'
  if (!plural) return word
  if (VARIABLE.includes(color) || color === 'celeste') return word + 's'
  if (color === 'azul') return 'azules'
  if (color === 'gris') return 'grises'
  if (color === 'verde') return 'verdes'
  return word
}

/** "jeans negros", "blusa rosa". */
export function garmentPhrase(category: GarmentCategory, color: FashionColor): string {
  const info = CATEGORIES[category]
  return `${info.singular} ${agreeColor(color, info.feminine, info.plural)}`
}
