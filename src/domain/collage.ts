import type { OutfitSlot } from './fashion'

export type CollageAspect = 'square' | 'portrait' | 'story'

export const ASPECTS: Record<CollageAspect, { label: string; heightRatio: number }> = {
  square: { label: '1:1', heightRatio: 1 },
  portrait: { label: '4:5', heightRatio: 1.25 },
  story: { label: '9:16', heightRatio: 16 / 9 },
}
export const ASPECT_LIST = Object.keys(ASPECTS) as CollageAspect[]

/** One garment on the canvas; positions are normalized (0...1) so the layout survives resizing. */
export interface CollageItem {
  id: string
  garmentID: string
  centerX: number
  centerY: number
  /** Width as a fraction of canvas width. */
  width: number
  rotation: number
  zIndex: number
}

export interface CollageComposition {
  version: number
  aspect: CollageAspect
  backgroundHex: string
  cardStyleForPhotos: boolean
  items: CollageItem[]
}

export const BACKGROUND_PRESETS = ['#F5EFE8', '#FAF8F5', '#FFFFFF', '#E8DDD0', '#F3E2E5', '#D8A7B1', '#E6E9E3', '#DDE5EE', '#292522']

export const sortedItems = (c: CollageComposition): CollageItem[] => [...c.items].sort((a, b) => a.zIndex - b.zIndex)

export function normalizeZ(c: CollageComposition): CollageComposition {
  const order = sortedItems(c).map((i) => i.id)
  return { ...c, items: c.items.map((i) => ({ ...i, zIndex: order.indexOf(i.id) })) }
}

export function reorder(c: CollageComposition, itemID: string, mode: 'front' | 'back' | 'forward' | 'backward'): CollageComposition {
  const list = sortedItems(c)
  const index = list.findIndex((i) => i.id === itemID)
  if (index < 0) return c
  const [item] = list.splice(index, 1)
  const target = mode === 'front' ? list.length : mode === 'back' ? 0 : mode === 'forward' ? Math.min(index + 1, list.length) : Math.max(index - 1, 0)
  list.splice(target, 0, item!)
  return { ...c, items: list.map((i, z) => ({ ...i, zIndex: z })) }
}

export interface LayoutInput {
  garmentID: string
  slot: OutfitSlot
  /** Image height / width (1.2 when unknown). */
  imageAspect: number
}

interface Box { cx: number; cy: number; maxW: number; maxH: number; rotation: number; z: number }

const ACCESSORY_SPOTS: [number, number, number][] = [
  [0.15, 0.1, -10], [0.86, 0.09, 8], [0.14, 0.88, 6], [0.86, 0.91, -6], [0.13, 0.48, 4], [0.88, 0.4, -4],
]

/** Flat-lay layout: top centered, bottom below, shoes at the bottom, bag on a side, accessories around. */
export function layoutCollage(inputs: LayoutInput[], aspect: CollageAspect, idFactory: () => string = () => crypto.randomUUID()): CollageItem[] {
  const hasSide = inputs.some((i) => i.slot === 'outerwear' || i.slot === 'bag')
  const column = hasSide ? 0.4 : 0.5
  const heightRatio = ASPECTS[aspect].heightRatio
  const stretch = heightRatio >= 1.2 ? 1 : 0.92
  let acc = 0
  const items = inputs.map((input): CollageItem => {
    let box: Box
    switch (input.slot) {
      case 'top': box = { cx: column, cy: 0.24, maxW: 0.48, maxH: 0.36 * stretch, rotation: 0, z: 2 }; break
      case 'bottom': box = { cx: column, cy: 0.6, maxW: 0.42, maxH: 0.4 * stretch, rotation: 0, z: 1 }; break
      case 'onePiece': box = { cx: column, cy: 0.43, maxW: 0.5, maxH: 0.66 * stretch, rotation: 0, z: 2 }; break
      case 'shoes': box = { cx: column, cy: 0.89, maxW: 0.3, maxH: 0.15, rotation: -6, z: 3 }; break
      case 'outerwear': box = { cx: 0.76, cy: 0.28, maxW: 0.38, maxH: 0.42 * stretch, rotation: 3, z: 0 }; break
      case 'bag': box = { cx: 0.8, cy: 0.68, maxW: 0.3, maxH: 0.24, rotation: 4, z: 4 }; break
      case 'accessory': {
        const spot = ACCESSORY_SPOTS[acc % ACCESSORY_SPOTS.length]!
        acc++
        box = { cx: spot[0], cy: spot[1], maxW: 0.2, maxH: 0.14, rotation: spot[2], z: 5 + acc }
        break
      }
    }
    const imageAspect = input.imageAspect > 0 ? input.imageAspect : 1.2
    const width = Math.min(box.maxW, (box.maxH * heightRatio) / imageAspect)
    return { id: idFactory(), garmentID: input.garmentID, centerX: box.cx, centerY: box.cy, width: Math.max(width, 0.08), rotation: box.rotation, zIndex: box.z }
  })
  return normalizeZ({ version: 1, aspect, backgroundHex: '', cardStyleForPhotos: true, items }).items
}

export function autoComposition(inputs: LayoutInput[], aspect: CollageAspect = 'portrait', backgroundHex = '#F5EFE8'): CollageComposition {
  return { version: 1, aspect, backgroundHex, cardStyleForPhotos: true, items: layoutCollage(inputs, aspect) }
}

/** Height of an item as a fraction of canvas height. */
export function heightFraction(item: CollageItem, imageAspect: number, aspect: CollageAspect): number {
  return (item.width * (imageAspect > 0 ? imageAspect : 1.2)) / ASPECTS[aspect].heightRatio
}

export const garmentIDsIn = (c: CollageComposition): string[] => sortedItems(c).map((i) => i.garmentID)
