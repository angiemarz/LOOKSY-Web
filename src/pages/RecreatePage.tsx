import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CircleMinus, Heart, Check, Plus, SlidersHorizontal } from 'lucide-react'
import { db } from '@/db/db'
import { SLOTS, STYLES, STYLE_LIST, categoriesIn, CATEGORIES, formalityLabel, type OutfitSlot } from '@/domain/fashion'
import { COLOR_LIST, type FashionColor } from '@/domain/color'
import { capitalizeFirst, uuid } from '@/domain/normalize'
import { RECREATION_KINDS, pieceDescription, recreate, type Recreation, type RecreationKind, type RecreationTarget } from '@/domain/recreation'
import { garmentIDsIn, type CollageComposition } from '@/domain/collage'
import { automaticComposition, loadPieces, type CollagePiece } from '@/services/collageRender'
import { saveLook } from '@/services/looks'
import { usePreferences } from '@/state/preferences'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, ChipGroup, ColorDot, Sheet, StoredImage } from '@/ui/primitives'
import { CollageCanvas } from '@/ui/CollageCanvas'
import { CollageEditor } from '@/ui/CollageEditor'
import { CriteriaList } from '@/ui/CriteriaList'

const ADDABLE: OutfitSlot[] = ['top', 'bottom', 'onePiece', 'outerwear', 'shoes', 'bag', 'accessory']

export function RecreatePage() {
  const { id } = useParams()
  const toast = useToast()
  const [prefs] = usePreferences()
  const ref = useLiveQuery(() => db.references.get(id!), [id], null)
  const garments = useLiveQuery(() => db.garments.toArray(), []) ?? []
  const [target, setTarget] = useState<RecreationTarget | null>(null)
  const [results, setResults] = useState<Recreation[]>([])
  const [pieces, setPieces] = useState<Map<string, CollagePiece>>(new Map())
  const [adding, setAdding] = useState<OutfitSlot | null>(null)
  const [saved, setSaved] = useState<Set<RecreationKind>>(new Set())
  const [editing, setEditing] = useState<Recreation | null>(null)

  useEffect(() => {
    if (ref && !target) setTarget(ref.target ?? { pieces: [], colors: ref.colors, style: ref.style, formality: ref.formality })
  }, [ref, target])

  if (ref === null || (ref && !target)) return null
  if (!ref || !target) return <div><PageHeader title="Recrea este look" back="/inspiracion" /><Banner>Esta referencia ya no existe.</Banner></div>

  const store = (next: RecreationTarget) => {
    setTarget(next)
    void db.references.update(ref.id, { target: next, style: next.style, formality: next.formality })
  }
  const colorOptions: FashionColor[] = [...ref.colors, ...COLOR_LIST.filter((c) => !ref.colors.includes(c))]
  const piecesOf = (r: Recreation) => r.items.map((g) => pieces.get(g.id) ?? { garment: g, aspect: 1.2, isCutout: false })

  const search = async () => {
    const found = recreate(target, garments, prefs)
    setResults(found)
    setSaved(new Set())
    const loaded = await loadPieces([...new Map(found.flatMap((r) => r.items).map((g) => [g.id, g])).values()])
    setPieces(new Map(loaded.map((p) => [p.garment.id, p])))
  }

  const save = async (r: Recreation, composition: CollageComposition) => {
    const look = await saveLook({
      name: `${ref.title} · ${r.kind === 'creative' ? 'versión creativa' : 'recreación'}`,
      garmentIDs: garmentIDsIn(composition), composition, style: target.style,
      explanation: r.notes.join('\n'), pinterestURLs: ref.urlString ? [ref.urlString] : [], referenceIDs: [ref.id],
    })
    await db.references.update(ref.id, { linkedLookIDs: [...ref.linkedLookIDs, look.id] })
    setSaved((s) => new Set(s).add(r.kind))
    toast(`“${look.name}” se guardó en Mis looks`)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Recrea este look" back={`/inspiracion/${ref.id}`} />
      <div className="flex gap-3">
        {ref.imageFileName ? <StoredImage id={ref.imageFileName} alt={ref.title} fit="cover" className="h-32 w-24 shrink-0 rounded-2xl" /> : <div className="grid h-32 w-24 shrink-0 place-items-center rounded-2xl bg-rose-soft text-xs text-accent">Enlace</div>}
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{ref.title}</p>
          {ref.urlString && <a href={ref.urlString} target="_blank" rel="noopener noreferrer" className="text-sm text-accent">Ver referencia original</a>}
          <div className="flex gap-1">{ref.colors.map((c) => <ColorDot key={c} color={c} />)}</div>
        </div>
      </div>
      <Banner>
        {ref.imageFileName
          ? 'De la imagen solo se detecta la paleta de colores. Indica abajo qué prendas aparecen en el look.'
          : 'LOOKSY no puede ver el contenido de un enlace de Pinterest. Describe abajo las prendas que ves en el look.'}
      </Banner>

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">Prendas del look de referencia</h2>
        {target.pieces.length === 0 && <p className="text-sm text-muted">Añade cada prenda que ves en la referencia.</p>}
        {target.pieces.map((p) => (
          <div key={p.id} className="space-y-2 rounded-2xl bg-cream p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{capitalizeFirst(pieceDescription(p))}</p>
              <button type="button" aria-label="Quitar prenda" className="text-muted" onClick={() => store({ ...target, pieces: target.pieces.filter((x) => x.id !== p.id) })}><CircleMinus size={20} /></button>
            </div>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
              <button type="button" aria-pressed={!p.color} onClick={() => store({ ...target, pieces: target.pieces.map((x) => (x.id === p.id ? { ...x, color: null } : x)) })} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${!p.color ? 'border-accent text-accent' : 'border-line'}`}>Sin color</button>
              {colorOptions.map((c) => (
                <button key={c} type="button" aria-pressed={p.color === c} onClick={() => store({ ...target, pieces: target.pieces.map((x) => (x.id === p.id ? { ...x, color: c } : x)) })} className={`shrink-0 rounded-full p-0.5 ${p.color === c ? 'ring-2 ring-accent' : ''}`}>
                  <ColorDot color={c} size={24} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {ADDABLE.map((slot) => <Button key={slot} variant="secondary" className="shrink-0 px-3 py-2 text-sm" onClick={() => setAdding(slot)}><Plus size={14} />{SLOTS[slot].label}</Button>)}
        </div>
        <div><p className="mb-2 text-sm font-semibold">Estilo</p><ChipGroup single items={STYLE_LIST} selected={target.style ? [target.style] : []} onChange={(v) => store({ ...target, style: v[0] })} label={(s) => STYLES[s].label} /></div>
        <label className="block text-sm font-semibold">Formalidad: {formalityLabel(target.formality)}
          <input type="range" min={1} max={5} value={target.formality} onChange={(e) => store({ ...target, formality: Number(e.target.value) })} className="mt-2 w-full accent-[var(--lx-accent)]" />
        </label>
      </section>

      <Button full disabled={!target.pieces.length || !garments.length} onClick={search}>Buscar en mi armario</Button>
      {!garments.length && <p className="text-sm text-muted">Agrega prendas a tu armario para recrear looks.</p>}

      {results.map((r) => {
        const composition = automaticComposition(piecesOf(r))
        return (
          <article key={r.kind} className="card space-y-3 p-4">
            <div><h3 className="font-display text-xl">{RECREATION_KINDS[r.kind].title}</h3><p className="text-sm text-muted">{RECREATION_KINDS[r.kind].subtitle}</p></div>
            {r.items.length ? <div className="overflow-hidden rounded-2xl"><CollageCanvas composition={composition} pieces={piecesOf(r)} /></div> : <Banner>No se encontraron prendas suficientes para esta versión.</Banner>}
            <ul className="space-y-1 text-sm">{r.notes.map((n) => <li key={n}>• {n}</li>)}</ul>
            {r.criteria.length > 0 && <CriteriaList criteria={r.criteria} />}
            {r.items.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={saved.has(r.kind)} onClick={() => save(r, composition)}>{saved.has(r.kind) ? <><Check size={16} />Guardado</> : <><Heart size={16} />Guardar look</>}</Button>
                <Button variant="secondary" onClick={() => setEditing(r)}><SlidersHorizontal size={16} />Editar</Button>
              </div>
            )}
          </article>
        )
      })}

      <Sheet open={!!adding} onClose={() => setAdding(null)} title={adding ? `Añadir: ${SLOTS[adding].label}` : ''}>
        {adding && (
          <div className="space-y-2">
            {categoriesIn(adding).map((c) => (
              <Button key={c} variant="secondary" full onClick={() => { store({ ...target, pieces: [...target.pieces, { id: uuid(), slot: adding, category: c, color: target.colors[0] ?? null }] }); setAdding(null) }}>{CATEGORIES[c].label}</Button>
            ))}
            <Button variant="ghost" full onClick={() => { store({ ...target, pieces: [...target.pieces, { id: uuid(), slot: adding, category: null, color: null }] }); setAdding(null) }}>Cualquier {SLOTS[adding].label.toLowerCase()}</Button>
          </div>
        )}
      </Sheet>

      {editing && (
        <CollageEditor initial={automaticComposition(piecesOf(editing))} pieces={piecesOf(editing)} title={ref.title} saveLabel="Guardar look" onClose={() => setEditing(null)} onSave={async (c) => { await save(editing, c); setEditing(null) }} />
      )}
    </div>
  )
}
