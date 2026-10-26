import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from './primitives'

type Rect = { x: number; y: number; width: number; height: number }
type Handle = 'move' | 'tl' | 'tr' | 'bl' | 'br'
const MIN = 0.1

/** Manual crop with draggable corners (touch and mouse). Returns a normalized rectangle. */
export function CropTool({ src, onApply, onCancel }: { src: string; onApply: (rect: Rect) => void; onCancel: () => void }) {
  const [rect, setRect] = useState<Rect>({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 })
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: Rect } | null>(null)

  const begin = (handle: Handle) => (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = { handle, startX: e.clientX, startY: e.clientY, start: rect }
  }
  const move = (e: ReactPointerEvent) => {
    const d = drag.current
    const el = box.current
    if (!d || !el) return
    const bounds = el.getBoundingClientRect()
    const dx = (e.clientX - d.startX) / bounds.width
    const dy = (e.clientY - d.startY) / bounds.height
    const s = d.start
    let minX = s.x, minY = s.y, maxX = s.x + s.width, maxY = s.y + s.height
    if (d.handle === 'move') {
      const nx = Math.min(Math.max(s.x + dx, 0), 1 - s.width)
      const ny = Math.min(Math.max(s.y + dy, 0), 1 - s.height)
      setRect({ ...s, x: nx, y: ny })
      return
    }
    if (d.handle === 'tl' || d.handle === 'bl') minX = Math.min(Math.max(s.x + dx, 0), maxX - MIN)
    if (d.handle === 'tr' || d.handle === 'br') maxX = Math.max(Math.min(maxX + dx, 1), minX + MIN)
    if (d.handle === 'tl' || d.handle === 'tr') minY = Math.min(Math.max(s.y + dy, 0), maxY - MIN)
    if (d.handle === 'bl' || d.handle === 'br') maxY = Math.max(Math.min(maxY + dy, 1), minY + MIN)
    setRect({ x: minX, y: minY, width: maxX - minX, height: maxY - minY })
  }
  const end = () => { drag.current = null }

  const pct = (v: number) => `${v * 100}%`
  const corners: [Handle, number, number][] = [['tl', rect.x, rect.y], ['tr', rect.x + rect.width, rect.y], ['bl', rect.x, rect.y + rect.height], ['br', rect.x + rect.width, rect.y + rect.height]]

  return (
    <div className="space-y-4">
      <div ref={box} className="relative mx-auto w-fit touch-none select-none" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <img src={src} alt="Foto a recortar" className="block max-h-[60dvh] max-w-full" draggable={false} />
        <div className="pointer-events-none absolute inset-0 bg-black/50" style={{ clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${pct(rect.x)} ${pct(rect.y)},${pct(rect.x)} ${pct(rect.y + rect.height)},${pct(rect.x + rect.width)} ${pct(rect.y + rect.height)},${pct(rect.x + rect.width)} ${pct(rect.y)},${pct(rect.x)} ${pct(rect.y)})` }} />
        <div role="presentation" onPointerDown={begin('move')} className="absolute cursor-move border-2 border-white" style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.width), height: pct(rect.height) }} />
        {corners.map(([h, x, y]) => (
          <div key={h} role="presentation" onPointerDown={begin(h)} className="absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white shadow" style={{ left: pct(x), top: pct(y) }} />
        ))}
      </div>
      <p className="text-center text-xs text-muted">Arrastra las esquinas o el recuadro.</p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setRect({ x: 0, y: 0, width: 1, height: 1 })}>Restablecer</Button>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button full onClick={() => onApply(rect)}>Aplicar</Button>
      </div>
    </div>
  )
}
