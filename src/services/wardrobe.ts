import { db, type LooksyDB } from '@/db/db'
import { newGarment, type Garment, type Look } from '@/domain/models'
import { uuid } from '@/domain/normalize'
import { clampFormality } from '@/domain/fashion'
import { deleteImages, storeCutout, storePhotoSet, storeThumbnail } from './images'

export type GarmentDraft = Omit<Garment, 'id' | 'imageFileName' | 'cutoutFileName' | 'thumbnailFileName' | 'usesCutout' | 'createdAt' | 'updatedAt' | 'wearCount' | 'lastWornAt'>

const now = () => new Date().toISOString()

function clean(draft: GarmentDraft): GarmentDraft {
  return {
    ...draft,
    name: draft.name.trim() || draft.category,
    secondaryColors: draft.secondaryColors.filter((c) => c !== draft.primaryColor),
    formality: clampFormality(draft.formality),
    tags: [...new Set(draft.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
  }
}

/** Creates a garment and stores its photos. */
export async function createGarment(draft: GarmentDraft, photo: HTMLCanvasElement | null, cutout: HTMLCanvasElement | null, useCutout: boolean, database: LooksyDB = db): Promise<Garment> {
  const id = uuid()
  const garment = newGarment({ id, ...clean(draft) })
  if (photo) {
    const files = await storePhotoSet(id, photo, database)
    garment.imageFileName = files.original
    garment.thumbnailFileName = files.thumbnail
  }
  if (cutout) {
    garment.cutoutFileName = await storeCutout(id, cutout, database)
    if (useCutout) {
      await deleteImages([garment.thumbnailFileName], database)
      garment.thumbnailFileName = await storeThumbnail(id, cutout, database)
      garment.usesCutout = true
    }
  }
  await database.garments.put(garment)
  return garment
}

/**
 * Updates attributes and optionally replaces photos.
 * `display` is the image currently shown (cutout or photo); it regenerates the thumbnail when images change.
 */
export async function updateGarment(
  garment: Garment,
  draft: GarmentDraft,
  changes: { photo?: HTMLCanvasElement; cutout?: HTMLCanvasElement | null; useCutout: boolean; display?: HTMLCanvasElement | null },
  database: LooksyDB = db,
): Promise<Garment> {
  const updated: Garment = { ...garment, ...clean(draft), updatedAt: now() }
  const obsolete: (string | undefined)[] = []
  if (changes.photo) {
    const files = await storePhotoSet(garment.id, changes.photo, database)
    obsolete.push(garment.imageFileName, garment.thumbnailFileName)
    updated.imageFileName = files.original
    updated.thumbnailFileName = files.thumbnail
  }
  if (changes.cutout !== undefined) {
    obsolete.push(garment.cutoutFileName)
    updated.cutoutFileName = changes.cutout ? await storeCutout(garment.id, changes.cutout, database) : undefined
  }
  updated.usesCutout = changes.useCutout && !!updated.cutoutFileName
  const imagesChanged = !!changes.photo || changes.cutout !== undefined || updated.usesCutout !== garment.usesCutout
  if (imagesChanged && changes.display) {
    obsolete.push(updated.thumbnailFileName)
    updated.thumbnailFileName = await storeThumbnail(garment.id, changes.display, database)
  }
  await database.garments.put(updated)
  const keep = new Set([updated.imageFileName, updated.cutoutFileName, updated.thumbnailFileName])
  await deleteImages(obsolete.filter((id) => id && !keep.has(id)), database)
  return updated
}

export const collageImageOf = (g: Garment): string | undefined => (g.usesCutout && g.cutoutFileName ? g.cutoutFileName : g.imageFileName)

export async function looksUsing(garmentID: string, database: LooksyDB = db): Promise<Look[]> {
  return (await database.looks.toArray()).filter((l) => l.garmentIDs.includes(garmentID))
}

/** Deletes the garment and its photos. Looks keep the dangling ID to show a warning. */
export async function deleteGarment(garment: Garment, database: LooksyDB = db): Promise<void> {
  await database.transaction('rw', database.garments, database.images, database.settings, async () => {
    await database.garments.delete(garment.id)
    await deleteImages([garment.imageFileName, garment.cutoutFileName, garment.thumbnailFileName], database)
    const prefs = await database.settings.get('preferences')
    const value = prefs?.value as { favoriteGarmentIDs?: string[] } | undefined
    if (value?.favoriteGarmentIDs?.includes(garment.id)) {
      await database.settings.put({ key: 'preferences', value: { ...value, favoriteGarmentIDs: value.favoriteGarmentIDs.filter((x) => x !== garment.id) } })
    }
  })
}

export async function duplicateGarment(garment: Garment, database: LooksyDB = db): Promise<Garment> {
  const id = uuid()
  const copyImage = async (src: string | undefined, suffix: string) => {
    if (!src) return undefined
    const rec = await database.images.get(src)
    if (!rec) return undefined
    const ext = src.split('.').pop() ?? 'jpg'
    const newID = `${id}-${suffix}.${ext}`
    await database.images.put({ ...rec, id: newID })
    return newID
  }
  const copy: Garment = {
    ...garment, id, name: `${garment.name} (copia)`, wearCount: 0, lastWornAt: undefined, createdAt: now(), updatedAt: now(),
    imageFileName: await copyImage(garment.imageFileName, 'orig'),
    cutoutFileName: await copyImage(garment.cutoutFileName, 'cutout'),
    thumbnailFileName: await copyImage(garment.thumbnailFileName, 'thumb'),
  }
  await database.garments.put(copy)
  return copy
}

export async function patchGarment(id: string, changes: Partial<Garment>, database: LooksyDB = db): Promise<void> {
  await database.garments.update(id, { ...changes, updatedAt: now() })
}

/** Registers that garments were worn (feeds "prendas poco usadas"). */
export async function markWorn(ids: string[], date = new Date(), database: LooksyDB = db): Promise<void> {
  await database.transaction('rw', database.garments, async () => {
    for (const id of ids) {
      const g = await database.garments.get(id)
      if (g) await database.garments.put({ ...g, wearCount: g.wearCount + 1, lastWornAt: date.toISOString() })
    }
  })
}
