import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, FolderMinus } from 'lucide-react'
import { db } from '@/db/db'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, EmptyState, IconButton, Sheet, inputClass } from '@/ui/primitives'
import { LookCard } from '@/ui/cards'
import { LookPicker } from './LooksPage'

export function CollectionPage() {
  const { id } = useParams()
  const collection = useLiveQuery(() => db.collections.get(id!), [id], null)
  const looks = useLiveQuery(() => db.looks.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [picking, setPicking] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  if (collection === null) return null
  if (!collection) return <div><PageHeader title="Colección" back="/looks?tab=colecciones" /><Banner>Esta colección ya no existe.</Banner></div>
  const members = looks.filter((l) => collection.lookIDs.includes(l.id))
  return (
    <div className="space-y-4">
      <PageHeader title={collection.name} back="/looks?tab=colecciones" actions={
        <>
          <IconButton label="Renombrar" onClick={() => { setName(collection.name); setRenaming(true) }}><Pencil size={20} /></IconButton>
          <IconButton label="Añadir looks" onClick={() => setPicking(true)}><Plus size={22} /></IconButton>
        </>
      } />
      {members.length === 0 ? (
        <EmptyState icon={<Plus size={30} />} title="Colección vacía" message="Añade looks guardados a esta colección." action={<Button onClick={() => setPicking(true)}>Añadir looks</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {members.map((l) => (
            <div key={l.id} className="relative">
              <LookCard look={l} />
              <IconButton label={`Quitar ${l.name} de la colección`} className="absolute left-2 top-2 size-9 bg-surface/80 backdrop-blur" onClick={() => db.collections.put({ ...collection, lookIDs: collection.lookIDs.filter((x) => x !== l.id) })}><FolderMinus size={16} /></IconButton>
            </div>
          ))}
        </div>
      )}
      <LookPicker open={picking} onClose={() => setPicking(false)} looks={looks.filter((l) => !collection.lookIDs.includes(l.id))} title={`Añadir a ${collection.name}`} onPick={(l) => db.collections.put({ ...collection, lookIDs: [...collection.lookIDs, l.id] })} />
      <Sheet open={renaming} onClose={() => setRenaming(false)} title="Renombrar colección">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-label="Nombre" />
        <Button full className="mt-4" disabled={!name.trim()} onClick={async () => { await db.collections.update(collection.id, { name: name.trim() }); setRenaming(false) }}>Guardar</Button>
      </Sheet>
    </div>
  )
}
