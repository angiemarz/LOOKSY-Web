import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Columns2, ExternalLink, Heart, Share2, Trash2, WandSparkles } from 'lucide-react'
import { db } from '@/db/db'
import { STYLES } from '@/domain/fashion'
import { COLORS } from '@/domain/color'
import { isPinterestURL } from '@/domain/pinterest'
import { deleteImages } from '@/services/images'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, ColorDot, Confirm, IconButton, StoredImage, inputClass } from '@/ui/primitives'
import { PinterestList } from '@/ui/PinterestList'

export function ReferenceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const ref = useLiveQuery(() => db.references.get(id!), [id], null)
  const looks = useLiveQuery(() => db.looks.toArray(), []) ?? []
  const [confirm, setConfirm] = useState(false)
  if (ref === null) return null
  if (!ref) return <div><PageHeader title="Referencia" back="/inspiracion" /><Banner>Esta referencia ya no existe.</Banner></div>
  const linked = looks.filter((l) => ref.linkedLookIDs.includes(l.id) || l.referenceIDs.includes(ref.id))
  const update = (changes: Partial<typeof ref>) => db.references.update(ref.id, changes)

  return (
    <div className="space-y-5">
      <PageHeader title={ref.title} back="/inspiracion" subtitle={ref.style ? STYLES[ref.style].label : undefined} actions={
        <>
          <IconButton label={ref.isFavorite ? 'Quitar de favoritas' : 'Marcar favorita'} onClick={() => update({ isFavorite: !ref.isFavorite })}><Heart size={20} fill={ref.isFavorite ? 'currentColor' : 'none'} className="text-accent" /></IconButton>
          <IconButton label="Eliminar referencia" onClick={() => setConfirm(true)}><Trash2 size={20} /></IconButton>
        </>
      } />
      {ref.imageFileName && <StoredImage id={ref.imageFileName} alt={ref.title} className="max-h-[60dvh] w-full rounded-3xl bg-cream" />}
      {ref.colors.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">{ref.colors.map((c) => <span key={c} className="inline-flex items-center gap-1.5"><ColorDot color={c} />{COLORS[c].label}</span>)}</div>
      )}
      {ref.urlString && (
        <div className="flex gap-2">
          <a href={ref.urlString} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 font-semibold text-on-accent">
            <ExternalLink size={18} />{isPinterestURL(ref.urlString) ? 'Abrir en Pinterest' : 'Abrir enlace'}
          </a>
          <IconButton label="Compartir enlace" className="bg-rose-soft" onClick={async () => { try { await navigator.share?.({ title: ref.title, url: ref.urlString }) } catch { /* cancelled */ } }}><Share2 size={20} /></IconButton>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => navigate(`/inspiracion/${ref.id}/recrear`)}><WandSparkles size={18} />Recrea este look</Button>
        <Button variant="secondary" onClick={() => navigate(`/comparar?ref=${ref.id}${linked[0] ? `&look=${linked[0].id}` : ''}`)}><Columns2 size={18} />Comparar</Button>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Notas</span>
        <textarea defaultValue={ref.notes} onBlur={(e) => update({ notes: e.target.value })} rows={3} className={inputClass} />
      </label>
      {linked.length > 0 && (
        <section className="card space-y-2 p-4">
          <h2 className="font-semibold">Looks relacionados</h2>
          {linked.map((l) => <Link key={l.id} to={`/looks/${l.id}`} className="block text-sm text-accent">{l.name}</Link>)}
        </section>
      )}
      {ref.searchQuery && <PinterestList title="Búsqueda guardada" queries={[{ text: ref.searchQuery, language: 'ES' }]} allowSave={false} />}
      <p className="text-xs text-muted">Guardada el {new Date(ref.createdAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
      <Confirm open={confirm} onClose={() => setConfirm(false)} title="¿Eliminar esta referencia?" message="Se borrará la referencia y su imagen de este dispositivo." confirmLabel="Eliminar" onConfirm={async () => {
        await deleteImages([ref.imageFileName])
        for (const l of looks.filter((x) => x.referenceIDs.includes(ref.id))) await db.looks.update(l.id, { referenceIDs: l.referenceIDs.filter((x) => x !== ref.id) })
        await db.references.delete(ref.id)
        toast('Referencia eliminada')
        navigate('/inspiracion', { replace: true })
      }} />
    </div>
  )
}
