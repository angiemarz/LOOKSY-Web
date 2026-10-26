import { useEffect, useState } from 'react'
import { db } from '@/db/db'
import { loadPieces, missingPiece, automaticComposition, type CollagePiece } from '@/services/collageRender'
import { CollageCanvas } from './CollageCanvas'
import { Link } from 'react-router-dom'
import { Heart, TriangleAlert } from 'lucide-react'
import { CATEGORIES, STYLES } from '@/domain/fashion'
import type { Garment, Look } from '@/domain/models'
import { ColorDot, StoredImage } from './primitives'

export function GarmentCard({ garment, to, compact }: { garment: Garment; to?: string; compact?: boolean }) {
  const body = (
    <div className={garment.isAvailable ? '' : 'opacity-60'}>
      <div className={`relative overflow-hidden rounded-3xl bg-cream ${compact ? 'aspect-square' : 'aspect-[4/5]'}`}>
        <StoredImage id={garment.thumbnailFileName ?? garment.imageFileName} alt={garment.name} className="size-full p-3" />
        {garment.isFavorite && (
          <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-surface/80 text-accent backdrop-blur" aria-label="Favorita">
            <Heart size={14} fill="currentColor" />
          </span>
        )}
      </div>
      {!compact && (
        <div className="mt-2 px-1">
          <p className="truncate text-sm font-medium text-ink">{garment.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ColorDot color={garment.primaryColor} size={10} />
            {CATEGORIES[garment.category].label}
            {!garment.isAvailable && ' · No disponible'}
          </p>
        </div>
      )}
    </div>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}

export function LookCard({ look, missing = 0 }: { look: Look; missing?: number }) {
  return (
    <Link to={`/looks/${look.id}`} className="block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-cream">
        <LookPreview look={look} />
        {look.isFavorite && (
          <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-surface/80 text-accent backdrop-blur" aria-label="Favorito">
            <Heart size={14} fill="currentColor" />
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 px-1 text-sm font-medium text-ink">{look.name}</p>
      <p className="flex items-center gap-1 px-1 text-xs text-muted">
        {look.style ? STYLES[look.style].label : `${look.garmentIDs.length} prendas`}
        {missing > 0 && (
          <span className="ml-1 inline-flex items-center gap-0.5 text-danger" aria-label={`${missing} prenda(s) eliminada(s)`}>
            <TriangleAlert size={12} />{missing}
          </span>
        )}
      </p>
    </Link>
  )
}


/** Live collage thumbnail rendered from the look's composition and current garments. */
export function LookPreview({ look }: { look: Look }) {
  const [pieces, setPieces] = useState<CollagePiece[] | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const garments = await db.garments.bulkGet(look.garmentIDs)
      const loaded = await loadPieces(garments.filter((g): g is Garment => !!g))
      const missing = look.garmentIDs.filter((_, i) => !garments[i]).map((id) => missingPiece(id))
      if (alive) setPieces([...loaded, ...missing])
    })()
    return () => { alive = false }
  }, [look.id, look.updatedAt, look.garmentIDs.join()])
  if (!pieces) return <div className="skeleton size-full" aria-hidden />
  return <CollageCanvas composition={look.composition ?? automaticComposition(pieces)} pieces={pieces} />
}
