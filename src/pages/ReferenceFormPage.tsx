import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ImagePlus, Trash2 } from 'lucide-react'
import { db } from '@/db/db'
import { STYLES, STYLE_LIST, type FashionStyle } from '@/domain/fashion'
import { COLORS, type ColorEntry, type FashionColor } from '@/domain/color'
import { isPinterestURL, normalizeURL } from '@/domain/pinterest'
import { uuid } from '@/domain/normalize'
import { analyzeColors, decodeImage, storeCanvas, toCanvas } from '@/services/images'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, ChipGroup, ColorPicker, Field, inputClass } from '@/ui/primitives'

/** Saves a reference: Pinterest link and/or a screenshot. Links are stored, never fetched or analyzed. */
export function ReferenceFormPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const recreate = params.get('recrear') === '1'
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [urlText, setURLText] = useState('')
  const [notes, setNotes] = useState('')
  const [style, setStyle] = useState<FashionStyle[]>([])
  const [colors, setColors] = useState<FashionColor[]>([])
  const [image, setImage] = useState<HTMLCanvasElement | null>(null)
  const [analysis, setAnalysis] = useState<ColorEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const url = normalizeURL(urlText)
  const urlWarning = urlText.trim() ? (!url ? 'El enlace no es válido.' : !isPinterestURL(url) ? 'No parece un enlace de Pinterest; se guardará igualmente.' : null) : null

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const canvas = toCanvas(await decodeImage(file), 1600)
      setImage(canvas)
      const entries = analyzeColors(canvas)
      setAnalysis(entries)
      if (!colors.length) setColors(entries.filter((e) => e.share >= 0.08).slice(0, 4).map((e) => e.color))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const save = async () => {
    const id = uuid()
    let imageFileName: string | undefined
    if (image) imageFileName = await storeCanvas(`${id}-ref.jpg`, image, 'image/jpeg')
    await db.references.put({
      id, title: title.trim() || (style[0] ? `Inspiración ${STYLES[style[0]].label.toLowerCase()}` : url ? 'Pin guardado' : `Referencia ${new Date().toLocaleDateString('es-MX')}`),
      urlString: url ?? undefined, imageFileName, colors, style: style[0], notes, isFavorite: false, linkedLookIDs: [], linkedGarmentIDs: [],
      formality: style[0] ? STYLES[style[0]].formality : 2, createdAt: new Date().toISOString(),
    })
    navigate(recreate ? `/inspiracion/${id}/recrear` : `/inspiracion/${id}`, { replace: true })
  }

  return (
    <div className="space-y-5">
      <PageHeader title={recreate ? 'Recrea este look' : 'Nueva referencia'} back="/inspiracion" />
      <div className="card space-y-3 p-4">
        <p className="text-sm font-semibold">Imagen de referencia</p>
        {image ? (
          <div className="space-y-2">
            <img src={image.toDataURL('image/jpeg', 0.85)} alt="Referencia importada" className="max-h-80 w-full rounded-2xl object-contain" />
            <Button variant="ghost" onClick={() => { setImage(null); setAnalysis([]) }}><Trash2 size={16} />Quitar imagen</Button>
          </div>
        ) : (
          <Button variant="secondary" full onClick={() => fileInput.current?.click()}><ImagePlus size={18} />Importar captura o foto</Button>
        )}
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        <p className="text-xs text-muted">La imagen se guarda solo en este dispositivo.</p>
      </div>
      <div className="card space-y-5 p-4">
        <Field label="Enlace de Pinterest (opcional)" hint="LOOKSY no descarga ni analiza el contenido de los enlaces; solo los guarda para abrirlos después.">
          <input value={urlText} onChange={(e) => setURLText(e.target.value)} placeholder="https://pin.it/… o pinterest.com/pin/…" className={inputClass} inputMode="url" autoCapitalize="off" autoCorrect="off" />
        </Field>
        {urlWarning && <p className="text-xs text-muted">{urlWarning}</p>}
        <Field label="Título"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Look de café en tonos beige" className={inputClass} /></Field>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Paleta</p>
          {analysis.length > 0 && <p className="text-xs text-muted">Detectados en la imagen: {analysis.map((e) => `${COLORS[e.color].label} ${Math.round(e.share * 100)}%`).join(', ')}. Es una aproximación de toda la imagen; ajústala.</p>}
          <ColorPicker multiple selected={colors} onChange={setColors} highlighted={analysis.map((e) => e.color)} />
        </div>
        <div><p className="mb-2 text-sm font-semibold">Estilo</p><ChipGroup single items={STYLE_LIST} selected={style} onChange={setStyle} label={(s) => STYLES[s].label} /></div>
        <Field label="Notas"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="¿Qué te gusta de este look?" /></Field>
      </div>
      {error && <Banner tone="warning">{error}</Banner>}
      <Button full disabled={!image && !url && !title.trim()} onClick={save}>{recreate ? 'Siguiente' : 'Guardar referencia'}</Button>
    </div>
  )
}
