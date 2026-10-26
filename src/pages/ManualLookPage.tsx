import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CircleCheck, Circle } from 'lucide-react'
import { db } from '@/db/db'
import { emptyRequest } from '@/domain/request'
import { ScoringContext, suggestionName } from '@/domain/recommend'
import { defaultPreferences, type Garment } from '@/domain/models'
import { garmentIDsIn } from '@/domain/collage'
import { automaticComposition, loadPieces, type CollagePiece } from '@/services/collageRender'
import { saveLook } from '@/services/looks'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Button, inputClass } from '@/ui/primitives'
import { GarmentCard } from '@/ui/cards'
import { CollageEditor } from '@/ui/CollageEditor'

export function ManualLookPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const garments = useLiveQuery(() => db.garments.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState('')
  const [pieces, setPieces] = useState<CollagePiece[] | null>(null)
  const chosen = selected.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)
  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo look" back="/looks" subtitle="Elige prendas y acomoda el collage." />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del look (opcional)" className={inputClass} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {garments.map((g) => {
          const on = selected.includes(g.id)
          return (
            <button key={g.id} type="button" aria-pressed={on} className="relative text-left" onClick={() => setSelected(on ? selected.filter((x) => x !== g.id) : [...selected, g.id])}>
              <GarmentCard garment={g} />
              <span className={`absolute left-2 top-2 rounded-full bg-surface ${on ? 'text-accent' : 'text-muted'}`}>{on ? <CircleCheck size={22} /> : <Circle size={22} />}</span>
            </button>
          )
        })}
      </div>
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-4">
        <Button full disabled={!chosen.length} onClick={async () => setPieces(await loadPieces(chosen))}>Crear collage ({chosen.length})</Button>
      </div>
      {pieces && (
        <CollageEditor
          initial={automaticComposition(pieces)}
          pieces={pieces}
          title={name || 'Nuevo look'}
          saveLabel="Guardar look"
          onClose={() => setPieces(null)}
          onSave={async (composition, finalPieces) => {
            const items = finalPieces.map((p) => p.garment).filter((g) => garmentIDsIn(composition).includes(g.id))
            const style = new ScoringContext(emptyRequest(), defaultPreferences()).dominantStyle(items)
            const look = await saveLook({ name: name.trim() || suggestionName(items, style), garmentIDs: garmentIDsIn(composition), composition, style })
            toast('Look guardado')
            navigate(`/looks/${look.id}`, { replace: true })
          }}
        />
      )}
    </div>
  )
}
