import { useLiveQuery } from 'dexie-react-hooks'
import { db, savePreferences } from '@/db/db'
import { defaultPreferences, type UserPreferences } from '@/domain/models'

export function usePreferences(): [UserPreferences, (next: UserPreferences) => void] {
  const row = useLiveQuery(() => db.settings.get('preferences'), [])
  const prefs = { ...defaultPreferences(), ...((row?.value as UserPreferences | undefined) ?? {}) }
  return [prefs, (next) => void savePreferences(next)]
}
