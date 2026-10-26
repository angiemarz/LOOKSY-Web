import type { FashionColor } from './color'
import { CATEGORIES, type FashionStyle, type GarmentCategory, type Occasion, type OutfitSlot } from './fashion'

/** Local Spanish/English fashion vocabulary (normalized: no accents, lowercase). */
export const COLOR_PHRASES: [string, FashionColor][] = [
  ['azul marino', 'azulMarino'], ['azul claro', 'celeste'], ['azul cielo', 'celeste'], ['rosa palo', 'rosaPalo'],
  ['palo de rosa', 'rosaPalo'], ['rosa pastel', 'rosaPalo'], ['rosa claro', 'rosaPalo'], ['verde oliva', 'oliva'],
  ['verde militar', 'oliva'], ['verde menta', 'menta'], ['light blue', 'celeste'], ['navy blue', 'azulMarino'],
  ['blush pink', 'rosaPalo'],
]

const colorGroups: [FashionColor, string[]][] = [
  ['negro', ['negro', 'negra', 'negros', 'negras', 'black']],
  ['blanco', ['blanco', 'blanca', 'blancos', 'blancas', 'white']],
  ['gris', ['gris', 'grises', 'gray', 'grey']],
  ['crema', ['crema', 'cremas', 'marfil', 'hueso', 'ivory', 'cream']],
  ['beige', ['beige', 'beiges', 'arena', 'nude', 'khaki', 'caqui']],
  ['camel', ['camel', 'caramelo', 'tan']],
  ['cafe', ['cafe', 'cafes', 'marron', 'marrones', 'chocolate', 'brown']],
  ['mezclilla', ['denim']],
  ['azulMarino', ['marino', 'navy']],
  ['azul', ['azul', 'azules', 'blue', 'rey']],
  ['celeste', ['celeste', 'celestes']],
  ['verde', ['verde', 'verdes', 'green', 'esmeralda']],
  ['oliva', ['oliva', 'militar', 'olive']],
  ['menta', ['menta', 'mint']],
  ['rojo', ['rojo', 'roja', 'rojos', 'rojas', 'red']],
  ['vino', ['vino', 'guinda', 'burdeos', 'tinto', 'burgundy', 'borgona']],
  ['rosa', ['rosa', 'rosas', 'rosado', 'rosada', 'rosados', 'rosadas', 'pink']],
  ['fucsia', ['fucsia', 'fiusha', 'magenta', 'fuchsia']],
  ['morado', ['morado', 'morada', 'morados', 'moradas', 'purpura', 'purple', 'violeta']],
  ['lila', ['lila', 'lilas', 'lavanda', 'lilac', 'lavender']],
  ['amarillo', ['amarillo', 'amarilla', 'amarillos', 'amarillas', 'yellow']],
  ['mostaza', ['mostaza', 'mustard']],
  ['naranja', ['naranja', 'naranjas', 'anaranjado', 'anaranjada', 'orange']],
  ['coral', ['coral', 'corales', 'durazno', 'peach']],
  ['dorado', ['dorado', 'dorada', 'dorados', 'doradas', 'gold', 'oro']],
  ['plateado', ['plateado', 'plateada', 'plateados', 'plateadas', 'plata', 'silver']],
  ['multicolor', ['multicolor', 'colorido', 'colorida', 'coloridos', 'coloridas']],
]
export const COLOR_WORDS = new Map<string, FashionColor>(colorGroups.flatMap(([c, words]) => words.map((w) => [w, c] as const)))

/** Words that only count as a color next to a garment ("botas cafe" yes, "tomar un cafe" no). */
export const AMBIGUOUS_COLOR_WORDS = new Set(['cafe', 'cafes', 'oro', 'rey', 'tan', 'arena', 'plata', 'vino'])

export interface GarmentTerm { category: GarmentCategory | null; slot: OutfitSlot; isHeel: boolean }

const garmentGroups: [GarmentCategory, string[], boolean?][] = [
  ['blusas', ['blusa', 'blusas', 'blouse', 'blouses']],
  ['tops', ['top', 'tops', 'crop', 'corset', 'bodysuit', 'body']],
  ['camisas', ['camisa', 'camisas', 'shirt', 'shirts']],
  ['playeras', ['playera', 'playeras', 'camiseta', 'camisetas', 'remera', 'remeras', 'tshirt', 'polo']],
  ['jeans', ['jean', 'jeans', 'vaquero', 'vaqueros', 'mezclilla']],
  ['pantalones', ['pantalon', 'pantalones', 'pants', 'trousers', 'leggings', 'joggers']],
  ['shorts', ['short', 'shorts', 'bermuda', 'bermudas']],
  ['faldas', ['falda', 'faldas', 'minifalda', 'skirt']],
  ['vestidos', ['vestido', 'vestidos', 'dress', 'jumpsuit', 'enterizo', 'overol']],
  ['sueteres', ['sueter', 'sueteres', 'sweater', 'jersey', 'cardigan', 'sudadera', 'hoodie', 'sweatshirt']],
  ['chamarras', ['chamarra', 'chamarras', 'chaqueta', 'chaquetas', 'blazer', 'blazers', 'saco', 'jacket', 'cazadora']],
  ['abrigos', ['abrigo', 'abrigos', 'gabardina', 'trench', 'coat', 'poncho']],
  ['tenis', ['tenis', 'sneakers', 'deportivos']],
  ['zapatos', ['zapato', 'zapatos', 'flats', 'mocasines', 'mocasin', 'botas', 'bota', 'botines', 'botin', 'loafers', 'shoes', 'balerinas']],
  ['zapatos', ['tacon', 'tacones', 'heels', 'stilettos', 'zapatillas', 'zapatilla'], true],
  ['sandalias', ['sandalia', 'sandalias', 'sandals', 'huaraches']],
  ['bolsos', ['bolso', 'bolsos', 'bolsa', 'bolsas', 'cartera', 'mochila', 'clutch', 'bag', 'tote']],
  ['accesorios', ['accesorio', 'accesorios', 'collar', 'collares', 'aretes', 'arete', 'cinturon', 'lentes', 'gorra', 'bufanda', 'reloj', 'pulsera', 'sombrero', 'diadema', 'panuelo', 'jewelry']],
]
export const GARMENT_WORDS = new Map<string, GarmentTerm>([
  ...garmentGroups.flatMap(([category, words, heel]) =>
    words.map((w) => [w, { category, slot: CATEGORIES[category].slot, isHeel: heel ?? false }] as const)),
  ['calzado', { category: null, slot: 'shoes', isHeel: false }],
])

export const NEGATION_WORDS = new Set(['sin', 'no', 'evitar', 'evita', 'nada', 'excepto', 'menos'])

export const OCCASION_PHRASES: [string, Occasion][] = [
  ['tomar cafe', 'cafe'], ['tomar un cafe', 'cafe'], ['por un cafe', 'cafe'], ['al cafe', 'cafe'],
  ['cafeteria', 'cafe'], ['coffee', 'cafe'], ['cafecito', 'cafe'],
  ['trabajo', 'trabajo'], ['trabajar', 'trabajo'], ['oficina', 'trabajo'], ['junta', 'trabajo'],
  ['reunion', 'trabajo'], ['entrevista', 'trabajo'], ['work', 'trabajo'],
  ['primera cita', 'cita'], ['cita', 'cita'], ['date', 'cita'], ['cena romantica', 'cita'], ['aniversario', 'cita'],
  ['fiesta', 'fiesta'], ['antro', 'fiesta'], ['party', 'fiesta'], ['salir de noche', 'fiesta'], ['concierto', 'fiesta'],
  ['cumpleanos', 'fiesta'], ['noche de chicas', 'fiesta'], ['bar', 'fiesta'], ['cena', 'cita'],
  ['boda', 'eventoFormal'], ['gala', 'eventoFormal'], ['graduacion', 'eventoFormal'], ['evento formal', 'eventoFormal'],
  ['ceremonia', 'eventoFormal'], ['bautizo', 'eventoFormal'], ['xv anos', 'eventoFormal'],
  ['viaje', 'viaje'], ['viajar', 'viaje'], ['aeropuerto', 'viaje'], ['vacaciones', 'viaje'], ['avion', 'viaje'],
  ['brunch', 'brunch'], ['desayuno', 'brunch'], ['almuerzo', 'brunch'], ['comida con amigas', 'brunch'],
  ['compras', 'compras'], ['shopping', 'compras'], ['centro comercial', 'compras'], ['mall', 'compras'],
  ['gym', 'deporte'], ['gimnasio', 'deporte'], ['correr', 'deporte'], ['ejercicio', 'deporte'], ['yoga', 'deporte'],
  ['pilates', 'deporte'], ['deporte', 'deporte'], ['entrenar', 'deporte'],
  ['dia a dia', 'diario'], ['diario', 'diario'], ['everyday', 'diario'], ['universidad', 'diario'],
  ['escuela', 'diario'], ['clases', 'diario'], ['uni', 'diario'],
]

export const STYLE_PHRASES: [string, FashionStyle][] = [
  ['casual chic', 'casualChic'], ['smart casual', 'casualChic'], ['chic', 'casualChic'],
  ['old money', 'oldMoney'], ['quiet luxury', 'oldMoney'], ['clasico', 'oldMoney'], ['clasica', 'oldMoney'],
  ['pinterest aesthetic', 'pinterestAesthetic'], ['pinterest', 'pinterestAesthetic'], ['aesthetic', 'pinterestAesthetic'],
  ['tendencia', 'pinterestAesthetic'], ['trendy', 'pinterestAesthetic'], ['de moda', 'pinterestAesthetic'],
  ['minimalista', 'minimalista'], ['minimal', 'minimalista'], ['basico', 'minimalista'], ['basica', 'minimalista'],
  ['sencillo', 'minimalista'], ['sencilla', 'minimalista'], ['clean girl', 'minimalista'],
  ['coquette', 'coquette'], ['monos', 'coquette'], ['lazos', 'coquette'], ['coqueta', 'coquette'],
  ['romantico', 'romantico'], ['romantica', 'romantico'], ['delicado', 'romantico'], ['delicada', 'romantico'],
  ['elegante', 'elegante'], ['arreglada', 'elegante'], ['arreglado', 'elegante'], ['sofisticada', 'elegante'],
  ['sofisticado', 'elegante'], ['glam', 'elegante'], ['formal', 'elegante'],
  ['streetwear', 'streetwear'], ['urbano', 'streetwear'], ['urbana', 'streetwear'], ['street', 'streetwear'],
  ['oficina', 'oficina'], ['profesional', 'oficina'], ['ejecutiva', 'oficina'], ['business', 'oficina'],
  ['casual', 'casual'], ['relajado', 'casual'], ['relajada', 'casual'],
]

export const COOL_WEATHER = ['fresco', 'fresca', 'frio', 'fria', 'invierno', 'lluvia', 'lluvioso', 'nublado', 'otono', 'templado']
export const WARM_WEATHER = ['calor', 'caluroso', 'calurosa', 'verano', 'playa', 'soleado', 'soleada', 'caliente']
export const COMFORT_WORDS = ['comoda', 'comodo', 'comodidad', 'comodas', 'comodos', 'caminar mucho', 'sin sufrir', 'practica', 'practico']
export const FEMININE_WORDS = ['femenino', 'femenina', 'girly', 'coqueta', 'femeninos', 'femeninas']

export const STOP_WORDS = new Set(['de', 'la', 'el', 'los', 'las', 'mi', 'mis', 'con', 'y', 'un', 'una', 'para', 'en', 'a', 'al', 'del', 'que', 'quiero', 'outfit', 'look', 'algo', 'arma', 'combina', 'por', 'favor', 'estilo', 'color', 'tono'])
