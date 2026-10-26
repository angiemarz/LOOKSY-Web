import { db, type LooksyDB } from '@/db/db'
import type { CollageComposition } from '@/domain/collage'
import { garmentIDsIn } from '@/domain/collage'
import type { FashionStyle, Occasion } from '@/domain/fashion'
import type { Look } from '@/domain/models'
import { uuid } from '@/domain/normalize'

const now = () => new Date().toISOString()

export interface NewLook {
  name: string
  garmentIDs: string[]
  composition: CollageComposition
  style?: FashionStyle
  occasion?: Occasion
  explanation?: string
  pinterestURLs?: string[]
  referenceIDs?: string[]
}

export async function saveLook(input: NewLook, database: LooksyDB = db): Promise<Look> {
  const look: Look = {
    id: uuid(), name: input.name.trim() || 'Mi look', garmentIDs: [...new Set(input.garmentIDs)], composition: input.composition,
    style: input.style, occasion: input.occasion, tags: [], notes: '', explanation: input.explanation ?? '',
    pinterestURLs: input.pinterestURLs ?? [], referenceIDs: input.referenceIDs ?? [], isFavorite: false,
    createdAt: now(), updatedAt: now(),
  }
  await database.looks.put(look)
  return look
}

/** Applies an edited collage; the garment list follows the canvas (deleted garments keep their item). */
export async function updateComposition(look: Look, composition: CollageComposition, database: LooksyDB = db): Promise<void> {
  await database.looks.put({ ...look, composition, garmentIDs: [...new Set(garmentIDsIn(composition))], updatedAt: now() })
}

export async function patchLook(id: string, changes: Partial<Look>, database: LooksyDB = db): Promise<void> {
  await database.looks.update(id, { ...changes, updatedAt: now() })
}

export async function duplicateLook(look: Look, database: LooksyDB = db): Promise<Look> {
  const copy: Look = { ...look, id: uuid(), name: `${look.name} (copia)`, isFavorite: false, lastWornAt: undefined, createdAt: now(), updatedAt: now() }
  await database.looks.put(copy)
  return copy
}

/** Deletes the look and its plans; removes it from collections and references. */
export async function deleteLook(look: Look, database: LooksyDB = db): Promise<void> {
  await database.transaction('rw', [database.looks, database.plans, database.collections, database.references], async () => {
    await database.looks.delete(look.id)
    await database.plans.where('lookID').equals(look.id).delete()
    for (const c of await database.collections.toArray())
      if (c.lookIDs.includes(look.id)) await database.collections.put({ ...c, lookIDs: c.lookIDs.filter((x) => x !== look.id) })
    for (const r of await database.references.toArray())
      if (r.linkedLookIDs.includes(look.id)) await database.references.put({ ...r, linkedLookIDs: r.linkedLookIDs.filter((x) => x !== look.id) })
  })
}

export function localDay(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Monday-first week containing `date`, shifted by `offset` weeks. */
export function weekDays(date: Date, offset = 0): Date[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset * 7)
  const weekday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - weekday)
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

export async function planLook(lookID: string, day: string, database: LooksyDB = db): Promise<void> {
  await database.plans.put({ id: uuid(), day, lookID, note: '', markedAsWorn: false })
}
