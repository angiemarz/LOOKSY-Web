import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeftRight, Heart, Check, RefreshCw, SlidersHorizontal, Sparkle, WandSparkles, Quote, X } from 'lucide-react'
import { db } from '@/db/db'
import { CATEGORIES, OCCASIONS, SLOTS, STYLES, type OutfitSlot } from '@/domain/fashion'
import type { Garment } from '@/domain/models'
import { parseRequest } from '@/domain/parser'
import { queriesForGarments, queriesForRequest } from '@/domain/pinterest'
import { alternativesFor, rebuildSuggestion, recommend, signature, slotOf, type OutfitSuggestion } from '@/domain/recommend'
import { interpretation, type OutfitRequest } from '@/domain/request'
import type { CollageComposition } from '@/domain/collage'
import { garmentIDsIn } from '@/domain/collage'
import { automaticComposition, loadPieces, type CollagePiece } from '@/services/collageRender'
import { saveLook } from '@/services/looks'
import { usePreferences } from '@/state/preferences'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, Sheet, Spinner, StoredImage, inputClass } from '@/ui/primitives'
import { CollageCanvas } from '@/ui/CollageCanvas'
import { CollageEditor } from '@/ui/CollageEditor'
import { GarmentPicker } from '@/ui/GarmentPicker'
import { PinterestList } from '@/ui/PinterestList'

const EXAMPLES = [
  'Quiero un outfit femenino y casual con jeans negros para ir a tomar café',
  'Arma un outfit casual con mis jeans negros',
  'Quiero algo elegante para trabajar',
  'Combina mi blusa rosa con tenis blancos',
  'Quiero algo estilo Pinterest para una cita',
  'Necesito un outfit femenino para clima fresco',
  'Quiero verme arreglada sin usar tacones',
]

export function StylistPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [prefs] = usePreferences()
  const garments = useLiveQuery(() => db.garments.toArray(), [])
  const [text, setText] = useState('')
  const [seedID, setSeedID] = useState<string | null>(params.get('prenda'))
  const [request, setRequest] = useState<OutfitRequest | null>(null)
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState<Set<string>>(new Set())
  const [seed, setSeed] = useState(0)
  const [pieces, setPieces] = useState<Map<string, CollagePiece>>(new Map())
  const [compositions, setCompositions] = useState<Map<string, CollageComposition>>(new Map())
  const [saved, setSaved] = useState<Map<string, string>>(new Map())
  const [editing, setEditing] = useState<OutfitSuggestion | null>(null)
  const [swap, setSwap] = useState<{ suggestion: OutfitSuggestion; slot: OutfitSlot } | null>(null)
  const [pinterestFor, setPinterestFor] = useState<OutfitSuggestion | null>(null)

  const seedGarment = garments?.find((g) => g.id === seedID)
  useEffect(() => {
    const id = params.get('prenda')
    if (id) {
      setSeedID(id)
      params.delete('prenda')
      setParams(params, { replace: true })
    }
  }, [params, setParams])
  useEffect(() => {
    if (seedGarment && !text) setText(`Un outfit con mi ${seedGarment.name.toLowerCase()}`)
  }, [seedGarment]) // eslint-disable-line react-hooks/exhaustive-deps

  const ensurePieces = async (items: Garment[]) => {
    const missingItems = items.filter((g) => !pieces.has(g.id))
    if (!missingItems.length) return pieces
    const loaded = await loadPieces(missingItems)
    const next = new Map(pieces)
    loaded.forEach((p) => next.set(p.garment.id, p))
    setPieces(next)
    return next
  }

  const run = async (req: OutfitRequest, nextSeed: number, exclude: Set<string>) => {
    if (!garments) return
    setBusy(true)
    setInfo(null)
    await new Promise((r) => setTimeout(r, 20))
    const result = recommend(req, garments, { preferences: prefs, excludingSignatures: exclude, variationSeed: nextSeed })
    setMissing(result.missing)
    if (!result.suggestions.length && nextSeed > 0) {
      setInfo('Ya viste todas las combinaciones distintas para esta solicitud.')
    } else {
      await ensurePieces(result.suggestions.flatMap((s) => s.items))
      setSuggestions(result.suggestions)
      setShown(new Set([...exclude, ...result.suggestions.map((s) => signature(s.items))]))
    }
    setBusy(false)
  }

  const generate = async (value = text) => {
    if (!garments?.length) return
    const req = parseRequest(value, garments)
    const seedG = garments.find((g) => g.id === seedID)
    if (seedG && !req.requirements.some((r) => r.garmentID === seedG.id)) {
      const slot = CATEGORIES[seedG.category].slot
      req.requirements = req.requirements.filter((r) => !(r.slot === slot && !r.garmentID))
      req.requirements.push({ category: seedG.category, slot, colors: [], garmentID: seedG.id, requiresHeel: false, phrase: seedG.name })
    }
    setRequest(req)
    setSeed(0)
    setCompositions(new Map())
    setSaved(new Map())
    await run(req, 0, new Set())
  }

  const alternativesAll = () => {
    if (!request) return
    setSeed(seed + 1)
    void run(request, seed + 1, shown)
  }

  const alternativeOne = async (s: OutfitSuggestion) => {
    if (!request || !garments) return
    const nextSeed = seed + 1
    setSeed(nextSeed)
    const result = recommend(request, garments, { preferences: prefs, excludingSignatures: shown, variationSeed: nextSeed, maxSuggestions: 1 })
    const replacement = result.suggestions[0]
    if (!replacement) { setInfo('No hay otra combinación distinta para este look con tu armario actual.'); return }
    await ensurePieces(replacement.items)
    setShown(new Set([...shown, signature(replacement.items)]))
    setSuggestions((list) => list.map((x) => (x.id === s.id ? replacement : x)))
  }

  const piecesOf = (s: OutfitSuggestion) => s.items.map((g) => pieces.get(g.id) ?? { garment: g, aspect: 1.2, isCutout: false })
  const compositionOf = (s: OutfitSuggestion) => compositions.get(s.id) ?? automaticComposition(piecesOf(s))

  const replaceSuggestion = (s: OutfitSuggestion, items: Garment[]) => {
    const rebuilt = rebuildSuggestion(s, items, request ?? undefined, prefs)
    setSuggestions((list) => list.map((x) => (x.id === s.id ? rebuilt : x)))
    setCompositions((m) => { const n = new Map(m); n.delete(s.id); return n })
    setSaved((m) => { const n = new Map(m); n.delete(s.id); return n })
  }

  const doSwap = async (g: Garment) => {
    if (!swap) return
    const { suggestion, slot } = swap
    let items = suggestion.items.filter((x) => slotOf(x) !== slot)
    if (slotOf(g) === 'onePiece') items = items.filter((x) => slotOf(x) !== 'top' && slotOf(x) !== 'bottom')
    if (slotOf(g) === 'top' || slotOf(g) === 'bottom') items = items.filter((x) => slotOf(x) !== 'onePiece')
    await ensurePieces([g])
    replaceSuggestion(suggestion, [...items, g])
  }

  const save = async (s: OutfitSuggestion) => {
    const look = await saveLook({ name: s.name, garmentIDs: s.items.map((g) => g.id), composition: compositionOf(s), style: s.style, occasion: s.occasion, explanation: s.reasons.join('\n') })
    setSaved((m) => new Map(m).set(s.id, look.id))
    toast(`“${s.name}” se guardó en Mis looks`)
  }

  const swapOptions = useMemo(() => (swap && garments ? alternativesFor(swap.slot, swap.suggestion, garments, request ?? undefined, prefs) : []), [swap, garments, request, prefs])
  const requestQueries = request ? queriesForRequest(request) : []

  return (
    <div className="space-y-6">
      <PageHeader title="Crear outfit" subtitle="Tu estilista combina solo prendas reales de tu armario." />

      <div className="card space-y-3 p-4">
        <label className="block">
          <span className="sr-only">¿Qué outfit necesitas?</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void generate() } }}
            rows={3}
            placeholder="Ej. algo casual con mis jeans negros para un café"
            className={`${inputClass} resize-none`}
            enterKeyHint="go"
          />
        </label>
        {seedGarment && (
          <div className="flex items-center gap-3 rounded-2xl bg-rose-soft p-2">
            <StoredImage id={seedGarment.thumbnailFileName} alt={seedGarment.name} className="size-11 rounded-xl bg-surface p-1" />
            <div className="min-w-0 flex-1"><p className="text-xs text-muted">Incluir esta prenda</p><p className="truncate text-sm font-medium">{seedGarment.name}</p></div>
            <button type="button" aria-label="Quitar prenda" onClick={() => setSeedID(null)} className="grid size-9 place-items-center rounded-full text-muted"><X size={18} /></button>
          </div>
        )}
        <Button full onClick={() => generate()} disabled={busy || !garments?.length || (!text.trim() && !seedID)}><WandSparkles size={18} />Crear outfits</Button>
        {garments && garments.length === 0 && (
          <p className="text-sm text-muted">Primero agrega prendas en <button type="button" className="font-semibold text-accent" onClick={() => navigate('/armario')}>Mi armario</button>: LOOKSY solo combina tu ropa real.</p>
        )}
      </div>

      {!request && !busy && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Prueba con</h2>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" disabled={!garments?.length} onClick={() => { setText(ex); void generate(ex) }} className="card flex w-full items-start gap-3 p-4 text-left text-sm disabled:opacity-50">
              <Quote size={16} className="mt-0.5 shrink-0 text-rose" aria-hidden />{ex}
            </button>
          ))}
        </div>
      )}

      {request && (
        <div className="rounded-2xl bg-cream p-4 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Entendí</p>
          {interpretation(request).length ? interpretation(request).map((line) => <p key={line}>• {line}</p>) : <p className="text-muted">Una solicitud general: combinaré según tus preferencias y la armonía de colores.</p>}
        </div>
      )}
      {missing.map((m) => <Banner key={m}>{m}</Banner>)}
      {info && <Banner tone="success">{info}</Banner>}
      {busy && <Spinner label="Combinando tus prendas…" />}

      {suggestions.map((s) => (
        <article key={s.id} className="card space-y-4 p-4">
          <div>
            <h3 className="font-display text-xl">{s.name}</h3>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
              {s.style && <span className="rounded-full bg-cream px-2.5 py-1">{STYLES[s.style].label}</span>}
              {s.occasion && <span className="rounded-full bg-cream px-2.5 py-1">{OCCASIONS[s.occasion].label}</span>}
              <span className="rounded-full bg-cream px-2.5 py-1">{s.items.length} prendas</span>
            </div>
          </div>
          <button type="button" className="block w-full overflow-hidden rounded-2xl" onClick={() => setEditing(s)} aria-label="Editar collage">
            <CollageCanvas composition={compositionOf(s)} pieces={piecesOf(s)} />
          </button>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {s.items.map((g) => (
              <div key={g.id} className="w-16 shrink-0 text-center">
                <StoredImage id={g.thumbnailFileName} alt={g.name} className="size-16 rounded-xl bg-cream p-1" />
                <p className="mt-1 truncate text-[10px]">{g.name}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-1 text-sm">
            {s.reasons.map((r) => <li key={r} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />{r}</li>)}
            {s.warnings.map((w) => <li key={w} className="flex gap-2 text-muted"><span aria-hidden>⚠︎</span>{w}</li>)}
          </ul>
          <div className="space-y-2">
            <Button full onClick={() => save(s)} disabled={saved.has(s.id)}>
              {saved.has(s.id) ? <><Check size={18} />Guardado en Mis looks</> : <><Heart size={18} />Guardar look</>}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setEditing(s)}><SlidersHorizontal size={16} />Editar</Button>
              <SwapMenu suggestion={s} garments={garments ?? []} onPick={(slot) => setSwap({ suggestion: s, slot })} />
              <Button variant="secondary" onClick={() => alternativeOne(s)}><RefreshCw size={16} />Alternativa</Button>
              <Button variant="secondary" onClick={() => setPinterestFor(s)}><Sparkle size={16} />Pinterest</Button>
            </div>
          </div>
        </article>
      ))}

      {suggestions.length > 0 && <Button full variant="secondary" onClick={alternativesAll} disabled={busy}><RefreshCw size={18} />Generar alternativas</Button>}
      {requestQueries.length > 0 && <PinterestList queries={requestQueries} />}

      {editing && (
        <CollageEditor
          initial={compositionOf(editing)}
          pieces={piecesOf(editing)}
          title={editing.name}
          saveLabel="Aplicar"
          onClose={() => setEditing(null)}
          onSave={(composition, newPieces) => {
            const map = new Map(pieces)
            newPieces.forEach((p) => map.set(p.garment.id, p))
            setPieces(map)
            const ids = garmentIDsIn(composition)
            const current = suggestions.find((x) => x.id === editing.id) ?? editing
            if (ids.sort().join() !== current.items.map((g) => g.id).sort().join()) {
              const items = ids.map((id) => map.get(id)?.garment).filter((g): g is Garment => !!g)
              const rebuilt = rebuildSuggestion(current, items, request ?? undefined, prefs)
              setSuggestions((list) => list.map((x) => (x.id === current.id ? rebuilt : x)))
            }
            setCompositions((m) => new Map(m).set(current.id, composition))
            setSaved((m) => { const n = new Map(m); n.delete(current.id); return n })
            setEditing(null)
          }}
        />
      )}

      <GarmentPicker
        open={!!swap}
        onClose={() => setSwap(null)}
        onPick={doSwap}
        options={swapOptions}
        title={swap ? `${swap.suggestion.items.some((g) => slotOf(g) === swap.slot) ? 'Cambiar' : 'Añadir'} ${SLOTS[swap.slot].label.toLowerCase()}` : ''}
      />

      <Sheet open={!!pinterestFor} onClose={() => setPinterestFor(null)} title="Pinterest">
        {pinterestFor && (
          <PinterestList
            title="Inspiración para este look"
            queries={queriesForGarments(pinterestFor.items, pinterestFor.style, pinterestFor.occasion, request?.feminine ?? false)}
            linkedLookID={saved.get(pinterestFor.id)}
            linkedGarmentIDs={pinterestFor.items.map((g) => g.id)}
          />
        )}
      </Sheet>
    </div>
  )
}

function SwapMenu({ suggestion, garments, onPick }: { suggestion: OutfitSuggestion; garments: Garment[]; onPick: (slot: OutfitSlot) => void }) {
  const [open, setOpen] = useState(false)
  const present = suggestion.items.map(slotOf)
  const addable = (['outerwear', 'bag', 'accessory', 'shoes'] as OutfitSlot[]).filter((slot) => !present.includes(slot) && garments.some((g) => g.isAvailable && CATEGORIES[g.category].slot === slot))
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><ArrowLeftRight size={16} />Cambiar prenda</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="¿Qué quieres cambiar?">
        <div className="space-y-2">
          {present.map((slot) => <Button key={slot} variant="secondary" full onClick={() => { setOpen(false); onPick(slot) }}>Cambiar {SLOTS[slot].label.toLowerCase()}</Button>)}
          {addable.map((slot) => <Button key={slot} variant="ghost" full onClick={() => { setOpen(false); onPick(slot) }}>Añadir {SLOTS[slot].label.toLowerCase()}</Button>)}
        </div>
      </Sheet>
    </>
  )
}
