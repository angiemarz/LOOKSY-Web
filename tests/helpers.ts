import { newGarment, type Garment } from '@/domain/models'
import { CATEGORIES, type FashionStyle, type GarmentCategory } from '@/domain/fashion'
import type { FashionColor } from '@/domain/color'

let n = 0
export function g(name: string, category: GarmentCategory, color: FashionColor, extra: Partial<Garment> & { styles?: FashionStyle[] } = {}): Garment {
  n++
  return newGarment({ id: `G${n}`, name, category, primaryColor: color, formality: CATEGORIES[category].formality, ...extra })
}
