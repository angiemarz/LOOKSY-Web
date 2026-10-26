import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronUp, Plus, RotateCcw, Share2, Trash2, X } from 'lucide-react'
import { ASPECTS, ASPECT_LIST, BACKGROUND_PRESETS, layoutCollage, normalizeZ, reorder, sortedItems, type CollageAspect, type CollageComposition, type CollageItem } from '@/domain/collage'
import { CATEGORIES } from '@/domain/fashion'
import type { Garment } from '@/domain/models'
import { automaticComposition, loadPieces, renderCollage, shareOrDownload, type CollagePiece } from '@/services/collageRender'
import { useToast } from '@/state/toast'
import { CollagePieceView } from './CollageCanvas'
import { GarmentPicker } from './GarmentPicker'
import { Button, Confirm, IconButton } from './primitives'

interface Point { x: number; y: number }
interface Gesture { itemID: string; start: CollageItem; points: Map<number, Point> }

const clampItem = (i: CollageItem): CollageItem => ({
  ...i, centerX: Math.min(1, Math.max(0, i.centerX)), centerY: Math.min(1, Math.max(0, i.centerY)), width: Math.min(1.2, Math.max(0.06, i.width)),
})

/** Full-screen touch editor: drag to move, pinch to resize, twist to rotate. */
export function CollageEditor({ initial, pieces: initialPieces, title, saveLabel = 'Guardar', onSave, onClose }: {
  initial: CollageComposition; pieces: CollagePiece[]; title: string; saveLabel?: string
  onSave: (c: CollageComposition, pieces: CollagePiece[]) => void | Promise<void>; onClose: () => void
}) {
  const toast = useToast()
  const [composition, setComposition] = useState(initial)
  const [pieces, setPieces] = useState(initialPieces)
  const [selected, setSelected] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => entry && setArea({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // Lock the page behind the editor (prevents background scrolling on iOS).
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])
  const ratio = ASPECTS[composition.aspect].heightRatio
  const fitWidth = Math.max(0, Math.min(area.width, area.height / ratio))
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<Gesture | null>(null)

  const item = composition.items.find((i) => i.id === selected)
  const changed = JSON.stringify(composition) !== JSON.stringify(initial)
  const update = (id: string, change: (i: CollageItem) => CollageItem) =>
    setComposition((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? clampItem(change(i)) : i)) }))

  const baseline = (itemID: string) => {
    const current = composition.items.find((i) => i.id === itemID)
    gesture.current = current ? { itemID, start: current, points: new Map(pointers.current) } : null
  }

  const onItemDown = (e: ReactPointerEvent, it: CollageItem) => {
    e.stopPropagation()
    canvasRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setSelected(it.id)
    baseline(it.id)
  }
  const onCanvasDown = (e: ReactPointerEvent) => {
    if (gesture.current) {
      canvasRef.current?.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      baseline(gesture.current.itemID)
    } else {
      setSelected(null)
    }
  }
  const onMove = (e: ReactPointerEvent) => {
    const g = gesture.current
    const box = canvasRef.current?.getBoundingClientRect()
    if (!g || !box || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const ids = [...g.points.keys()].filter((id) => pointers.current.has(id))
    if (ids.length >= 2) {
      const [a0, b0] = [g.points.get(ids[0]!)!, g.points.get(ids[1]!)!]
      const [a1, b1] = [pointers.current.get(ids[0]!)!, pointers.current.get(ids[1]!)!]
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1
      const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y)
      const r0 = Math.atan2(b0.y - a0.y, b0.x - a0.x)
      const r1 = Math.atan2(b1.y - a1.y, b1.x - a1.x)
      const mx = ((a1.x + b1.x) - (a0.x + b0.x)) / 2
      const my = ((a1.y + b1.y) - (a0.y + b0.y)) / 2
      update(g.itemID, () => ({
        ...g.start,
        width: g.start.width * (d1 / d0),
        rotation: g.start.rotation + ((r1 - r0) * 180) / Math.PI,
        centerX: g.start.centerX + mx / box.width,
        centerY: g.start.centerY + my / box.height,
      }))
    } else if (ids.length === 1) {
      const p0 = g.points.get(ids[0]!)!
      const p1 = pointers.current.get(ids[0]!)!
      update(g.itemID, () => ({ ...g.start, centerX: g.start.centerX + (p1.x - p0.x) / box.width, centerY: g.start.centerY + (p1.y - p0.y) / box.height }))
    }
  }
  const onUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) gesture.current = null
    else if (gesture.current) baseline(gesture.current.itemID)
  }

  const setAspect = (aspect: CollageAspect) => {
    const inCanvas = pieces.filter((p) => composition.items.some((i) => i.garmentID === p.garment.id))
    setComposition({ ...automaticComposition(inCanvas, aspect, composition.backgroundHex), cardStyleForPhotos: composition.cardStyleForPhotos })
    setSelected(null)
  }

  const addGarment = async (g: Garment) => {
    const [piece] = await loadPieces([g])
    if (!piece) return
    setPieces((list) => (list.some((p) => p.garment.id === g.id) ? list : [...list, piece]))
    const [placed] = layoutCollage([{ garmentID: g.id, slot: CATEGORIES[g.category].slot, imageAspect: piece.aspect }], composition.aspect)
    if (!placed) return
    const taken = composition.items.some((i) => Math.abs(i.centerX - placed.centerX) < 0.05 && Math.abs(i.centerY - placed.centerY) < 0.05)
    const next = { ...placed, zIndex: composition.items.length, ...(taken ? { centerX: Math.min(placed.centerX + 0.12, 0.9), centerY: Math.min(placed.centerY + 0.06, 0.92) } : {}) }
    setComposition((c) => normalizeZ({ ...c, items: [...c.items, next] }))
    setSelected(next.id)
  }

  const exportImage = async () => {
    setBusy(true)
    try {
      const blob = await renderCollage(composition, pieces)
      const result = await shareOrDownload(blob, `${title || 'LOOKSY'}.png`.replace(/[\\/:*?"<>|]/g, '-'), title)
      if (result === 'downloaded') toast('Imagen PNG descargada')
    } catch {
      toast('No se pudo generar la imagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col bg-bg pt-safe" role="dialog" aria-modal="true" aria-label="Editor de collage">
      <div className="flex items-center gap-2 px-3 py-2">
        <IconButton label="Cerrar" onClick={() => (changed ? setDiscard(true) : onClose())}><X size={22} /></IconButton>
        <h2 className="flex-1 truncate font-display text-lg">Editar collage</h2>
        <IconButton label="Exportar o compartir PNG" onClick={exportImage} disabled={busy}><Share2 size={20} /></IconButton>
        <Button className="px-4 py-2" disabled={!composition.items.length || busy} onClick={async () => { setBusy(true); await onSave(composition, pieces); setBusy(false) }}>{saveLabel}</Button>
      </div>

      <div ref={areaRef} className="flex min-h-0 flex-1 items-center justify-center px-4 py-2">
        <div
          ref={canvasRef}
          className="relative touch-none select-none overflow-hidden rounded-2xl shadow-lg"
          style={{ width: fitWidth, height: fitWidth * ratio, background: composition.backgroundHex }}
          onPointerDown={onCanvasDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {sortedItems(composition).map((it) => (
            <div key={it.id} onPointerDown={(e) => onItemDown(e, it)} role="button" tabIndex={0} aria-label={pieces.find((p) => p.garment.id === it.garmentID)?.garment.name ?? 'Prenda'} aria-pressed={selected === it.id} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(it.id) }}>
              <CollagePieceView item={it} piece={pieces.find((p) => p.garment.id === it.garmentID)} cardStyle={composition.cardStyleForPhotos} aspect={composition.aspect} selected={selected === it.id} style={{ cursor: 'grab' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        {item ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              {([
                ['Al frente', ArrowUpToLine, 'front'], ['Subir', ChevronUp, 'forward'], ['Bajar', ChevronDown, 'backward'], ['Al fondo', ArrowDownToLine, 'back'],
              ] as const).map(([label, Icon, mode]) => (
                <button key={mode} type="button" className="flex flex-col items-center gap-0.5 px-2 text-[11px] text-accent" onClick={() => setComposition((c) => reorder(c, item.id, mode))}>
                  <Icon size={20} aria-hidden />{label}
                </button>
              ))}
              <button type="button" className="flex flex-col items-center gap-0.5 px-2 text-[11px] text-danger" onClick={() => { setComposition((c) => normalizeZ({ ...c, items: c.items.filter((i) => i.id !== item.id) })); setSelected(null) }}>
                <Trash2 size={20} aria-hidden />Quitar
              </button>
            </div>
            <label className="flex items-center gap-3 text-xs text-muted">Tamaño
              <input type="range" min={0.08} max={0.9} step={0.01} value={item.width} onChange={(e) => update(item.id, (i) => ({ ...i, width: Number(e.target.value) }))} className="flex-1 accent-[var(--lx-accent)]" />
            </label>
            <label className="flex items-center gap-3 text-xs text-muted">Rotación
              <input type="range" min={-180} max={180} step={1} value={item.rotation} onChange={(e) => update(item.id, (i) => ({ ...i, rotation: Number(e.target.value) }))} className="flex-1 accent-[var(--lx-accent)]" />
            </label>
          </div>
        ) : (
          <p className="text-center text-xs text-muted">Toca una prenda para seleccionarla. Arrastra para moverla, pellizca para cambiar su tamaño y gira con dos dedos.</p>
        )}
        <div className="grid grid-cols-3 gap-1 rounded-full bg-cream p-1 text-sm" role="radiogroup" aria-label="Formato">
          {ASPECT_LIST.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={composition.aspect === a} onClick={() => setAspect(a)} className={`rounded-full py-1.5 ${composition.aspect === a ? 'bg-surface font-semibold shadow-sm' : 'text-muted'}`}>{ASPECTS[a].label}</button>
          ))}
        </div>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {BACKGROUND_PRESETS.map((hex) => (
            <button key={hex} type="button" aria-label={`Fondo ${hex}`} aria-pressed={composition.backgroundHex === hex} onClick={() => setComposition((c) => ({ ...c, backgroundHex: hex }))} className={`size-8 shrink-0 rounded-full border border-line ${composition.backgroundHex === hex ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`} style={{ background: hex }} />
          ))}
          <label className="relative size-8 shrink-0 overflow-hidden rounded-full border border-line" style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}>
            <span className="sr-only">Color de fondo personalizado</span>
            <input type="color" value={composition.backgroundHex.length === 7 ? composition.backgroundHex : '#ffffff'} onChange={(e) => setComposition((c) => ({ ...c, backgroundHex: e.target.value.toUpperCase() }))} className="absolute inset-0 opacity-0" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" className="min-w-0 px-2 py-2 text-[13px]" onClick={() => setPicker(true)}><Plus size={15} />Añadir</Button>
          <Button variant="secondary" className="min-w-0 px-2 py-2 text-[13px]" onClick={() => setAspect(composition.aspect)}><RotateCcw size={15} />Reiniciar</Button>
          <Button variant={composition.cardStyleForPhotos ? 'primary' : 'secondary'} className="min-w-0 px-2 py-2 text-[13px]" aria-pressed={composition.cardStyleForPhotos} title="Muestra las fotos con fondo como tarjetas limpias" onClick={() => setComposition((c) => ({ ...c, cardStyleForPhotos: !c.cardStyleForPhotos }))}>Tarjetas</Button>
        </div>
      </div>

      <GarmentPicker open={picker} onClose={() => setPicker(false)} onPick={addGarment} exclude={composition.items.map((i) => i.garmentID)} title="Añadir prenda" />
      <Confirm open={discard} onClose={() => setDiscard(false)} title="¿Descartar los cambios?" message="Los cambios del collage no se guardarán." confirmLabel="Descartar" onConfirm={onClose} />
    </div>
  )
}
