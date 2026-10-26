import { ASPECTS, sortedItems, type CollageComposition, type CollageItem } from '@/domain/collage'
import type { CollagePiece } from '@/services/collageRender'

/** Static collage rendering with HTML (export uses the canvas renderer with the same geometry). */
export function CollageCanvas({ composition, pieces, className = '' }: { composition: CollageComposition; pieces: CollagePiece[]; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Collage con ${composition.items.length} prendas`}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `1 / ${ASPECTS[composition.aspect].heightRatio}`, background: composition.backgroundHex }}
    >
      {sortedItems(composition).map((item) => (
        <CollagePieceView key={item.id} item={item} piece={pieces.find((p) => p.garment.id === item.garmentID)} cardStyle={composition.cardStyleForPhotos} aspect={composition.aspect} />
      ))}
    </div>
  )
}

export function CollagePieceView({ item, piece, cardStyle, aspect, selected, style }: {
  item: CollageItem; piece?: CollagePiece; cardStyle: boolean; aspect: CollageComposition['aspect']; selected?: boolean; style?: React.CSSProperties
}) {
  const imageAspect = piece?.aspect ?? 1.2
  const heightPct = ((item.width * imageAspect) / ASPECTS[aspect].heightRatio) * 100
  const card = piece?.url && !piece.isCutout && cardStyle
  return (
    <div
      className="absolute"
      style={{
        left: `${item.centerX * 100}%`, top: `${item.centerY * 100}%`, width: `${item.width * 100}%`, height: `${heightPct}%`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`, zIndex: item.zIndex, ...style,
      }}
    >
      {piece?.url ? (
        <img
          src={piece.url}
          alt={piece.garment.name}
          draggable={false}
          className={`size-full select-none ${card ? 'rounded-[8%] bg-white object-cover p-[3%] shadow-[0_6px_18px_rgba(0,0,0,0.14)]' : 'object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]'}`}
        />
      ) : (
        <div className="grid size-full place-items-center rounded-[8%] border-2 border-dashed border-rose bg-white/80 p-1 text-center text-[10px] text-muted">
          {piece?.garment.name ?? 'Prenda eliminada'}
        </div>
      )}
      {selected && <div className="pointer-events-none absolute -inset-2 rounded-xl border-2 border-dashed border-accent" aria-hidden />}
    </div>
  )
}
