import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Settings, Camera, WandSparkles } from 'lucide-react'
import { db } from '@/db/db'
import { usePreferences } from '@/state/preferences'
import { Button, EmptyState, IconButton, Section, StoredImage } from '@/ui/primitives'
import { GarmentCard, LookCard, LookPreview } from '@/ui/cards'
import { PageHeader } from '@/ui/Layout'
import { localDay, weekDays } from '@/services/looks'

function greeting(name: string) {
  const hour = new Date().getHours()
  const base = hour >= 5 && hour < 12 ? 'Buenos días' : hour < 19 && hour >= 12 ? 'Buenas tardes' : 'Buenas noches'
  return name.trim() ? `${base}, ${name.trim()}` : base
}

export function HomePage() {
  const navigate = useNavigate()
  const [prefs] = usePreferences()
  const garments = useLiveQuery(() => db.garments.orderBy('createdAt').reverse().toArray(), []) ?? []
  const looks = useLiveQuery(() => db.looks.orderBy('createdAt').reverse().toArray(), []) ?? []
  const plans = useLiveQuery(() => db.plans.toArray(), []) ?? []
  const days = weekDays(new Date())
  const favorites = looks.filter((l) => l.isFavorite)
  const available = garments.filter((g) => g.isAvailable)
  const underused = available.length >= 3
    ? [...available].sort((a, b) => a.wearCount - b.wearCount || (a.lastWornAt ?? a.createdAt).localeCompare(b.lastWornAt ?? b.createdAt)).slice(0, 4)
    : []

  return (
    <div className="space-y-8">
      <PageHeader
        title={greeting(prefs.displayName)}
        subtitle="¿Qué te pondrás hoy?"
        actions={<IconButton label="Ajustes" onClick={() => navigate('/ajustes')}><Settings size={22} /></IconButton>}
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          [garments.length, 'Prendas'],
          [garments.filter((g) => g.isFavorite).length, 'Favoritas'],
          [looks.length, 'Looks'],
        ].map(([value, label]) => (
          <div key={label} className="card p-4">
            <p className="font-display text-2xl text-ink">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-rose-soft to-cream p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Tu estilista</p>
        <h2 className="mt-2 font-display text-2xl text-ink">Combina tu ropa real</h2>
        <p className="mt-1 text-sm text-muted">Describe la ocasión y LOOKSY arma outfits con prendas de tu armario.</p>
        <Button className="mt-4" onClick={() => navigate('/crear')}><WandSparkles size={18} />Crear outfit</Button>
      </div>

      <Section title="Tu semana" action={<Link to="/looks?tab=calendario" className="text-sm font-semibold text-accent">Planificar</Link>}>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const plan = plans.find((p) => p.day === localDay(day))
            const look = plan && looks.find((l) => l.id === plan.lookID)
            const today = localDay(day) === localDay()
            return (
              <div key={day.toISOString()} className="text-center" aria-label={`${day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}: ${look?.name ?? 'sin plan'}`}>
                <p className={`text-[11px] font-semibold uppercase ${today ? 'text-accent' : 'text-muted'}`}>{day.toLocaleDateString('es-MX', { weekday: 'narrow' })}</p>
                <div className={`mt-1 aspect-[4/5] overflow-hidden rounded-xl ${today ? 'bg-rose-soft ring-1 ring-accent' : 'bg-cream'}`}>
                  {look ? <LookPreview look={look} /> : <span className="grid size-full place-items-center text-xs text-muted">{day.getDate()}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Prendas recientes" action={garments.length ? <Link to="/armario" className="text-sm font-semibold text-accent">Ver todas</Link> : undefined}>
        {garments.length === 0 ? (
          <div className="card">
            <EmptyState icon={<Camera size={34} />} title="Empieza tu armario" message="Agrega fotos de tus prendas para recibir combinaciones." action={<Button onClick={() => navigate('/armario')}>Ir a Mi armario</Button>} />
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {garments.slice(0, 10).map((g) => (
              <div key={g.id} className="w-32 shrink-0"><GarmentCard garment={g} to={`/armario/${g.id}`} /></div>
            ))}
          </div>
        )}
      </Section>

      {favorites.length > 0 && (
        <Section title="Looks favoritos" action={<Link to="/looks" className="text-sm font-semibold text-accent">Ver todos</Link>}>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {favorites.slice(0, 10).map((l) => <div key={l.id} className="w-36 shrink-0"><LookCard look={l} /></div>)}
          </div>
        </Section>
      )}

      {underused.length > 0 && (
        <Section title="Dales una nueva oportunidad" subtitle="Prendas que casi no has usado">
          <div className="space-y-2">
            {underused.map((g) => (
              <div key={g.id} className="card flex items-center gap-3 p-3">
                <StoredImage id={g.thumbnailFileName} alt={g.name} className="size-14 rounded-2xl bg-cream p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-muted">{g.wearCount === 0 ? 'Aún sin usar' : `Usada ${g.wearCount} ${g.wearCount === 1 ? 'vez' : 'veces'}`}</p>
                </div>
                <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => navigate(`/crear?prenda=${g.id}`)}>Combinar</Button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
