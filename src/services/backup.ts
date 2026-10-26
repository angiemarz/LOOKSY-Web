import { db, type LooksyDB } from '@/db/db'
import { defaultPreferences, type Garment, type InspirationReference, type Look, type LookCollection, type PlannedOutfit, type UserPreferences } from '@/domain/models'

/**
 * Portable backup: one JSON file with every record and the photos in base64
 * with a SHA-256 checksum. Field names follow the iOS app's `BackupArchive`
 * (format "LOOKSY-backup", version 1) so files can move between both apps.
 */
export const BACKUP_FORMAT = 'LOOKSY-backup'
export const BACKUP_VERSION = 1

export interface BackupFile { name: string; sha256: string; data: string }

export interface BackupPlanRecord { id: string; day: string; lookID: string; note: string; markedAsWorn: boolean }

export interface BackupArchive {
  format: string
  formatVersion: number
  createdAt: string
  appVersion: string
  garments: Garment[]
  looks: Look[]
  collections: LookCollection[]
  plans: BackupPlanRecord[]
  references: InspirationReference[]
  preferences: UserPreferences
  files: BackupFile[]
}

export interface ImportReport {
  garmentsAdded: number
  looksAdded: number
  collectionsAdded: number
  plansAdded: number
  referencesAdded: number
  duplicatesSkipped: number
  filesRestored: number
  invalidFiles: number
  missingFiles: number
}

export class BackupError extends Error {}

/** ISO-8601 without fractional seconds (what the iOS decoder expects). */
export const isoSeconds = (iso: string | undefined): string | undefined =>
  iso ? new Date(iso).toISOString().replace(/\.\d{3}Z$/, 'Z') : undefined

const dayToISO = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return isoSeconds(new Date(y!, m! - 1, d!).toISOString())!
}
const isoToDay = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/** Recognizes JPEG, PNG, WebP, GIF and HEIC by their signature. */
export function imageMimeType(bytes: Uint8Array): string | null {
  const b = bytes
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'image/heic'
  return null
}

export const isSafeFileName = (name: string) =>
  name.length > 0 && name.length < 200 && !name.includes('/') && !name.includes('\\') && !name.startsWith('.')

const blobBytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())

export async function makeArchive(appVersion: string, database: LooksyDB = db): Promise<BackupArchive> {
  const [garments, looks, collections, plans, references, images, prefRow] = await Promise.all([
    database.garments.toArray(), database.looks.toArray(), database.collections.toArray(), database.plans.toArray(),
    database.references.toArray(), database.images.toArray(), database.settings.get('preferences'),
  ])
  const referenced = new Set<string>()
  garments.forEach((g) => [g.imageFileName, g.cutoutFileName, g.thumbnailFileName].forEach((f) => f && referenced.add(f)))
  looks.forEach((l) => l.exportedImageFileName && referenced.add(l.exportedImageFileName))
  references.forEach((r) => r.imageFileName && referenced.add(r.imageFileName))

  const files: BackupFile[] = []
  for (const image of images.filter((i) => referenced.has(i.id)).sort((a, b) => a.id.localeCompare(b.id))) {
    const bytes = await blobBytes(image.blob)
    files.push({ name: image.id, sha256: await sha256Hex(bytes), data: bytesToBase64(bytes) })
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    createdAt: isoSeconds(new Date().toISOString())!,
    appVersion,
    garments: garments.map((g) => ({ ...g, createdAt: isoSeconds(g.createdAt)!, updatedAt: isoSeconds(g.updatedAt)!, lastWornAt: isoSeconds(g.lastWornAt) })),
    looks: looks.map((l) => ({ ...l, createdAt: isoSeconds(l.createdAt)!, updatedAt: isoSeconds(l.updatedAt)!, lastWornAt: isoSeconds(l.lastWornAt) })),
    collections: collections.map((c) => ({ ...c, createdAt: isoSeconds(c.createdAt)! })),
    plans: plans.map((p) => ({ ...p, day: dayToISO(p.day) })),
    references: references.map((r) => ({ ...r, createdAt: isoSeconds(r.createdAt)! })),
    preferences: (prefRow?.value as UserPreferences | undefined) ?? defaultPreferences(),
    files,
  }
}

export async function exportBackup(appVersion: string, database: LooksyDB = db): Promise<Blob> {
  const archive = await makeArchive(appVersion, database)
  return new Blob([JSON.stringify(archive)], { type: 'application/json' })
}

export function backupFileName(date = new Date()): string {
  return `LOOKSY-respaldo-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`
}

export function parseArchive(text: string): BackupArchive {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new BackupError('El archivo no es un respaldo válido de LOOKSY.')
  }
  const a = value as Partial<BackupArchive>
  if (!a || a.format !== BACKUP_FORMAT || typeof a.formatVersion !== 'number' || !Array.isArray(a.garments) || !Array.isArray(a.files))
    throw new BackupError('El archivo no es un respaldo válido de LOOKSY.')
  if (a.formatVersion > BACKUP_VERSION)
    throw new BackupError(`Este respaldo se creó con una versión más nueva de LOOKSY (formato ${a.formatVersion}). Actualiza la app para restaurarlo.`)
  return {
    format: a.format, formatVersion: a.formatVersion, createdAt: a.createdAt ?? '', appVersion: a.appVersion ?? '',
    garments: a.garments, looks: a.looks ?? [], collections: a.collections ?? [], plans: a.plans ?? [],
    references: a.references ?? [], preferences: { ...defaultPreferences(), ...(a.preferences ?? {}) }, files: a.files,
  }
}

export type ImportMode = 'merge' | 'replace'

export async function deleteEverything(database: LooksyDB = db): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((t) => t.clear()))
  })
}

/** Restores a backup. Merge keeps current data and skips repeated IDs; replace wipes first. */
export async function restoreArchive(archive: BackupArchive, mode: ImportMode, database: LooksyDB = db): Promise<ImportReport> {
  const report: ImportReport = { garmentsAdded: 0, looksAdded: 0, collectionsAdded: 0, plansAdded: 0, referencesAdded: 0, duplicatesSkipped: 0, filesRestored: 0, invalidFiles: 0, missingFiles: 0 }
  if (mode === 'replace') await deleteEverything(database)

  // Verify every file before touching the database.
  const validFiles: { name: string; bytes: Uint8Array; type: string }[] = []
  for (const file of archive.files) {
    try {
      if (!isSafeFileName(file.name)) throw new Error()
      const bytes = base64ToBytes(file.data)
      const type = imageMimeType(bytes)
      if (!type || (await sha256Hex(bytes)) !== file.sha256) throw new Error()
      validFiles.push({ name: file.name, bytes, type })
    } catch {
      report.invalidFiles++
    }
  }

  await database.transaction('rw', database.tables, async () => {
    const prefRow = await database.settings.get('preferences')
    if (mode === 'replace' || !prefRow) await database.settings.put({ key: 'preferences', value: archive.preferences })

    const available = new Set((await database.images.toCollection().primaryKeys()) as string[])
    for (const f of validFiles) {
      if (available.has(f.name)) continue
      await database.images.put({ id: f.name, blob: new Blob([f.bytes as BlobPart], { type: f.type }), width: 0, height: 0 })
      available.add(f.name)
      report.filesRestored++
    }
    const checked = (name: string | undefined | null) => {
      if (!name) return undefined
      if (available.has(name)) return name
      report.missingFiles++
      return undefined
    }

    const existing = async (table: { toCollection(): { primaryKeys(): Promise<unknown[]> } }) => new Set((await table.toCollection().primaryKeys()) as string[])
    const insert = async <T extends { id: string }>(
      records: T[], table: { put(item: T): Promise<unknown>; toCollection(): { primaryKeys(): Promise<unknown[]> } },
      map: (record: T) => T, count: (n: number) => void,
    ) => {
      const ids = await existing(table)
      let added = 0
      for (const record of records) {
        if (!record?.id || ids.has(record.id)) { report.duplicatesSkipped++; continue }
        ids.add(record.id)
        await table.put(map(record))
        added++
      }
      count(added)
    }

    await insert(archive.garments, database.garments, (g) => {
      const imageFileName = checked(g.imageFileName), cutoutFileName = checked(g.cutoutFileName), thumbnailFileName = checked(g.thumbnailFileName)
      return {
        ...g, imageFileName, cutoutFileName, thumbnailFileName, usesCutout: !!g.usesCutout && !!cutoutFileName,
        secondaryColors: g.secondaryColors ?? [], styles: g.styles ?? [], seasons: g.seasons ?? [], occasions: g.occasions ?? [],
        tags: g.tags ?? [], notes: g.notes ?? '', formality: Math.min(5, Math.max(1, g.formality ?? 2)), wearCount: Math.max(0, g.wearCount ?? 0),
        lastWornAt: g.lastWornAt ?? undefined, detectedColorHex: g.detectedColorHex ?? undefined,
      }
    }, (n) => (report.garmentsAdded = n))
    await insert(archive.looks, database.looks, (l) => ({
      ...l, exportedImageFileName: checked(l.exportedImageFileName), tags: l.tags ?? [], notes: l.notes ?? '', explanation: l.explanation ?? '',
      pinterestURLs: l.pinterestURLs ?? [], referenceIDs: l.referenceIDs ?? [], style: l.style ?? undefined, occasion: l.occasion ?? undefined,
      composition: l.composition ?? undefined, lastWornAt: l.lastWornAt ?? undefined,
    }), (n) => (report.looksAdded = n))
    await insert(archive.collections, database.collections, (c) => c, (n) => (report.collectionsAdded = n))
    await insert(archive.plans as unknown as PlannedOutfit[], database.plans, (p) => ({ ...p, day: isoToDay(p.day), note: p.note ?? '' }), (n) => (report.plansAdded = n))
    await insert(archive.references, database.references, (r) => ({
      ...r, imageFileName: checked(r.imageFileName), colors: r.colors ?? [], notes: r.notes ?? '', linkedLookIDs: r.linkedLookIDs ?? [],
      linkedGarmentIDs: r.linkedGarmentIDs ?? [], formality: r.formality ?? 2, style: r.style ?? undefined, target: r.target ?? undefined,
      urlString: r.urlString ?? undefined, searchQuery: r.searchQuery ?? undefined,
    }), (n) => (report.referencesAdded = n))
  })
  return report
}

export function reportSummary(r: ImportReport): string[] {
  const lines = [`Prendas: ${r.garmentsAdded}`, `Looks: ${r.looksAdded}`, `Colecciones: ${r.collectionsAdded}`, `Planificaciones: ${r.plansAdded}`, `Referencias: ${r.referencesAdded}`, `Fotos restauradas: ${r.filesRestored}`]
  if (r.duplicatesSkipped) lines.push(`Registros duplicados omitidos: ${r.duplicatesSkipped}`)
  if (r.invalidFiles) lines.push(`Archivos dañados descartados: ${r.invalidFiles}`)
  if (r.missingFiles) lines.push(`Fotos faltantes en el respaldo: ${r.missingFiles}`)
  return lines
}
