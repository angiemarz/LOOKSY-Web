import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Crop, Eraser, Pipette, RotateCw, ScanLine } from 'lucide-react'
import { db } from '@/db/db'
import {
  CATEGORIES, CATEGORY_LIST, MATERIALS, MATERIAL_LIST, OCCASIONS, OCCASION_LIST, PATTERNS, PATTERN_LIST, SEASONS, SEASON_LIST,
  SILHOUETTES, SILHOUETTE_LIST, STYLES, STYLE_LIST, formalityLabel,
} from '@/domain/fashion'
import { COLORS, secondaryColors, type ColorEntry } from '@/domain/color'
import type { Garment } from '@/domain/models'
import { analyzeColors, cropCanvas, decodeImage, foregroundBounds, loadCanvas, removeBackground, rotateCanvas, toCanvas, MAX_ORIGINAL } from '@/services/images'
import { createGarment, updateGarment, type GarmentDraft } from '@/services/wardrobe'
import { clearPendingImports, getPendingImports } from '@/state/imports'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, ChipGroup, ColorPicker, Field, Sheet, Spinner, inputClass } from '@/ui/primitives'
import { CropTool } from '@/ui/CropTool'
import { TagInput } from '@/ui/TagInput'

const emptyDraft = (): GarmentDraft => ({
  name: '', category: 'blusas', primaryColor: 'negro', secondaryColors: [], material: 'desconocido', pattern: 'liso', styles: [],
  silhouette: 'noDefinida', seasons: [], formality: CATEGORIES.blusas.formality, occasions: [], tags: [], notes: '', isAvailable: true, isFavorite: false,
})

const draftFrom = (g: Garment): GarmentDraft => ({
  name: g.name, category: g.category, primaryColor: g.primaryColor, secondaryColors: g.secondaryColors, detectedColorHex: g.detectedColorHex,
  material: g.material, pattern: g.pattern, styles: g.styles, silhouette: g.silhouette, seasons: g.seasons, formality: g.formality,
  occasions: g.occasions, tags: g.tags, notes: g.notes, isAvailable: g.isAvailable, isFavorite: g.isFavorite,
})

export function GarmentEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const editing = !!id
  const [queue] = useState<File[]>(() => (editing ? [] : getPendingImports()))
  const [index, setIndex] = useState(0)
  const [garment, setGarment] = useState<Garment | null>(null)
  const [draft, setDraft] = useState<GarmentDraft>(emptyDraft)
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [cutout, setCutout] = useState<HTMLCanvasElement | null>(null)
  const [useCutout, setUseCutout] = useState(false)
  const [photoChanged, setPhotoChanged] = useState(false)
  const [cutoutChanged, setCutoutChanged] = useState(false)
  const [analysis, setAnalysis] = useState<ColorEntry[]>([])
  const [picked, setPicked] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const display = useCutout && cutout ? cutout : photo
  const displayURL = useMemo(() => display?.toDataURL('image/png'), [display])
  const set = <K extends keyof GarmentDraft>(key: K, value: GarmentDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const detect = (source: HTMLCanvasElement | null, apply: boolean) => {
    if (!source) return
    const entries = analyzeColors(source)
    setAnalysis(entries)
    if (!entries.length) { setError('No se pudieron detectar los colores. Elige el color manualmente.'); return }
    if (apply && !picked) {
      const primary = entries[0]!.color
      setDraft((d) => ({ ...d, primaryColor: primary, secondaryColors: secondaryColors(entries).filter((c) => c !== primary), detectedColorHex: entries[0]!.averageHex }))
    }
  }

  // Load the current photo (create) or the stored garment (edit).
  useEffect(() => {
    let alive = true
    setError(null)
    ;(async () => {
      if (editing) {
        const g = await db.garments.get(id!)
        if (!alive) return
        if (!g) { setError('Esta prenda ya no existe.'); return }
        setGarment(g)
        setDraft(draftFrom(g))
        setUseCutout(g.usesCutout)
        if (g.imageFileName) setPhoto(await loadCanvas(g.imageFileName))
        if (g.cutoutFileName) setCutout(await loadCanvas(g.cutoutFileName))
        return
      }
      const file = queue[index]
      if (!file) return
      setDraft(emptyDraft()); setCutout(null); setUseCutout(false); setAnalysis([]); setPicked(false)
      try {
        setBusy('Preparando la foto…')
        const canvas = toCanvas(await decodeImage(file), MAX_ORIGINAL)
        if (!alive) return
        setPhoto(canvas)
        setPhotoChanged(true)
        detect(canvas, true)
      } catch (e) {
        setPhoto(null)
        setError((e as Error).message)
      } finally {
        setBusy(null)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, index])

  const runTool = async (label: string, work: () => void) => {
    setBusy(label)
    setError(null)
    await new Promise((r) => setTimeout(r, 30)) // let the spinner paint before heavy work
    try { work() } finally { setBusy(null) }
  }

  const removeBg = () => runTool('Separando la prenda del fondo…', () => {
    if (!photo) return
    const result = removeBackground(photo)
    if (!result) { setError('No se pudo separar la prenda: funciona con fondos lisos y contrastados. Puedes recortarla o usar la foto original.'); return }
    setCutout(result); setUseCutout(true); setCutoutChanged(true)
    detect(result, true)
  })

  const autoFrame = () => runTool('Mejorando el encuadre…', () => {
    if (!photo) return
    const bounds = foregroundBounds(photo)
    if (!bounds) { setError('No se encontró la prenda para encuadrarla. Usa el recorte manual.'); return }
    applyCrop(bounds)
  })

  const applyCrop = (rect: { x: number; y: number; width: number; height: number }) => {
    if (!photo) return
    setPhoto(cropCanvas(photo, rect)); setPhotoChanged(true)
    if (cutout) { setCutout(null); setUseCutout(false); setCutoutChanged(true) }
  }

  const rotate = () => {
    if (!photo) return
    setPhoto(rotateCanvas(photo, true)); setPhotoChanged(true)
    if (cutout) { setCutout(rotateCanvas(cutout, true)); setCutoutChanged(true) }
  }

  const next = () => {
    if (index + 1 < queue.length) setIndex(index + 1)
    else {
      clearPendingImports()
      navigate('/armario')
    }
  }

  const save = async () => {
    setBusy('Guardando…')
    setError(null)
    try {
      if (editing && garment) {
        await updateGarment(garment, draft, {
          photo: photoChanged && photo ? photo : undefined,
          cutout: cutoutChanged ? cutout : undefined,
          useCutout,
          display,
        })
        toast('Prenda actualizada')
        navigate(`/armario/${garment.id}`, { replace: true })
      } else {
        if (!photo) { setError('Falta la fotografía de la prenda.'); return }
        await createGarment({ ...draft, name: draft.name.trim() || CATEGORIES[draft.category].singular.replace(/^./, (c) => c.toUpperCase()) }, photo, cutout, useCutout)
        toast(queue.length > 1 ? `Prenda ${index + 1} de ${queue.length} guardada` : 'Prenda guardada')
        next()
      }
    } catch {
      setError('No se pudo guardar la prenda. Revisa el espacio disponible del dispositivo.')
    } finally {
      setBusy(null)
    }
  }

  if (!editing && queue.length === 0) {
    return (
      <div>
        <PageHeader title="Nueva prenda" back="/armario" />
        <Banner>Elige fotos desde Mi armario para agregar prendas.</Banner>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={editing ? 'Editar prenda' : 'Nueva prenda'}
        subtitle={!editing && queue.length > 1 ? `${index + 1} de ${queue.length}` : undefined}
        back={editing ? `/armario/${id}` : '/armario'}
      />

      <div className="card space-y-3 p-4">
        <div className={`relative grid aspect-square place-items-center overflow-hidden rounded-2xl ${useCutout && cutout ? 'bg-white' : 'bg-cream'}`}>
          {displayURL ? <img src={displayURL} alt="Foto de la prenda" className="max-h-full max-w-full object-contain p-3" /> : !busy && <span className="text-sm text-muted">Sin foto</span>}
          {busy && <div className="absolute inset-0 grid place-items-center bg-surface/70"><Spinner label={busy} /></div>}
        </div>
        {cutout && (
          <div className="grid grid-cols-2 gap-1 rounded-full bg-cream p-1 text-sm" role="radiogroup" aria-label="Imagen para collages">
            {[[true, 'Sin fondo'], [false, 'Foto original']].map(([value, label]) => (
              <button key={String(value)} type="button" role="radio" aria-checked={useCutout === value} onClick={() => setUseCutout(value as boolean)} className={`rounded-full py-2 ${useCutout === value ? 'bg-surface font-semibold shadow-sm' : 'text-muted'}`}>{label as string}</button>
            ))}
          </div>
        )}
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {[
            ['Quitar fondo liso', Eraser, removeBg],
            ['Recortar', Crop, () => setCropOpen(true)],
            ['Auto encuadre', ScanLine, autoFrame],
            ['Girar', RotateCw, rotate],
            ['Detectar color', Pipette, () => { setPicked(false); detect(display, true) }],
          ].map(([label, Icon, action]) => {
            const I = Icon as typeof Eraser
            return (
              <Button key={label as string} variant="secondary" className="shrink-0 px-4 py-2 text-sm" disabled={!photo || !!busy} onClick={action as () => void}>
                <I size={16} />{label as string}
              </Button>
            )
          })}
        </div>
        <p className="text-xs text-muted">"Quitar fondo" funciona mejor con la prenda sobre una superficie lisa. Todo se procesa en tu dispositivo.</p>
      </div>

      {error && <Banner tone="warning">{error}</Banner>}

      <div className="card space-y-5 p-5">
        <Field label="Nombre">
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Blusa rosa de lino" className={inputClass} />
        </Field>
        <Field label="Categoría">
          <select value={draft.category} onChange={(e) => { const c = e.target.value as GarmentDraft['category']; setDraft((d) => ({ ...d, category: c, formality: editing ? d.formality : CATEGORIES[c].formality })) }} className={inputClass}>
            {CATEGORY_LIST.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
          </select>
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Color principal</p>
          {analysis.length > 0 && (
            <p className="flex flex-wrap items-center gap-3 text-xs text-muted">
              Detectado en la foto:
              {analysis.map((e) => (
                <span key={e.color} className="inline-flex items-center gap-1">
                  <span className="inline-block size-3 rounded-full border border-line" style={{ background: e.averageHex }} />
                  {COLORS[e.color].label} {Math.round(e.share * 100)}%
                </span>
              ))}
            </p>
          )}
          <ColorPicker selected={[draft.primaryColor]} onChange={(c) => { set('primaryColor', c[0]!); setPicked(true) }} highlighted={analysis.map((e) => e.color)} />
          <p className="text-xs text-muted">El color se mide en el dispositivo; corrígelo si no coincide.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Colores secundarios</p>
          <ColorPicker multiple selected={draft.secondaryColors} onChange={(c) => set('secondaryColors', c)} exclude={[draft.primaryColor]} />
        </div>
      </div>

      <div className="card space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Material">
            <select value={draft.material} onChange={(e) => set('material', e.target.value as GarmentDraft['material'])} className={inputClass}>
              {MATERIAL_LIST.map((m) => <option key={m} value={m}>{MATERIALS[m]}</option>)}
            </select>
          </Field>
          <Field label="Estampado">
            <select value={draft.pattern} onChange={(e) => set('pattern', e.target.value as GarmentDraft['pattern'])} className={inputClass}>
              {PATTERN_LIST.map((p) => <option key={p} value={p}>{PATTERNS[p].label}</option>)}
            </select>
          </Field>
          <Field label="Silueta">
            <select value={draft.silhouette} onChange={(e) => set('silhouette', e.target.value as GarmentDraft['silhouette'])} className={inputClass}>
              {SILHOUETTE_LIST.map((s) => <option key={s} value={s}>{SILHOUETTES[s]}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Formalidad: ${formalityLabel(draft.formality)}`}>
          <input type="range" min={1} max={5} step={1} value={draft.formality} onChange={(e) => set('formality', Number(e.target.value))} className="w-full accent-[var(--lx-accent)]" />
        </Field>
        <div><p className="mb-2 text-sm font-semibold">Estilo</p><ChipGroup items={STYLE_LIST} selected={draft.styles} onChange={(v) => set('styles', v)} label={(s) => STYLES[s].label} /></div>
        <div><p className="mb-2 text-sm font-semibold">Ocasiones</p><ChipGroup items={OCCASION_LIST} selected={draft.occasions} onChange={(v) => set('occasions', v)} label={(o) => OCCASIONS[o].label} /></div>
        <div>
          <p className="mb-2 text-sm font-semibold">Temporada</p>
          <ChipGroup items={SEASON_LIST} selected={draft.seasons} onChange={(v) => set('seasons', v)} label={(s) => SEASONS[s].label} />
          <p className="mt-1 text-xs text-muted">Sin selección = todo el año.</p>
        </div>
        <div><p className="mb-2 text-sm font-semibold">Etiquetas</p><TagInput tags={draft.tags} onChange={(t) => set('tags', t)} placeholder="Ej. tacones, básico, oficina" /></div>
        <Field label="Notas">
          <textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={inputClass} placeholder="Notas personales" />
        </Field>
        <div className="space-y-3">
          <Toggle label="Disponible" hint="Las prendas no disponibles (lavandería, préstamo) no se usan en recomendaciones." checked={draft.isAvailable} onChange={(v) => set('isAvailable', v)} />
          <Toggle label="Favorita" checked={draft.isFavorite} onChange={(v) => set('isFavorite', v)} />
        </div>
      </div>

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex gap-2 md:bottom-4">
        {!editing && queue.length > 1 && <Button variant="secondary" onClick={next} disabled={!!busy}>Omitir</Button>}
        <Button full onClick={save} disabled={!!busy || (!editing && !photo)}>
          {editing ? 'Guardar cambios' : index + 1 < queue.length ? 'Guardar y seguir' : 'Guardar prenda'}
        </Button>
      </div>

      <Sheet open={cropOpen} onClose={() => setCropOpen(false)} title="Recortar" wide>
        {photo && <CropTool src={photo.toDataURL('image/jpeg', 0.9)} onCancel={() => setCropOpen(false)} onApply={(r) => { applyCrop(r); setCropOpen(false); setTimeout(() => detect(photo, false), 0) }} />}
      </Sheet>
    </div>
  )
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-beige transition peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
    </label>
  )
}
