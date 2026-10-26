import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ImagePlus, SlidersHorizontal, Shirt, Search } from 'lucide-react'
import { db } from '@/db/db'
import { CATEGORIES, CATEGORY_LIST, SEASONS, SEASON_LIST, STYLES, STYLE_LIST, type FashionStyle, type GarmentCategory, type Season } from '@/domain/fashion'
import { COLORS, type FashionColor } from '@/domain/color'
import { garmentColors, type Garment } from '@/domain/models'
import { normalize } from '@/domain/normalize'
import { setPendingImports } from '@/state/imports'
import { PageHeader } from '@/ui/Layout'
import { Button, Chip, ChipGroup, ColorPicker, EmptyState, IconButton, Sheet, inputClass } from '@/ui/primitives'
import { GarmentCard } from '@/ui/cards'

type Sort = 'newest' | 'oldest' | 'name' | 'category' | 'leastWorn'
const SORTS: Record<Sort, string> = { newest: 'Más recientes', oldest: 'Más antiguas', name: 'Nombre', category: 'Categoría', leastWorn: 'Menos usadas' }

export function WardrobePage() {
  const navigate = useNavigate()
  const garments = useLiveQuery(() => db.garments.toArray(), [])
  const photoInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<GarmentCategory[]>([])
  const [colors, setColors] = useState<FashionColor[]>([])
  const [styles, setStyles] = useState<FashionStyle[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilters = colors.length + styles.length + seasons.length + (onlyFavorites ? 1 : 0) + (onlyAvailable ? 1 : 0) + (tag.trim() ? 1 : 0)
  const reset = () => { setCategories([]); setColors([]); setStyles([]); setSeasons([]); setOnlyFavorites(false); setOnlyAvailable(false); setTag(''); setSearch('') }

  const visible = useMemo(() => {
    const q = normalize(search.trim())
    const t = normalize(tag.trim())
    const list = (garments ?? []).filter((g) => {
      if (categories.length && !categories.includes(g.category)) return false
      if (colors.length && !garmentColors(g).some((c) => colors.includes(c))) return false
      if (styles.length && !g.styles.some((s) => styles.includes(s))) return false
      if (seasons.length && g.seasons.length && !g.seasons.some((s) => seasons.includes(s))) return false
      if (onlyFavorites && !g.isFavorite) return false
      if (onlyAvailable && !g.isAvailable) return false
      if (t && !g.tags.some((x) => normalize(x).includes(t))) return false
      if (q) {
        const hay = normalize([g.name, CATEGORIES[g.category].label, COLORS[g.primaryColor].label, ...g.tags, g.notes].join(' '))
        if (!hay.includes(q)) return false
      }
      return true
    })
    const order = (g: Garment) => CATEGORY_LIST.indexOf(g.category)
    const sorters: Record<Sort, (a: Garment, b: Garment) => number> = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      name: (a, b) => a.name.localeCompare(b.name, 'es'),
      category: (a, b) => order(a) - order(b) || b.createdAt.localeCompare(a.createdAt),
      leastWorn: (a, b) => a.wearCount - b.wearCount || (a.lastWornAt ?? '').localeCompare(b.lastWornAt ?? ''),
    }
    return list.sort(sorters[sort])
  }, [garments, search, categories, colors, styles, seasons, onlyFavorites, onlyAvailable, tag, sort])

  const onFiles = (files: FileList | null) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!list.length) return
    setPendingImports(list.slice(0, 20))
    navigate('/armario/nueva')
  }

  const counts = new Map<GarmentCategory, number>()
  for (const g of garments ?? []) counts.set(g.category, (counts.get(g.category) ?? 0) + 1)

  return (
    <div>
      <PageHeader
        title="Mi armario"
        subtitle={garments ? `${garments.length} prendas` : undefined}
        actions={
          <>
            <IconButton label="Tomar foto" onClick={() => cameraInput.current?.click()}><Camera size={22} /></IconButton>
            <IconButton label="Importar fotos" onClick={() => photoInput.current?.click()} className="bg-accent text-on-accent hover:bg-accent"><ImagePlus size={20} /></IconButton>
          </>
        }
      />
      <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />

      {garments && garments.length === 0 ? (
        <EmptyState
          icon={<Shirt size={34} />}
          title="Tu armario está vacío"
          message="Fotografía o importa tus prendas reales. Todo se guarda solo en este dispositivo."
          action={<Button onClick={() => photoInput.current?.click()}><ImagePlus size={18} />Agregar prendas</Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Buscar</span>
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, color o etiqueta" className={`${inputClass} pl-11`} type="search" />
            </label>
            <IconButton label={`Filtros${activeFilters ? ` (${activeFilters})` : ''}`} onClick={() => setFiltersOpen(true)} className={`relative border border-line ${activeFilters ? 'bg-rose-soft text-accent' : ''}`}>
              <SlidersHorizontal size={20} />
              {activeFilters > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-accent text-[10px] text-on-accent">{activeFilters}</span>}
            </IconButton>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Chip selected={categories.length === 0} onClick={() => setCategories([])}>Todas</Chip>
            {CATEGORY_LIST.filter((c) => counts.has(c)).map((c) => (
              <Chip key={c} selected={categories.includes(c)} onClick={() => setCategories(categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c])}>
                {CATEGORIES[c].label} {counts.get(c)}
              </Chip>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-muted">
            <span>{visible.length} de {garments?.length ?? 0}</span>
            <label className="flex items-center gap-2">
              <span className="sr-only">Ordenar</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full bg-cream px-3 py-1.5 text-sm text-ink">
                {(Object.keys(SORTS) as Sort[]).map((s) => <option key={s} value={s}>{SORTS[s]}</option>)}
              </select>
            </label>
          </div>
          {!garments ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton aspect-[4/5] rounded-3xl" />)}</div>
          ) : visible.length === 0 ? (
            <EmptyState icon={<SlidersHorizontal size={30} />} title="Sin resultados" message="Ninguna prenda coincide con la búsqueda o los filtros." action={<Button variant="secondary" onClick={reset}>Quitar filtros</Button>} />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {visible.map((g) => <GarmentCard key={g.id} garment={g} to={`/armario/${g.id}`} />)}
            </div>
          )}
        </div>
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Chip selected={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}>Solo favoritas</Chip>
            <Chip selected={onlyAvailable} onClick={() => setOnlyAvailable(!onlyAvailable)}>Solo disponibles</Chip>
          </div>
          <div><p className="mb-2 text-sm font-semibold">Colores</p><ColorPicker multiple selected={colors} onChange={setColors} /></div>
          <div><p className="mb-2 text-sm font-semibold">Estilos</p><ChipGroup items={STYLE_LIST} selected={styles} onChange={setStyles} label={(s) => STYLES[s].label} /></div>
          <div><p className="mb-2 text-sm font-semibold">Temporada</p><ChipGroup items={SEASON_LIST} selected={seasons} onChange={setSeasons} label={(s) => SEASONS[s].label} /></div>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Etiqueta</span><input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ej. trabajo" className={inputClass} /></label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>Restablecer</Button>
            <Button full onClick={() => setFiltersOpen(false)}>Ver {visible.length} prendas</Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
