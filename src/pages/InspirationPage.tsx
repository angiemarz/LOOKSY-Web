import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bookmark, Camera, Heart, Link2, Plus, Search } from 'lucide-react'
import { db } from '@/db/db'
import { STYLES, STYLE_LIST, type FashionStyle } from '@/domain/fashion'
import type { FashionColor } from '@/domain/color'
import { parseRequest } from '@/domain/parser'
import { queriesForPalette, queriesForRequest, type PinterestQuery } from '@/domain/pinterest'
import type { InspirationReference } from '@/domain/models'
import { PageHeader } from '@/ui/Layout'
import { Button, Chip, ChipGroup, ColorDot, ColorPicker, EmptyState, IconButton, Section, StoredImage, inputClass } from '@/ui/primitives'
import { PinterestList } from '@/ui/PinterestList'

export function InspirationPage() {
  const navigate = useNavigate()
  const references = useLiveQuery(() => db.references.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [text, setText] = useState('')
  const [style, setStyle] = useState<FashionStyle[]>([])
  const [palette, setPalette] = useState<FashionColor[]>([])
  const [favorites, setFavorites] = useState(false)

  const queries: PinterestQuery[] = []
  if (text.trim()) queries.push(...queriesForRequest(parseRequest(text), 4))
  if (style.length || palette.length) queries.push(...queriesForPalette(palette, style[0]))
  const unique = queries.filter((q, i) => queries.findIndex((x) => x.text === q.text) === i)

  return (
    <div className="space-y-8">
      <PageHeader title="Inspiración" actions={<IconButton label="Guardar referencia" onClick={() => navigate('/inspiracion/nueva')}><Plus size={22} /></IconButton>} />

      <div className="rounded-3xl bg-gradient-to-br from-rose-soft to-cream p-6">
        <h2 className="font-display text-2xl">Recrea este look</h2>
        <p className="mt-1 text-sm text-muted">Importa una captura o pega un enlace de Pinterest, describe las prendas y LOOKSY buscará equivalentes en tu armario.</p>
        <Button className="mt-4" onClick={() => navigate('/inspiracion/nueva?recrear=1')}><Camera size={18} />Empezar</Button>
      </div>

      <Section title="Buscar en Pinterest" subtitle="Genera búsquedas en español e inglés.">
        <label className="relative block">
          <span className="sr-only">Describe el look</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej. vestido floral para brunch" className={`${inputClass} pl-11`} />
        </label>
        <p className="text-sm font-semibold">Estilo</p>
        <ChipGroup single items={STYLE_LIST} selected={style} onChange={setStyle} label={(s) => STYLES[s].label} />
        <p className="text-sm font-semibold">Paleta</p>
        <ColorPicker multiple selected={palette} onChange={setPalette} />
        {unique.length > 0 && <PinterestList title="Búsquedas sugeridas" queries={unique} />}
      </Section>

      <Section title="Referencias guardadas" subtitle={references.length ? `${references.length} guardadas` : undefined}>
        {references.length === 0 ? (
          <div className="card"><EmptyState icon={<Bookmark size={30} />} title="Sin referencias" message="Guarda búsquedas, enlaces de Pinterest o capturas que te inspiren." /></div>
        ) : (
          <>
            <Chip selected={favorites} onClick={() => setFavorites(!favorites)} icon={<Heart size={14} />}>Favoritas</Chip>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {references.filter((r) => !favorites || r.isFavorite).map((r) => <ReferenceCard key={r.id} reference={r} />)}
            </div>
          </>
        )}
      </Section>
    </div>
  )
}

export function ReferenceCard({ reference, onClick }: { reference: InspirationReference; onClick?: () => void }) {
  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-rose-soft">
        {reference.imageFileName ? <StoredImage id={reference.imageFileName} alt={reference.title} fit="cover" className="size-full" /> : (
          <div className="grid size-full place-items-center text-accent">
            <div className="flex flex-col items-center gap-2">{reference.searchQuery ? <Search size={28} /> : <Link2 size={28} />}<span className="text-xs">{reference.searchQuery ? 'Búsqueda' : 'Enlace'}</span></div>
          </div>
        )}
        {reference.isFavorite && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-surface/80 text-accent"><Heart size={14} fill="currentColor" /></span>}
      </div>
      <p className="mt-2 line-clamp-2 px-1 text-sm font-medium">{reference.title}</p>
      {reference.colors.length > 0 && <div className="mt-1 flex gap-1 px-1">{reference.colors.slice(0, 5).map((c) => <ColorDot key={c} color={c} size={12} />)}</div>}
    </>
  )
  return onClick ? <button type="button" className="text-left" onClick={onClick}>{body}</button> : <Link to={`/inspiracion/${reference.id}`} className="block">{body}</Link>
}
