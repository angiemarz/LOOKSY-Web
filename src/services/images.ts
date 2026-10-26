import { analyzePixels, type ColorEntry } from '@/domain/color'
import { isUsableCutout, removePlainBackground } from '@/domain/segmentation'
import { db, type LooksyDB } from '@/db/db'
import type { StoredImage } from '@/domain/models'

export const MAX_ORIGINAL = 1600
export const THUMB = 420

/** Decodes a file or blob into an image element (EXIF orientation applied by the browser). */
export async function decodeImage(source: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(source)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new Error('No se pudo leer la imagen. Si es HEIC, expórtala como JPEG o usa la cámara desde LOOKSY.')
  } finally {
    // Revoke on next tick so the decoded image stays drawable.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

type Drawable = HTMLImageElement | HTMLCanvasElement

const sizeOf = (s: Drawable) =>
  s instanceof HTMLImageElement ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height }

export function canvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(width))
  c.height = Math.max(1, Math.round(height))
  return c
}

export function toCanvas(source: Drawable, maxDimension = Infinity): HTMLCanvasElement {
  const { w, h } = sizeOf(source)
  const ratio = Math.min(1, maxDimension / Math.max(w, h))
  const c = canvas(w * ratio, h * ratio)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, c.width, c.height)
  return c
}

export function canvasToBlob(c: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality = 0.86): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo codificar la imagen.'))), type, quality))
}

export function rotateCanvas(source: HTMLCanvasElement, clockwise: boolean): HTMLCanvasElement {
  const c = canvas(source.height, source.width)
  const ctx = c.getContext('2d')!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(((clockwise ? 1 : -1) * Math.PI) / 2)
  ctx.drawImage(source, -source.width / 2, -source.height / 2)
  return c
}

/** Crops with a normalized rectangle (0...1). */
export function cropCanvas(source: HTMLCanvasElement, rect: { x: number; y: number; width: number; height: number }): HTMLCanvasElement {
  const x = Math.max(0, rect.x) * source.width
  const y = Math.max(0, rect.y) * source.height
  const w = Math.min(1 - rect.x, rect.width) * source.width
  const h = Math.min(1 - rect.y, rect.height) * source.height
  const c = canvas(w, h)
  c.getContext('2d')!.drawImage(source, x, y, w, h, 0, 0, c.width, c.height)
  return c
}

export function hasTransparency(c: HTMLCanvasElement): boolean {
  const small = toCanvas(c, 48)
  const data = small.getContext('2d')!.getImageData(0, 0, small.width, small.height).data
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 250) return true
  return false
}

/** Dominant colors measured on the device. */
export function analyzeColors(source: Drawable): ColorEntry[] {
  const side = 64
  const c = canvas(side, side)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, side, side)
  return analyzePixels(ctx.getImageData(0, 0, side, side).data, side)
}

/** Plain-background removal; returns null when the result is not usable. */
export function removeBackground(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const work = toCanvas(source, 900)
  const ctx = work.getContext('2d', { willReadFrequently: true })!
  const data = ctx.getImageData(0, 0, work.width, work.height)
  const result = removePlainBackground({ width: work.width, height: work.height, data: data.data })
  if (!isUsableCutout(result) || !result.bounds) return null
  data.data.set(result.image.data)
  ctx.putImageData(data, 0, 0)
  const { x, y, width, height } = result.bounds
  const pad = Math.round(Math.max(width, height) * 0.04)
  const out = canvas(width + pad * 2, height + pad * 2)
  out.getContext('2d')!.drawImage(work, x, y, width, height, pad, pad, width, height)
  return out
}

/** Foreground bounds (normalized) used to auto-frame a photo while keeping its background. */
export function foregroundBounds(source: HTMLCanvasElement): { x: number; y: number; width: number; height: number } | null {
  const work = toCanvas(source, 600)
  const data = work.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, work.width, work.height)
  const result = removePlainBackground({ width: work.width, height: work.height, data: data.data })
  if (!isUsableCutout(result) || !result.bounds) return null
  const b = result.bounds
  const padX = b.width * 0.08, padY = b.height * 0.08
  const x = Math.max(0, (b.x - padX) / work.width)
  const y = Math.max(0, (b.y - padY) / work.height)
  return { x, y, width: Math.min(1 - x, (b.width + 2 * padX) / work.width), height: Math.min(1 - y, (b.height + 2 * padY) / work.height) }
}

// MARK: Storage

export async function storeCanvas(id: string, c: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', database: LooksyDB = db): Promise<string> {
  const blob = await canvasToBlob(c, type)
  const record: StoredImage = { id, blob, width: c.width, height: c.height }
  await database.images.put(record)
  return id
}

/** Saves the original (≤1600 px) and a thumbnail. PNG is kept when the image has transparency. */
export async function storePhotoSet(baseID: string, source: HTMLCanvasElement, database: LooksyDB = db): Promise<{ original: string; thumbnail: string }> {
  const png = hasTransparency(source)
  const stamp = Date.now().toString(36)
  const ext = png ? 'png' : 'jpg'
  const type = png ? 'image/png' : 'image/jpeg'
  const original = await storeCanvas(`${baseID}-orig-${stamp}.${ext}`, toCanvas(source, MAX_ORIGINAL), type, database)
  const thumbnail = await storeCanvas(`${baseID}-thumb-${stamp}.${ext}`, toCanvas(source, THUMB), type, database)
  return { original, thumbnail }
}

export async function storeThumbnail(baseID: string, source: HTMLCanvasElement, database: LooksyDB = db): Promise<string> {
  const png = hasTransparency(source)
  return storeCanvas(`${baseID}-thumb-${Date.now().toString(36)}.${png ? 'png' : 'jpg'}`, toCanvas(source, THUMB), png ? 'image/png' : 'image/jpeg', database)
}

export async function storeCutout(baseID: string, source: HTMLCanvasElement, database: LooksyDB = db): Promise<string> {
  return storeCanvas(`${baseID}-cutout-${Date.now().toString(36)}.png`, toCanvas(source, MAX_ORIGINAL), 'image/png', database)
}

export async function deleteImages(ids: (string | undefined)[], database: LooksyDB = db): Promise<void> {
  const list = ids.filter((x): x is string => !!x)
  if (list.length) await database.images.bulkDelete(list)
}

/** Loads a stored image as a canvas (for editing). */
export async function loadCanvas(id: string, database: LooksyDB = db): Promise<HTMLCanvasElement | null> {
  const rec = await database.images.get(id)
  if (!rec) return null
  return toCanvas(await decodeImage(rec.blob))
}
