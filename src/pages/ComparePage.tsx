import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink } from 'lucide-react'
import { db } from '@/db/db'
import { STYLES } from '@/domain/fashion'
import type { Garment } from '@/domain/models'
import { compareCriteria } from '@/domain/recreation'
import { automaticComposition, loadPieces, missingPiece, type CollagePiece } from '@/services/collageRender'
import { updateComposition } from '@/services/looks'
import { PageHeader } from '@/ui/Layout'
import { Button, ColorDot, Sheet, StoredImage } from '@/ui/primitives'
import { CollageCanvas } from '@/ui/CollageCanvas'
import { CollageEditor } from '@/ui/CollageEditor'
import { CriteriaList } from '@/ui/CriteriaList'
import { LookPicker } from './LooksPage'
import { ReferenceCard } from './InspirationPage'

type Mode = 'inspiration' | 'mine' | 'both'
const MODES: Record<Mode, string> = { inspiration: 'Inspiración', mine: 'Mi look', both: 'Lado a lado' }

/** "Inspiración vs. mi look" compared with explainable criteria. */
export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const lookID = params.get('look')
  const refID = params.get('ref')
  const look = useLiveQuery(() => (lookID ? db.looks.get(lookID) : undefined), [lookID])
  const ref = useLiveQuery(() => (refID ? db.references.get(refID) : undefined), [refID])
  const looks = useLiveQuery(() => db.looks.orderBy('createdAt').reverse().toArray(), []) ?? []
  const references = useLiveQuery(() => db.references.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [garments, setGarments] = useState<Garment[]>([])
  const [pieces, setPieces] = useState<CollagePiece[]>([])
  const [mode, setMode] = useState<Mode>('both')
  const [picker, setPicker] = useState<'look' | 'ref' | null>(null)
  const [editor, setEditor] = useState(false)

  useEffect(() => {
    if (!look) { setGarments([]); setPieces([]); return }
    let alive = true
    ;(async () => {
      const found = await db.garments.bulkGet(look.garmentIDs)
      const existing = found.filter((g): g is Garment => !!g)
      const loaded = await loadPieces(existing)
      if (alive) { setGarments(existing); setPieces([...loaded, ...look.garmentIDs.filter((_, i) => !found[i]).map((id) => missingPiece(id))]) }
    })()
    return () => { alive = false }
  }, [look?.id, look?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (key: 'look' | 'ref', value: string) => { params.set(key, value); setParams(params, { replace: true }) }
  const criteria = ref && look ? compareCriteria(ref.target ?? { pieces: [], colors: ref.colors, style: ref.style, formality: ref.formality }, garments, look.style) : []
  const composition = look?.composition ?? automaticComposition(pieces)

  const inspiration = (
    <div className="card space-y-2 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">A · Inspiración</p>
      {ref ? (
        <>
          {ref.imageFileName ? <StoredImage id={ref.imageFileName} alt={ref.title} className="w-full rounded-2xl bg-cream" /> : <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-rose-soft text-xs text-accent">Referencia sin imagen</div>}
          <p className="text-sm font-semibold">{ref.title}</p>
          <div className="flex flex-wrap gap-1">{ref.colors.map((c) => <ColorDot key={c} color={c} size={16} />)}</div>
          {ref.style && <p className="text-xs text-muted">{STYLES[ref.style].label}</p>}
          {ref.urlString && <a href={ref.urlString} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent"><ExternalLink size={12} />Enlace original</a>}
          <button type="button" className="block text-xs text-accent" onClick={() => setPicker('ref')}>Cambiar referencia</button>
        </>
      ) : <Button variant="secondary" full onClick={() => setPicker('ref')}>Elegir referencia</Button>}
    </div>
  )
  const mine = (
    <div className="card space-y-2 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">B · Mi outfit</p>
      {look ? (
        <>
          <div className="overflow-hidden rounded-2xl"><CollageCanvas composition={composition} pieces={pieces} /></div>
          <p className="text-sm font-semibold">{look.name}</p>
          {garments.map((g) => <p key={g.id} className="flex items-center gap-1 text-xs"><ColorDot color={g.primaryColor} size={10} />{g.name}</p>)}
          <button type="button" className="block text-xs text-accent" onClick={() => setEditor(true)}>Sustituir prendas</button>
          <button type="button" className="block text-xs text-accent" onClick={() => setPicker('look')}>Cambiar look</button>
        </>
      ) : <Button variant="secondary" full onClick={() => setPicker('look')}>Elegir look</Button>}
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Inspiración vs. mi look" back />
      <div className="grid grid-cols-3 gap-1 rounded-full bg-cream p-1 text-sm" role="tablist">
        {(Object.keys(MODES) as Mode[]).map((m) => <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-full py-2 ${mode === m ? 'bg-surface font-semibold shadow-sm' : 'text-muted'}`}>{MODES[m]}</button>)}
      </div>
      {mode === 'inspiration' && inspiration}
      {mode === 'mine' && mine}
      {mode === 'both' && <div className="grid grid-cols-2 gap-3">{inspiration}{mine}</div>}
      {criteria.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Comparación</h2>
          <CriteriaList criteria={criteria} />
          <p className="text-xs text-muted">Criterios calculados a partir de las prendas, colores, estilo y formalidad que describiste.</p>
        </section>
      )}
      <LookPicker open={picker === 'look'} onClose={() => setPicker(null)} looks={looks} onPick={(l) => select('look', l.id)} title="Elegir mi look" />
      <Sheet open={picker === 'ref'} onClose={() => setPicker(null)} title="Elegir referencia" wide>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {references.map((r) => <ReferenceCard key={r.id} reference={r} onClick={() => { select('ref', r.id); setPicker(null) }} />)}
        </div>
        {references.length === 0 && <p className="text-sm text-muted">Guarda referencias en Inspiración.</p>}
      </Sheet>
      {editor && look && <CollageEditor initial={composition} pieces={pieces} title={look.name} onClose={() => setEditor(false)} onSave={async (c, p) => { setPieces(p); await updateComposition(look, c); setEditor(false) }} />}
    </div>
  )
}
