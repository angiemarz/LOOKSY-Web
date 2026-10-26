import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, FolderPlus, LayoutGrid, Plus, Trash2, CircleCheck } from 'lucide-react'
import { db } from '@/db/db'
import { OCCASIONS, OCCASION_LIST, STYLES, STYLE_LIST, type FashionStyle, type Occasion } from '@/domain/fashion'
import { normalize, uuid } from '@/domain/normalize'
import type { Look } from '@/domain/models'
import { localDay, planLook, weekDays } from '@/services/looks'
import { markWorn } from '@/services/wardrobe'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Button, Chip, Confirm, EmptyState, IconButton, Sheet, inputClass } from '@/ui/primitives'
import { LookCard, LookPreview } from '@/ui/cards'

type Tab = 'looks' | 'colecciones' | 'calendario'
const TABS: Record<Tab, string> = { looks: 'Looks', colecciones: 'Colecciones', calendario: 'Calendario' }

export function LooksPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) in TABS ? (params.get('tab') as Tab) : 'looks'
  return (
    <div>
      <PageHeader title="Mis looks" />
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-cream p-1 text-sm" role="tablist">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setParams(t === 'looks' ? {} : { tab: t }, { replace: true })} className={`rounded-full py-2 ${tab === t ? 'bg-surface font-semibold shadow-sm' : 'text-muted'}`}>{TABS[t]}</button>
        ))}
      </div>
      {tab === 'looks' && <LooksGrid />}
      {tab === 'colecciones' && <Collections />}
      {tab === 'calendario' && <Planner />}
    </div>
  )
}

function LooksGrid() {
  const navigate = useNavigate()
  const looks = useLiveQuery(() => db.looks.orderBy('createdAt').reverse().toArray(), [])
  const garmentIDs = new Set(useLiveQuery(() => db.garments.toCollection().primaryKeys(), []) ?? [])
  const [favorites, setFavorites] = useState(false)
  const [style, setStyle] = useState<FashionStyle | ''>('')
  const [occasion, setOccasion] = useState<Occasion | ''>('')
  const [search, setSearch] = useState('')
  const q = normalize(search)
  const visible = (looks ?? []).filter((l) =>
    (!favorites || l.isFavorite) && (!style || l.style === style) && (!occasion || l.occasion === occasion)
    && (!q || normalize(l.name).includes(q) || l.tags.some((t) => normalize(t).includes(q))))

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar look o etiqueta" className={inputClass} type="search" />
        <IconButton label="Crear look manualmente" onClick={() => navigate('/looks/nuevo')} className="bg-accent text-on-accent hover:bg-accent"><Plus size={22} /></IconButton>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip selected={favorites} onClick={() => setFavorites(!favorites)}>Favoritos</Chip>
        <select aria-label="Estilo" value={style} onChange={(e) => setStyle(e.target.value as FashionStyle | '')} className="rounded-full border border-line bg-cream px-3 py-2 text-sm">
          <option value="">Todos los estilos</option>
          {STYLE_LIST.map((s) => <option key={s} value={s}>{STYLES[s].label}</option>)}
        </select>
        <select aria-label="Ocasión" value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion | '')} className="rounded-full border border-line bg-cream px-3 py-2 text-sm">
          <option value="">Todas las ocasiones</option>
          {OCCASION_LIST.map((o) => <option key={o} value={o}>{OCCASIONS[o].label}</option>)}
        </select>
      </div>
      {!looks ? null : looks.length === 0 ? (
        <EmptyState icon={<LayoutGrid size={32} />} title="Aún no tienes looks" message="Crea outfits con el estilista y guárdalos aquí, o arma uno manualmente." action={<Button onClick={() => navigate('/crear')}>Crear outfit</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState icon={<LayoutGrid size={32} />} title="Sin resultados" message="Ningún look coincide con los filtros." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visible.map((l) => <LookCard key={l.id} look={l} missing={l.garmentIDs.filter((id) => !garmentIDs.has(id)).length} />)}
        </div>
      )}
    </div>
  )
}

function Collections() {
  const collections = useLiveQuery(() => db.collections.orderBy('createdAt').reverse().toArray(), []) ?? []
  const looks = useLiveQuery(() => db.looks.toArray(), []) ?? []
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <Button variant="secondary" full onClick={() => { setName(''); setCreating(true) }}><FolderPlus size={18} />Nueva colección</Button>
      {collections.length === 0 && <p className="px-1 text-sm text-muted">Agrupa tus looks por ocasión, temporada o viaje (ej. “Oficina”, “Vacaciones”).</p>}
      {collections.map((c) => {
        const members = looks.filter((l) => c.lookIDs.includes(l.id))
        return (
          <div key={c.id} className="card flex items-center gap-3 p-3">
            <Link to={`/looks/colecciones/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-16 w-13 shrink-0 overflow-hidden rounded-xl bg-cream">{members[0] && <LookPreview look={members[0]} />}</div>
              <div className="min-w-0"><p className="truncate font-medium">{c.name}</p><p className="text-xs text-muted">{members.length} looks</p></div>
            </Link>
            <IconButton label={`Eliminar colección ${c.name}`} onClick={() => setToDelete(c.id)}><Trash2 size={18} /></IconButton>
          </div>
        )
      })}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nueva colección">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className={inputClass} autoFocus />
        <Button full className="mt-4" disabled={!name.trim()} onClick={async () => { await db.collections.put({ id: uuid(), name: name.trim(), lookIDs: [], createdAt: new Date().toISOString() }); setCreating(false) }}>Crear</Button>
      </Sheet>
      <Confirm open={!!toDelete} onClose={() => setToDelete(null)} title="¿Eliminar la colección?" message="Los looks no se borran." confirmLabel="Eliminar colección" onConfirm={() => toDelete && db.collections.delete(toDelete)} />
    </div>
  )
}

function Planner() {
  const toast = useToast()
  const [offset, setOffset] = useState(0)
  const [pickDay, setPickDay] = useState<string | null>(null)
  const plans = useLiveQuery(() => db.plans.toArray(), []) ?? []
  const looks = useLiveQuery(() => db.looks.orderBy('createdAt').reverse().toArray(), []) ?? []
  const days = weekDays(new Date(), offset)
  const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <IconButton label="Semana anterior" onClick={() => setOffset(offset - 1)}><ChevronLeft size={22} /></IconButton>
        <div className="text-center">
          <p className="font-semibold">{fmt(days[0]!)} – {fmt(days[6]!)}</p>
          {offset !== 0 && <button type="button" className="text-xs text-accent" onClick={() => setOffset(0)}>Ir a esta semana</button>}
        </div>
        <IconButton label="Semana siguiente" onClick={() => setOffset(offset + 1)}><ChevronRight size={22} /></IconButton>
      </div>
      <p className="text-xs text-muted">Calendario local de LOOKSY: no usa ni modifica tu calendario del sistema.</p>
      {days.map((day) => {
        const key = localDay(day)
        const today = key === localDay()
        const dayPlans = plans.filter((p) => p.day === key)
        return (
          <div key={key} className={`card p-4 ${today ? 'ring-1 ring-accent' : ''}`}>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold capitalize">
              {day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
              {today && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase text-on-accent">Hoy</span>}
            </p>
            <div className="space-y-2">
              {dayPlans.map((plan) => {
                const look = looks.find((l) => l.id === plan.lookID)
                return (
                  <div key={plan.id} className="flex items-center gap-3">
                    {look ? (
                      <Link to={`/looks/${look.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="h-16 w-13 shrink-0 overflow-hidden rounded-xl bg-cream"><LookPreview look={look} /></div>
                        <div className="min-w-0"><p className="truncate text-sm">{look.name}</p>{plan.markedAsWorn && <p className="text-xs text-accent">Usado</p>}</div>
                      </Link>
                    ) : <p className="flex-1 text-sm text-muted">Look eliminado</p>}
                    {look && !plan.markedAsWorn && (
                      <IconButton label="Marcar como usado" onClick={async () => {
                        await db.plans.update(plan.id, { markedAsWorn: true })
                        await markWorn(look.garmentIDs, day)
                        await db.looks.update(look.id, { lastWornAt: day.toISOString() })
                        toast('Registrado como usado')
                      }}><CircleCheck size={20} /></IconButton>
                    )}
                    <IconButton label="Quitar del calendario" onClick={() => db.plans.delete(plan.id)}><Trash2 size={18} /></IconButton>
                  </div>
                )
              })}
              <button type="button" className="flex items-center gap-1 text-sm font-semibold text-accent" onClick={() => setPickDay(key)}><Plus size={16} />{dayPlans.length ? 'Añadir otro look' : 'Planificar look'}</button>
            </div>
          </div>
        )
      })}
      <LookPicker open={!!pickDay} onClose={() => setPickDay(null)} looks={looks} onPick={async (l) => { if (pickDay) { await planLook(l.id, pickDay); toast('Look planificado') } }} />
    </div>
  )
}

export function LookPicker({ open, onClose, looks, onPick, title = 'Elegir look' }: { open: boolean; onClose: () => void; looks: Look[]; onPick: (l: Look) => void; title?: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} wide>
      {looks.length === 0 ? <EmptyState icon={<LayoutGrid size={30} />} title="Sin looks" message="Guarda looks desde Crear outfit para elegirlos aquí." /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {looks.map((l) => (
            <button key={l.id} type="button" className="text-left" onClick={() => { onPick(l); onClose() }}>
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-cream"><LookPreview look={l} /></div>
              <p className="mt-1 truncate text-sm">{l.name}</p>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
