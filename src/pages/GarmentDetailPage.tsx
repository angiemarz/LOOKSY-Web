import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Heart, Pencil, Trash2, WandSparkles, CircleCheck, Clock } from 'lucide-react'
import { db } from '@/db/db'
import { CATEGORIES, MATERIALS, OCCASIONS, PATTERNS, SEASONS, SILHOUETTES, STYLES, formalityLabel } from '@/domain/fashion'
import { COLORS } from '@/domain/color'
import type { Look } from '@/domain/models'
import { collageImageOf, deleteGarment, duplicateGarment, looksUsing, patchGarment } from '@/services/wardrobe'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, ColorDot, Confirm, IconButton, StoredImage } from '@/ui/primitives'

export function GarmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const garment = useLiveQuery(() => db.garments.get(id!), [id], null)
  const [confirm, setConfirm] = useState<Look[] | null>(null)

  if (garment === null) return null
  if (!garment) return (
    <div><PageHeader title="Prenda" back="/armario" /><Banner>Esta prenda ya no está en tu armario.</Banner></div>
  )

  const rows: [string, string][] = [
    ['Categoría', CATEGORIES[garment.category].label],
    ['Formalidad', formalityLabel(garment.formality)],
    ['Estampado', PATTERNS[garment.pattern].label],
    ...(garment.material !== 'desconocido' ? [['Material', MATERIALS[garment.material]] as [string, string]] : []),
    ...(garment.silhouette !== 'noDefinida' ? [['Silueta', SILHOUETTES[garment.silhouette]] as [string, string]] : []),
    ...(garment.styles.length ? [['Estilo', garment.styles.map((s) => STYLES[s].label).join(', ')] as [string, string]] : []),
    ...(garment.occasions.length ? [['Ocasiones', garment.occasions.map((o) => OCCASIONS[o].label).join(', ')] as [string, string]] : []),
    ['Temporada', garment.seasons.length ? garment.seasons.map((s) => SEASONS[s].label).join(', ') : 'Todo el año'],
    ...(garment.tags.length ? [['Etiquetas', garment.tags.map((t) => `#${t}`).join(' ')] as [string, string]] : []),
    ['Uso', garment.lastWornAt ? `${garment.wearCount} veces · última ${new Date(garment.lastWornAt).toLocaleDateString('es-MX')}` : 'Aún sin registrar'],
    ['Agregada', new Date(garment.createdAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })],
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={garment.name}
        back="/armario"
        actions={
          <>
            <IconButton label="Editar" onClick={() => navigate(`/armario/${garment.id}/editar`)}><Pencil size={20} /></IconButton>
            <IconButton label="Duplicar" onClick={async () => { const copy = await duplicateGarment(garment); toast('Prenda duplicada'); navigate(`/armario/${copy.id}`) }}><Copy size={20} /></IconButton>
            <IconButton label="Eliminar" onClick={async () => setConfirm(await looksUsing(garment.id))}><Trash2 size={20} /></IconButton>
          </>
        }
      />
      <div className={`grid aspect-square place-items-center overflow-hidden rounded-3xl ${garment.usesCutout ? 'bg-white' : 'bg-cream'}`}>
        <StoredImage id={collageImageOf(garment)} alt={garment.name} className="size-full p-4" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => patchGarment(garment.id, { isFavorite: !garment.isFavorite })} aria-pressed={garment.isFavorite}>
          <Heart size={18} fill={garment.isFavorite ? 'currentColor' : 'none'} />{garment.isFavorite ? 'Favorita' : 'Marcar favorita'}
        </Button>
        <Button variant="secondary" onClick={() => patchGarment(garment.id, { isAvailable: !garment.isAvailable })} aria-pressed={garment.isAvailable}>
          {garment.isAvailable ? <CircleCheck size={18} /> : <Clock size={18} />}{garment.isAvailable ? 'Disponible' : 'No disponible'}
        </Button>
      </div>
      <Button full onClick={() => navigate(`/crear?prenda=${garment.id}`)}><WandSparkles size={18} />Crear outfit con esta prenda</Button>

      <div className="card divide-y divide-line px-5">
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="text-muted">Color</span>
          <span className="flex items-center gap-2">
            <ColorDot color={garment.primaryColor} />{COLORS[garment.primaryColor].label}
            {garment.secondaryColors.map((c) => <ColorDot key={c} color={c} size={12} />)}
          </span>
        </div>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-3 text-sm">
            <span className="text-muted">{label}</span><span className="text-right">{value}</span>
          </div>
        ))}
      </div>
      {garment.notes && <div className="card p-5 text-sm"><p className="mb-1 font-semibold">Notas</p><p className="whitespace-pre-wrap text-muted">{garment.notes}</p></div>}

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="¿Eliminar esta prenda?"
        message={confirm?.length
          ? `Aparece en ${confirm.length} look(s). Los looks se conservarán y mostrarán un aviso de prenda eliminada.`
          : 'Se borrarán la prenda y sus fotos de este dispositivo. Esta acción no se puede deshacer.'}
        confirmLabel="Eliminar prenda"
        onConfirm={async () => { await deleteGarment(garment); toast('Prenda eliminada'); navigate('/armario', { replace: true }) }}
      />
    </div>
  )
}
