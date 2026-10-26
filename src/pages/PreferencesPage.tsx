import { useLiveQuery } from 'dexie-react-hooks'
import { Star } from 'lucide-react'
import { db } from '@/db/db'
import { OCCASIONS, OCCASION_LIST, SEASONS, SEASON_LIST, SILHOUETTES, SILHOUETTE_LIST, STYLES, STYLE_LIST, CATEGORIES, categoriesIn, formalityLabel } from '@/domain/fashion'
import { usePreferences } from '@/state/preferences'
import { PageHeader } from '@/ui/Layout'
import { ChipGroup, ColorPicker, StoredImage } from '@/ui/primitives'
import { Toggle } from './GarmentEditorPage'

const COMFORT = ['Máxima', 'Alta', 'Equilibrada', 'Flexible', 'Prioriza el look']

export function PreferencesPage() {
  const [prefs, setPrefs] = usePreferences()
  const garments = useLiveQuery(() => db.garments.orderBy('createdAt').reverse().toArray(), []) ?? []
  const set = <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) => setPrefs({ ...prefs, [key]: value })
  const block = 'card space-y-3 p-4'
  return (
    <div className="space-y-4">
      <PageHeader title="Preferencias" back="/ajustes" subtitle="El estilista las usa en cada recomendación." />
      <section className={block}><h2 className="font-semibold">Estilos favoritos</h2><ChipGroup items={STYLE_LIST} selected={prefs.favoriteStyles} onChange={(v) => set('favoriteStyles', v)} label={(s) => STYLES[s].label} /></section>
      <section className={block}><h2 className="font-semibold">Colores favoritos</h2><ColorPicker multiple selected={prefs.favoriteColors} onChange={(v) => set('favoriteColors', v)} exclude={prefs.avoidedColors} /></section>
      <section className={block}>
        <h2 className="font-semibold">Colores que evito</h2>
        <p className="text-xs text-muted">El estilista no propondrá prendas con estos colores salvo que las pidas explícitamente.</p>
        <ColorPicker multiple selected={prefs.avoidedColors} onChange={(v) => set('avoidedColors', v)} exclude={prefs.favoriteColors} />
      </section>
      <section className={block}>
        <h2 className="font-semibold">Calzado preferido</h2>
        <ChipGroup items={categoriesIn('shoes')} selected={prefs.preferredShoes} onChange={(v) => set('preferredShoes', v)} label={(c) => CATEGORIES[c].label} />
        <Toggle label="Evitar tacones" hint="Excluye prendas etiquetadas o nombradas como tacones." checked={prefs.avoidHeels} onChange={(v) => set('avoidHeels', v)} />
      </section>
      <section className={block}>
        <label className="block text-sm font-semibold">Comodidad: {COMFORT[prefs.comfortLevel - 1]}
          <input type="range" min={1} max={5} value={prefs.comfortLevel} onChange={(e) => set('comfortLevel', Number(e.target.value))} className="mt-2 w-full accent-[var(--lx-accent)]" />
        </label>
        <label className="block text-sm font-semibold">Formalidad habitual: {formalityLabel(prefs.usualFormality)}
          <input type="range" min={1} max={5} value={prefs.usualFormality} onChange={(e) => set('usualFormality', Number(e.target.value))} className="mt-2 w-full accent-[var(--lx-accent)]" />
        </label>
      </section>
      <section className={block}><h2 className="font-semibold">Siluetas que prefieres</h2><ChipGroup items={SILHOUETTE_LIST.filter((s) => s !== 'noDefinida')} selected={prefs.silhouettePreferences} onChange={(v) => set('silhouettePreferences', v)} label={(s) => SILHOUETTES[s]} /></section>
      <section className={block}><h2 className="font-semibold">Ocasiones frecuentes</h2><ChipGroup items={OCCASION_LIST} selected={prefs.frequentOccasions} onChange={(v) => set('frequentOccasions', v)} label={(o) => OCCASIONS[o].label} /></section>
      <section className={block}><h2 className="font-semibold">Temporadas</h2><ChipGroup items={SEASON_LIST} selected={prefs.seasons} onChange={(v) => set('seasons', v)} label={(s) => SEASONS[s].label} /></section>
      <section className={block}>
        <h2 className="font-semibold">Prendas favoritas para combinar</h2>
        {garments.length === 0 ? <p className="text-sm text-muted">Agrega prendas a tu armario para elegir favoritas.</p> : (
          <div className="divide-y divide-line">
            {garments.map((g) => {
              const on = prefs.favoriteGarmentIDs.includes(g.id)
              return (
                <button key={g.id} type="button" aria-pressed={on} className="flex w-full items-center gap-3 py-2 text-left" onClick={() => set('favoriteGarmentIDs', on ? prefs.favoriteGarmentIDs.filter((x) => x !== g.id) : [...prefs.favoriteGarmentIDs, g.id])}>
                  <StoredImage id={g.thumbnailFileName} alt={g.name} className="size-10 rounded-lg bg-cream p-0.5" />
                  <span className="flex-1 text-sm">{g.name}</span>
                  <Star size={18} className="text-accent" fill={on ? 'currentColor' : 'none'} aria-hidden />
                </button>
              )
            })}
          </div>
        )}
        <p className="text-xs text-muted">LOOKSY no aplica restricciones por talla ni tipo de cuerpo.</p>
      </section>
    </div>
  )
}
