import Dexie, { type Table } from 'dexie'
import type { Garment, InspirationReference, Look, LookCollection, PlannedOutfit, StoredImage, UserPreferences } from '@/domain/models'

export interface SettingRow { key: string; value: unknown }

/** Local-first database (IndexedDB). Nothing here leaves the device unless the user exports a backup. */
export class LooksyDB extends Dexie {
  garments!: Table<Garment, string>
  looks!: Table<Look, string>
  collections!: Table<LookCollection, string>
  plans!: Table<PlannedOutfit, string>
  references!: Table<InspirationReference, string>
  images!: Table<StoredImage, string>
  settings!: Table<SettingRow, string>

  constructor(name = 'looksy') {
    super(name)
    this.version(1).stores({
      garments: 'id, category, createdAt',
      looks: 'id, createdAt',
      collections: 'id, createdAt',
      plans: 'id, day, lookID',
      references: 'id, createdAt',
      images: 'id',
      settings: 'key',
    })
  }
}

export const db = new LooksyDB()

export async function getPreferences(database: LooksyDB = db): Promise<UserPreferences | undefined> {
  return (await database.settings.get('preferences'))?.value as UserPreferences | undefined
}

export async function savePreferences(prefs: UserPreferences, database: LooksyDB = db): Promise<void> {
  await database.settings.put({ key: 'preferences', value: prefs })
}

/** Asks the browser not to evict LOOKSY data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
