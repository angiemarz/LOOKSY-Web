// Fashion vocabulary. Raw values match the iOS app so backups stay compatible.

export type OutfitSlot = 'top' | 'bottom' | 'onePiece' | 'outerwear' | 'shoes' | 'bag' | 'accessory'

export const SLOTS: Record<OutfitSlot, { label: string; order: number }> = {
  outerwear: { label: 'Capa exterior', order: 0 },
  top: { label: 'Parte superior', order: 1 },
  onePiece: { label: 'Vestido', order: 2 },
  bottom: { label: 'Parte inferior', order: 3 },
  shoes: { label: 'Calzado', order: 4 },
  bag: { label: 'Bolso', order: 5 },
  accessory: { label: 'Accesorio', order: 6 },
}
export const SLOT_LIST = Object.keys(SLOTS) as OutfitSlot[]

export type GarmentCategory =
  | 'blusas' | 'tops' | 'camisas' | 'playeras' | 'jeans' | 'pantalones' | 'shorts' | 'faldas'
  | 'vestidos' | 'sueteres' | 'chamarras' | 'abrigos' | 'tenis' | 'zapatos' | 'sandalias'
  | 'bolsos' | 'accesorios'

interface CategoryInfo {
  label: string
  singular: string
  en: string
  slot: OutfitSlot
  formality: number
  feminine: boolean
  plural: boolean
}

export const CATEGORIES: Record<GarmentCategory, CategoryInfo> = {
  blusas: { label: 'Blusas', singular: 'blusa', en: 'blouse', slot: 'top', formality: 3, feminine: true, plural: false },
  tops: { label: 'Tops', singular: 'top', en: 'top', slot: 'top', formality: 2, feminine: false, plural: false },
  camisas: { label: 'Camisas', singular: 'camisa', en: 'shirt', slot: 'top', formality: 3, feminine: true, plural: false },
  playeras: { label: 'Playeras', singular: 'playera', en: 't-shirt', slot: 'top', formality: 1, feminine: true, plural: false },
  jeans: { label: 'Jeans', singular: 'jeans', en: 'jeans', slot: 'bottom', formality: 2, feminine: false, plural: true },
  pantalones: { label: 'Pantalones', singular: 'pantalón', en: 'trousers', slot: 'bottom', formality: 3, feminine: false, plural: false },
  shorts: { label: 'Shorts', singular: 'shorts', en: 'shorts', slot: 'bottom', formality: 1, feminine: false, plural: true },
  faldas: { label: 'Faldas', singular: 'falda', en: 'skirt', slot: 'bottom', formality: 3, feminine: true, plural: false },
  vestidos: { label: 'Vestidos', singular: 'vestido', en: 'dress', slot: 'onePiece', formality: 3, feminine: false, plural: false },
  sueteres: { label: 'Suéteres', singular: 'suéter', en: 'sweater', slot: 'top', formality: 2, feminine: false, plural: false },
  chamarras: { label: 'Chamarras', singular: 'chamarra', en: 'jacket', slot: 'outerwear', formality: 2, feminine: true, plural: false },
  abrigos: { label: 'Abrigos', singular: 'abrigo', en: 'coat', slot: 'outerwear', formality: 3, feminine: false, plural: false },
  tenis: { label: 'Tenis', singular: 'tenis', en: 'sneakers', slot: 'shoes', formality: 1, feminine: false, plural: true },
  zapatos: { label: 'Zapatos', singular: 'zapatos', en: 'shoes', slot: 'shoes', formality: 3, feminine: false, plural: true },
  sandalias: { label: 'Sandalias', singular: 'sandalias', en: 'sandals', slot: 'shoes', formality: 1, feminine: true, plural: true },
  bolsos: { label: 'Bolsos', singular: 'bolso', en: 'bag', slot: 'bag', formality: 3, feminine: false, plural: false },
  accesorios: { label: 'Accesorios', singular: 'accesorio', en: 'accessories', slot: 'accessory', formality: 3, feminine: false, plural: true },
}
export const CATEGORY_LIST = Object.keys(CATEGORIES) as GarmentCategory[]

export function categoriesIn(slot: OutfitSlot): GarmentCategory[] {
  return CATEGORY_LIST.filter((c) => CATEGORIES[c].slot === slot)
}

export type FashionStyle =
  | 'casual' | 'casualChic' | 'minimalista' | 'coquette' | 'oldMoney' | 'romantico'
  | 'elegante' | 'streetwear' | 'oficina' | 'pinterestAesthetic'

interface StyleInfo { label: string; en: string; formality: number; related: FashionStyle[] }

export const STYLES: Record<FashionStyle, StyleInfo> = {
  casual: { label: 'Casual', en: 'casual', formality: 1, related: ['casualChic', 'streetwear', 'minimalista'] },
  casualChic: { label: 'Casual chic', en: 'casual chic', formality: 2, related: ['casual', 'minimalista', 'pinterestAesthetic', 'oldMoney'] },
  minimalista: { label: 'Minimalista', en: 'minimalist', formality: 2, related: ['casualChic', 'oldMoney', 'oficina'] },
  coquette: { label: 'Coquette', en: 'coquette', formality: 2, related: ['romantico', 'pinterestAesthetic'] },
  oldMoney: { label: 'Old money', en: 'old money', formality: 4, related: ['elegante', 'minimalista', 'oficina'] },
  romantico: { label: 'Romántico', en: 'romantic', formality: 3, related: ['coquette', 'elegante'] },
  elegante: { label: 'Elegante', en: 'elegant', formality: 4, related: ['oldMoney', 'romantico', 'oficina'] },
  streetwear: { label: 'Streetwear', en: 'streetwear', formality: 1, related: ['casual', 'pinterestAesthetic'] },
  oficina: { label: 'Oficina', en: 'office', formality: 4, related: ['oldMoney', 'minimalista', 'elegante'] },
  pinterestAesthetic: { label: 'Pinterest aesthetic', en: 'aesthetic', formality: 2, related: ['casualChic', 'coquette', 'streetwear'] },
}
export const STYLE_LIST = Object.keys(STYLES) as FashionStyle[]

export type Occasion =
  | 'diario' | 'cafe' | 'trabajo' | 'cita' | 'fiesta' | 'eventoFormal' | 'viaje' | 'brunch' | 'compras' | 'deporte'

interface OccasionInfo { label: string; en: string; formality: number; styles: FashionStyle[] }

export const OCCASIONS: Record<Occasion, OccasionInfo> = {
  diario: { label: 'Día a día', en: 'everyday', formality: 2, styles: ['casual', 'casualChic', 'minimalista'] },
  cafe: { label: 'Café', en: 'coffee date', formality: 2, styles: ['casualChic', 'casual', 'pinterestAesthetic', 'coquette'] },
  trabajo: { label: 'Trabajo', en: 'work', formality: 4, styles: ['oficina', 'oldMoney', 'minimalista', 'elegante'] },
  cita: { label: 'Cita', en: 'date night', formality: 3, styles: ['romantico', 'coquette', 'elegante', 'casualChic'] },
  fiesta: { label: 'Fiesta', en: 'party', formality: 3, styles: ['elegante', 'streetwear', 'pinterestAesthetic'] },
  eventoFormal: { label: 'Evento formal', en: 'formal event', formality: 5, styles: ['elegante', 'oldMoney'] },
  viaje: { label: 'Viaje', en: 'travel', formality: 2, styles: ['casual', 'minimalista', 'streetwear'] },
  brunch: { label: 'Brunch', en: 'brunch', formality: 2, styles: ['casualChic', 'romantico', 'coquette'] },
  compras: { label: 'Compras', en: 'shopping day', formality: 2, styles: ['casual', 'casualChic', 'streetwear'] },
  deporte: { label: 'Deporte', en: 'athleisure', formality: 1, styles: ['casual', 'streetwear'] },
}
export const OCCASION_LIST = Object.keys(OCCASIONS) as Occasion[]

export type Season = 'primavera' | 'verano' | 'otono' | 'invierno'
export const SEASONS: Record<Season, { label: string; cool: boolean }> = {
  primavera: { label: 'Primavera', cool: false },
  verano: { label: 'Verano', cool: false },
  otono: { label: 'Otoño', cool: true },
  invierno: { label: 'Invierno', cool: true },
}
export const SEASON_LIST = Object.keys(SEASONS) as Season[]

export type GarmentPattern = 'liso' | 'rayas' | 'cuadros' | 'floral' | 'lunares' | 'animalPrint' | 'estampado' | 'otro'
export const PATTERNS: Record<GarmentPattern, { label: string; en: string }> = {
  liso: { label: 'Liso', en: '' },
  rayas: { label: 'Rayas', en: 'striped' },
  cuadros: { label: 'Cuadros', en: 'plaid' },
  floral: { label: 'Floral', en: 'floral' },
  lunares: { label: 'Lunares', en: 'polka dot' },
  animalPrint: { label: 'Animal print', en: 'leopard print' },
  estampado: { label: 'Estampado', en: 'printed' },
  otro: { label: 'Otro', en: '' },
}
export const PATTERN_LIST = Object.keys(PATTERNS) as GarmentPattern[]

export type GarmentMaterial =
  | 'desconocido' | 'algodon' | 'mezclilla' | 'lino' | 'seda' | 'satin' | 'punto' | 'lana' | 'piel' | 'poliester' | 'otro'
export const MATERIALS: Record<GarmentMaterial, string> = {
  desconocido: 'Sin especificar', algodon: 'Algodón', mezclilla: 'Mezclilla', lino: 'Lino', seda: 'Seda',
  satin: 'Satín', punto: 'Punto / tejido', lana: 'Lana', piel: 'Piel', poliester: 'Poliéster', otro: 'Otro',
}
export const MATERIAL_LIST = Object.keys(MATERIALS) as GarmentMaterial[]

export type GarmentSilhouette = 'noDefinida' | 'ajustada' | 'recta' | 'holgada' | 'oversize' | 'cropped' | 'acampanada' | 'wideLeg'
export const SILHOUETTES: Record<GarmentSilhouette, string> = {
  noDefinida: 'Sin especificar', ajustada: 'Ajustada', recta: 'Recta', holgada: 'Holgada',
  oversize: 'Oversize', cropped: 'Cropped', acampanada: 'Acampanada', wideLeg: 'Wide leg',
}
export const SILHOUETTE_LIST = Object.keys(SILHOUETTES) as GarmentSilhouette[]

export function formalityLabel(level: number): string {
  if (level <= 1) return 'Muy casual'
  if (level === 2) return 'Casual'
  if (level === 3) return 'Arreglado casual'
  if (level === 4) return 'Elegante'
  return 'Formal'
}

export function clampFormality(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)))
}
