import type { FashionColor } from './color'
import type {
  FashionStyle, GarmentCategory, GarmentMaterial, GarmentPattern, GarmentSilhouette, Occasion, Season,
} from './fashion'
import type { CollageComposition } from './collage'
import type { RecreationTarget } from './recreation'

/** A real garment photographed by the user. Photos live in the `images` table; here only their IDs. */
export interface Garment {
  id: string
  name: string
  imageFileName?: string
  cutoutFileName?: string
  thumbnailFileName?: string
  usesCutout: boolean
  category: GarmentCategory
  primaryColor: FashionColor
  secondaryColors: FashionColor[]
  detectedColorHex?: string
  material: GarmentMaterial
  pattern: GarmentPattern
  styles: FashionStyle[]
  silhouette: GarmentSilhouette
  seasons: Season[]
  formality: number
  occasions: Occasion[]
  tags: string[]
  notes: string
  isAvailable: boolean
  isFavorite: boolean
  wearCount: number
  lastWornAt?: string
  createdAt: string
  updatedAt: string
}

/** A saved outfit. `garmentIDs` may reference deleted garments: the UI shows a warning. */
export interface Look {
  id: string
  name: string
  garmentIDs: string[]
  composition?: CollageComposition
  exportedImageFileName?: string
  style?: FashionStyle
  occasion?: Occasion
  tags: string[]
  notes: string
  explanation: string
  pinterestURLs: string[]
  referenceIDs: string[]
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  lastWornAt?: string
}

export interface LookCollection {
  id: string
  name: string
  lookIDs: string[]
  createdAt: string
}

export interface PlannedOutfit {
  id: string
  /** Local day as YYYY-MM-DD. */
  day: string
  lookID: string
  note: string
  markedAsWorn: boolean
}

/** Pinterest link, saved search or imported screenshot. LOOKSY never fabricates pins. */
export interface InspirationReference {
  id: string
  title: string
  urlString?: string
  searchQuery?: string
  imageFileName?: string
  colors: FashionColor[]
  style?: FashionStyle
  notes: string
  isFavorite: boolean
  linkedLookIDs: string[]
  linkedGarmentIDs: string[]
  target?: RecreationTarget
  formality: number
  createdAt: string
}

export interface StoredImage {
  /** File-name-like ID ("<uuid>-orig.jpg"), kept compatible with the iOS backup format. */
  id: string
  blob: Blob
  width: number
  height: number
}

export interface UserPreferences {
  version: number
  displayName: string
  favoriteStyles: FashionStyle[]
  favoriteColors: FashionColor[]
  avoidedColors: FashionColor[]
  favoriteGarmentIDs: string[]
  preferredShoes: GarmentCategory[]
  comfortLevel: number
  usualFormality: number
  silhouettePreferences: GarmentSilhouette[]
  frequentOccasions: Occasion[]
  seasons: Season[]
  avoidHeels: boolean
}

export function defaultPreferences(): UserPreferences {
  return {
    version: 1, displayName: '', favoriteStyles: [], favoriteColors: [], avoidedColors: [], favoriteGarmentIDs: [],
    preferredShoes: [], comfortLevel: 3, usualFormality: 2, silhouettePreferences: [], frequentOccasions: [],
    seasons: [], avoidHeels: false,
  }
}

export function newGarment(partial: Pick<Garment, 'id' | 'name' | 'category' | 'primaryColor'> & Partial<Garment>): Garment {
  const now = new Date().toISOString()
  return {
    usesCutout: false, secondaryColors: [], material: 'desconocido', pattern: 'liso', styles: [], silhouette: 'noDefinida',
    seasons: [], formality: 2, occasions: [], tags: [], notes: '', isAvailable: true, isFavorite: false, wearCount: 0,
    createdAt: now, updatedAt: now,
    ...partial,
  }
}

export const garmentColors = (g: Pick<Garment, 'primaryColor' | 'secondaryColors'>): FashionColor[] =>
  [g.primaryColor, ...g.secondaryColors]

export function isHeel(g: Pick<Garment, 'name' | 'tags'>): boolean {
  const text = [g.name, ...g.tags].join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return text.includes('tacon') || text.includes('stiletto') || text.includes('heel')
}
