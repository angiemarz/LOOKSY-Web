import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { CATEGORIES, type OutfitSlot } from '@/domain/fashion'
import type { Garment } from '@/domain/models'
import { normalize } from '@/domain/normalize'
import { GarmentCard } from './cards'
import { EmptyState, Sheet, inputClass } from './primitives'
import { Shirt } from 'lucide-react'

export function GarmentPicker({ open, onClose, onPick, exclude = [], slot, title = 'Elegir prenda', options }: {
  open: boolean; onClose: () => void; onPick: (g: Garment) => void; exclude?: string[]; slot?: OutfitSlot; title?: string; options?: Garment[]
}) {
  const all = useLiveQuery(() => db.garments.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [search, setSearch] = useState('')
  const source = options ?? all
  const visible = source.filter((g) => !exclude.includes(g.id) && (!slot || CATEGORIES[g.category].slot === slot) && (!search || normalize(g.name).includes(normalize(search))))
  return (
    <Sheet open={open} onClose={onClose} title={title} wide>
      {!options && <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar prenda" className={`${inputClass} mb-4`} type="search" />}
      {options && <p className="mb-3 text-sm text-muted">Ordenadas de mejor a menor compatibilidad con el resto del look.</p>}
      {visible.length === 0 ? (
        <EmptyState icon={<Shirt size={30} />} title="Sin prendas" message="No hay prendas disponibles para elegir." />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {visible.map((g) => (
            <button key={g.id} type="button" onClick={() => { onPick(g); onClose() }} className="text-left">
              <GarmentCard garment={g} />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
