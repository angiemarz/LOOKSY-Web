import { Bookmark, BookmarkCheck, ExternalLink, Share2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { pinterestSearchURL, type PinterestQuery } from '@/domain/pinterest'
import { uuid } from '@/domain/normalize'
import { useToast } from '@/state/toast'

/** Real Pinterest searches; they open outside LOOKSY. Nothing is scraped or invented. */
export function PinterestList({ title = 'Inspiración en Pinterest', queries, allowSave = true, linkedLookID, linkedGarmentIDs = [] }: {
  title?: string; queries: PinterestQuery[]; allowSave?: boolean; linkedLookID?: string; linkedGarmentIDs?: string[]
}) {
  const toast = useToast()
  const saved = useLiveQuery(() => db.references.toArray(), []) ?? []
  if (!queries.length) return null
  const save = async (q: PinterestQuery) => {
    await db.references.put({
      id: uuid(), title: q.text, urlString: pinterestSearchURL(q.text), searchQuery: q.text, colors: [], notes: '', isFavorite: false,
      linkedLookIDs: linkedLookID ? [linkedLookID] : [], linkedGarmentIDs, formality: 2, createdAt: new Date().toISOString(),
    })
    toast('Búsqueda guardada en Inspiración')
  }
  const share = async (q: PinterestQuery) => {
    const url = pinterestSearchURL(q.text)
    if (navigator.share) {
      try { await navigator.share({ title: q.text, url }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(url)
      toast('Enlace copiado')
    }
  }
  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-display text-xl">{title}</h2>
        <p className="text-sm text-muted">Búsquedas reales en Pinterest; se abren en una pestaña nueva o en la app de Pinterest.</p>
      </div>
      {queries.map((q) => {
        const isSaved = saved.some((r) => r.searchQuery === q.text)
        return (
          <div key={q.language + q.text} className="card flex items-center gap-2 p-2 pl-3">
            <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[10px] font-bold text-accent">{q.language}</span>
            <a href={pinterestSearchURL(q.text)} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1">{q.text}</span><ExternalLink size={16} className="shrink-0 text-accent" aria-hidden />
            </a>
            {allowSave && (
              <button type="button" aria-label={isSaved ? 'Búsqueda guardada' : 'Guardar búsqueda'} disabled={isSaved} onClick={() => save(q)} className="grid size-10 place-items-center rounded-full text-accent disabled:opacity-60">
                {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>
            )}
            <button type="button" aria-label="Compartir búsqueda" onClick={() => share(q)} className="grid size-10 place-items-center rounded-full text-accent"><Share2 size={18} /></button>
          </div>
        )
      })}
    </section>
  )
}
