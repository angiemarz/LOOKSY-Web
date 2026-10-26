import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, CircleCheck, Columns2, Copy, Ellipsis, Heart, Pencil, Share2, SlidersHorizontal, Trash2, FolderPlus, Check } from 'lucide-react'
import { db } from '@/db/db'
import { CATEGORIES, OCCASIONS, OCCASION_LIST, STYLES, STYLE_LIST } from '@/domain/fashion'
import type { Garment, Look } from '@/domain/models'
import { queriesForGarments } from '@/domain/pinterest'
import { automaticComposition, loadPieces, missingPiece, renderCollage, shareOrDownload, type CollagePiece } from '@/services/collageRender'
import { deleteLook, duplicateLook, localDay, patchLook, planLook, updateComposition } from '@/services/looks'
import { markWorn } from '@/services/wardrobe'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, ChipGroup, Confirm, IconButton, Sheet, Spinner, StoredImage, inputClass } from '@/ui/primitives'
import { CollageCanvas } from '@/ui/CollageCanvas'
import { CollageEditor } from '@/ui/CollageEditor'
import { PinterestList } from '@/ui/PinterestList'
import { TagInput } from '@/ui/TagInput'

export function LookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const look = useLiveQuery(() => db.looks.get(id!), [id], null)
  const garments = useLiveQuery(async () => (look ? (await db.garments.bulkGet(look.garmentIDs)).filter((g): g is Garment => !!g) : []), [look?.garmentIDs.join()]) ?? []
  const collections = useLiveQuery(() => db.collections.toArray(), []) ?? []
  const references = useLiveQuery(() => db.references.toArray(), []) ?? []
  const [pieces, setPieces] = useState<CollagePiece[] | null>(null)
  const [sheet, setSheet] = useState<'edit' | 'plan' | 'collections' | 'delete' | 'more' | null>(null)
  const [editor, setEditor] = useState(false)
  const [planDay, setPlanDay] = useState(localDay())

  useEffect(() => {
    if (!look) return
    let alive = true
    ;(async () => {
      const found = await db.garments.bulkGet(look.garmentIDs)
      const loaded = await loadPieces(found.filter((g): g is Garment => !!g))
      const missing = look.garmentIDs.filter((_, i) => !found[i]).map((gid) => missingPiece(gid))
      if (alive) setPieces([...loaded, ...missing])
    })()
    return () => { alive = false }
  }, [look?.id, look?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  if (look === null) return null
  if (!look) return <div><PageHeader title="Look" back="/looks" /><Banner>Este look ya no existe.</Banner></div>

  const missingCount = look.garmentIDs.length - garments.length
  const composition = look.composition ?? (pieces ? automaticComposition(pieces) : undefined)
  const linkedRefs = references.filter((r) => look.referenceIDs.includes(r.id) || r.linkedLookIDs.includes(look.id))

  const exportPNG = async () => {
    if (!composition || !pieces) return
    const blob = await renderCollage(composition, pieces)
    const result = await shareOrDownload(blob, `${look.name}.png`.replace(/[\\/:*?"<>|]/g, '-'), look.name)
    if (result === 'downloaded') toast('Imagen PNG descargada')
  }

  const actions: [string, typeof Heart, () => void][] = [
    [look.isFavorite ? 'Favorito' : 'Favorito', Heart, () => patchLook(look.id, { isFavorite: !look.isFavorite })],
    ['Editar', SlidersHorizontal, () => setEditor(true)],
    ['Exportar', Share2, exportPNG],
    ['Planificar', CalendarPlus, () => setSheet('plan')],
    ['Usado hoy', CircleCheck, async () => { await markWorn(look.garmentIDs); await patchLook(look.id, { lastWornAt: new Date().toISOString() }); toast('Registrado como usado hoy') }],
    ['Comparar', Columns2, () => navigate(`/comparar?look=${look.id}${linkedRefs[0] ? `&ref=${linkedRefs[0].id}` : ''}`)],
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={look.name}
        back="/looks"
        subtitle={[look.style && STYLES[look.style].label, look.occasion && OCCASIONS[look.occasion].label].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <IconButton label="Editar detalles" onClick={() => setSheet('edit')}><Pencil size={20} /></IconButton>
            <IconButton label="Más opciones" onClick={() => setSheet('more')}><Ellipsis size={22} /></IconButton>
          </>
        }
      />
      <div className="overflow-hidden rounded-3xl shadow-sm">
        {composition && pieces ? <CollageCanvas composition={composition} pieces={pieces} /> : <Spinner label="Cargando collage…" />}
      </div>
      {missingCount > 0 && <Banner tone="warning">{missingCount} prenda(s) de este look ya no están en tu armario. Edita el collage para reemplazarlas o quitarlas.</Banner>}
      {look.tags.length > 0 && <p className="text-sm text-accent">{look.tags.map((t) => `#${t}`).join(' ')}</p>}

      <div className="grid grid-cols-3 gap-2">
        {actions.map(([label, Icon, run]) => (
          <button key={label} type="button" onClick={run} aria-pressed={label === 'Favorito' ? look.isFavorite : undefined} className="flex flex-col items-center gap-1.5 rounded-2xl bg-rose-soft py-3 text-xs font-medium text-accent">
            <Icon size={20} fill={label === 'Favorito' && look.isFavorite ? 'currentColor' : 'none'} aria-hidden />{label}
          </button>
        ))}
      </div>

      <section className="card divide-y divide-line px-4">
        <h2 className="py-3 font-semibold">Prendas</h2>
        {garments.map((g) => (
          <Link key={g.id} to={`/armario/${g.id}`} className="flex items-center gap-3 py-3">
            <StoredImage id={g.thumbnailFileName} alt={g.name} className="size-12 rounded-xl bg-cream p-1" />
            <div className="min-w-0"><p className="truncate text-sm">{g.name}</p><p className="text-xs text-muted">{CATEGORIES[g.category].label}</p></div>
          </Link>
        ))}
      </section>
      {look.explanation && <section className="card p-4 text-sm"><h2 className="mb-1 font-semibold">Por qué funciona</h2><p className="whitespace-pre-wrap text-muted">{look.explanation}</p></section>}
      {look.notes && <section className="card p-4 text-sm"><h2 className="mb-1 font-semibold">Notas</h2><p className="whitespace-pre-wrap text-muted">{look.notes}</p></section>}
      {linkedRefs.length > 0 && (
        <section className="card space-y-2 p-4 text-sm">
          <h2 className="font-semibold">Referencias de inspiración</h2>
          {linkedRefs.map((r) => <Link key={r.id} to={`/inspiracion/${r.id}`} className="block text-accent">{r.title}</Link>)}
        </section>
      )}
      <PinterestList title="Busca inspiración" queries={queriesForGarments(garments, look.style, look.occasion)} linkedLookID={look.id} linkedGarmentIDs={look.garmentIDs} />

      {editor && composition && pieces && (
        <CollageEditor initial={composition} pieces={pieces} title={look.name} onClose={() => setEditor(false)} onSave={async (c, p) => { setPieces(p); await updateComposition(look, c); toast('Collage guardado'); setEditor(false) }} />
      )}
      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title="Más opciones">
        <div className="space-y-2">
          <Button variant="secondary" full onClick={() => setSheet('collections')}><FolderPlus size={18} />Colecciones</Button>
          <Button variant="secondary" full onClick={async () => { setSheet(null); const copy = await duplicateLook(look); toast(`Se creó “${copy.name}”`); navigate(`/looks/${copy.id}`) }}><Copy size={18} />Duplicar</Button>
          <Button variant="danger" full onClick={() => setSheet('delete')}><Trash2 size={18} />Eliminar look</Button>
        </div>
      </Sheet>
      <LookInfoSheet look={look} open={sheet === 'edit'} onClose={() => setSheet(null)} />
      <Sheet open={sheet === 'plan'} onClose={() => setSheet(null)} title="Planificar look">
        <input type="date" value={planDay} onChange={(e) => setPlanDay(e.target.value)} className={inputClass} />
        <Button full className="mt-4" onClick={async () => { await planLook(look.id, planDay); setSheet(null); toast('Look planificado') }}>Planificar</Button>
      </Sheet>
      <Sheet open={sheet === 'collections'} onClose={() => setSheet(null)} title="Colecciones">
        {collections.length === 0 ? <p className="text-sm text-muted">Crea una colección en Mis looks → Colecciones.</p> : (
          <div className="space-y-2">
            {collections.map((c) => {
              const inside = c.lookIDs.includes(look.id)
              return (
                <button key={c.id} type="button" aria-pressed={inside} className="card flex w-full items-center justify-between p-4 text-left" onClick={() => db.collections.put({ ...c, lookIDs: inside ? c.lookIDs.filter((x) => x !== look.id) : [...c.lookIDs, look.id] })}>
                  {c.name}{inside && <Check size={18} className="text-accent" />}
                </button>
              )
            })}
          </div>
        )}
      </Sheet>
      <Confirm open={sheet === 'delete'} onClose={() => setSheet(null)} title="¿Eliminar este look?" message="Las prendas no se borran; solo el look, su collage y su planificación." confirmLabel="Eliminar look" onConfirm={async () => { await deleteLook(look); toast('Look eliminado'); navigate('/looks', { replace: true }) }} />
    </div>
  )
}

function LookInfoSheet({ look, open, onClose }: { look: Look; open: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(look)
  useEffect(() => { if (open) setDraft(look) }, [open, look])
  return (
    <Sheet open={open} onClose={onClose} title="Detalles del look">
      <div className="space-y-5">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} aria-label="Nombre" />
        <div><p className="mb-2 text-sm font-semibold">Estilo</p><ChipGroup single items={STYLE_LIST} selected={draft.style ? [draft.style] : []} onChange={(v) => setDraft({ ...draft, style: v[0] })} label={(s) => STYLES[s].label} /></div>
        <div><p className="mb-2 text-sm font-semibold">Ocasión</p><ChipGroup single items={OCCASION_LIST} selected={draft.occasion ? [draft.occasion] : []} onChange={(v) => setDraft({ ...draft, occasion: v[0] })} label={(o) => OCCASIONS[o].label} /></div>
        <div><p className="mb-2 text-sm font-semibold">Etiquetas</p><TagInput tags={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} /></div>
        <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3} placeholder="Notas" className={inputClass} aria-label="Notas" />
        <Button full onClick={async () => { await patchLook(look.id, { name: draft.name.trim() || look.name, style: draft.style, occasion: draft.occasion, tags: draft.tags, notes: draft.notes }); onClose() }}>Guardar</Button>
      </div>
    </Sheet>
  )
}
