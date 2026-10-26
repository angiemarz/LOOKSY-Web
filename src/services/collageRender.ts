import { db } from '@/db/db'
import { ASPECTS, autoComposition, sortedItems, type CollageAspect, type CollageComposition } from '@/domain/collage'
import { CATEGORIES } from '@/domain/fashion'
import type { Garment } from '@/domain/models'
import { decodeImage, toCanvas, hasTransparency, canvas, canvasToBlob } from './images'
import { collageImageOf } from './wardrobe'

/** Everything the collage needs to draw one garment. */
export interface CollagePiece {
  garment: Garment
  url?: string
  image?: HTMLImageElement
  aspect: number
  isCutout: boolean
}

const urlCache = new Map<string, Promise<string | undefined>>()

/** Object URL for a stored image (cached for the session). */
export function imageURL(id: string | undefined): Promise<string | undefined> {
  if (!id) return Promise.resolve(undefined)
  let pending = urlCache.get(id)
  if (!pending) {
    pending = db.images.get(id).then((rec) => (rec ? URL.createObjectURL(rec.blob) : undefined))
    urlCache.set(id, pending)
  }
  return pending
}

export function forgetImageURL(id: string | undefined) {
  if (!id) return
  urlCache.get(id)?.then((url) => url && URL.revokeObjectURL(url))
  urlCache.delete(id)
}

export async function loadPieces(garments: Garment[]): Promise<CollagePiece[]> {
  return Promise.all(garments.map(async (garment) => {
    const id = collageImageOf(garment)
    const rec = id ? await db.images.get(id) : undefined
    if (!rec || !id) return { garment, aspect: 1.2, isCutout: false }
    try {
      const image = await decodeImage(rec.blob)
      const url = await imageURL(id)
      const isCutout = rec.blob.type === 'image/png' && hasTransparency(toCanvas(image, 64))
      return { garment, image, url, aspect: image.naturalHeight / Math.max(1, image.naturalWidth), isCutout }
    } catch {
      return { garment, aspect: 1.2, isCutout: false }
    }
  }))
}

/** Placeholder piece for a deleted garment so the collage shows the gap. */
export function missingPiece(id: string): CollagePiece {
  const now = new Date().toISOString()
  return {
    garment: { id, name: 'Prenda eliminada', category: 'accesorios', primaryColor: 'gris', secondaryColors: [], usesCutout: false, material: 'desconocido', pattern: 'liso', styles: [], silhouette: 'noDefinida', seasons: [], formality: 2, occasions: [], tags: [], notes: '', isAvailable: false, isFavorite: false, wearCount: 0, createdAt: now, updatedAt: now },
    aspect: 1, isCutout: false,
  }
}

export function automaticComposition(pieces: CollagePiece[], aspect: CollageAspect = 'portrait', backgroundHex = '#F5EFE8'): CollageComposition {
  return autoComposition(pieces.map((p) => ({ garmentID: p.garment.id, slot: CATEGORIES[p.garment.category].slot, imageAspect: p.aspect })), aspect, backgroundHex)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Renders the collage to a PNG (1080 px wide by default). */
export async function renderCollage(composition: CollageComposition, pieces: CollagePiece[], width = 1080): Promise<Blob> {
  const height = Math.round(width * ASPECTS[composition.aspect].heightRatio)
  const c = canvas(width, height)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = composition.backgroundHex
  ctx.fillRect(0, 0, width, height)
  for (const item of sortedItems(composition)) {
    const piece = pieces.find((p) => p.garment.id === item.garmentID)
    const w = item.width * width
    const h = w * (piece?.aspect ?? 1.2)
    ctx.save()
    ctx.translate(item.centerX * width, item.centerY * height)
    ctx.rotate((item.rotation * Math.PI) / 180)
    if (piece?.image) {
      ctx.shadowColor = 'rgba(0,0,0,0.16)'
      ctx.shadowBlur = width * 0.016
      ctx.shadowOffsetY = width * 0.008
      if (piece.isCutout || !composition.cardStyleForPhotos) {
        ctx.drawImage(piece.image, -w / 2, -h / 2, w, h)
      } else {
        const pad = w * 0.03
        roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.08)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.shadowColor = 'transparent'
        roundRect(ctx, -w / 2 + pad, -h / 2 + pad, w - 2 * pad, h - 2 * pad, w * 0.06)
        ctx.clip()
        ctx.drawImage(piece.image, -w / 2 + pad, -h / 2 + pad, w - 2 * pad, h - 2 * pad)
      }
    } else {
      roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.08)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fill()
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = '#D8A7B1'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#6B5F57'
      ctx.font = `${Math.round(w * 0.1)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(piece?.garment.name ?? 'Prenda eliminada', 0, 0, w * 0.9)
    }
    ctx.restore()
  }
  return canvasToBlob(c, 'image/png')
}

/** Shares a file with the system sheet when possible (iOS: "Guardar imagen"), otherwise downloads it. */
export async function shareOrDownload(blob: Blob, fileName: string, title = 'LOOKSY'): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'cancelled'
    }
  }
  downloadBlob(blob, fileName)
  return 'downloaded'
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
