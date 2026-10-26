// @vitest-environment node
import 'fake-indexeddb/auto'
import { LooksyDB } from '@/db/db'
import { makeArchive, parseArchive, restoreArchive, exportBackup, imageMimeType, isSafeFileName, BACKUP_VERSION } from '@/services/backup'
import { newGarment } from '@/domain/models'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])
const G1 = '11111111-1111-4111-8111-111111111111'
const L1 = '22222222-2222-4222-8222-222222222222'

let n = 0
const freshDB = () => new LooksyDB(`test-${++n}-${Math.random()}`)

async function populate(database: LooksyDB) {
  await database.images.put({ id: `${G1}-orig.png`, blob: new Blob([PNG], { type: 'image/png' }), width: 1, height: 1 })
  await database.garments.put(newGarment({ id: G1, name: 'Blusa rosa', category: 'blusas', primaryColor: 'rosa', imageFileName: `${G1}-orig.png`, createdAt: '2026-10-26T10:00:00.123Z' }))
  await database.looks.put({ id: L1, name: 'Café', garmentIDs: [G1], tags: [], notes: '', explanation: '', pinterestURLs: [], referenceIDs: [], isFavorite: true, createdAt: '2026-10-26T10:00:00.000Z', updatedAt: '2026-10-26T10:00:00.000Z',
    composition: { version: 1, aspect: 'portrait', backgroundHex: '#F5EFE8', cardStyleForPhotos: true, items: [{ id: '33333333-3333-4333-8333-333333333333', garmentID: G1, centerX: 0.5, centerY: 0.3, width: 0.4, rotation: 0, zIndex: 0 }] } })
  await database.collections.put({ id: '44444444-4444-4444-8444-444444444444', name: 'Favoritos', lookIDs: [L1], createdAt: '2026-10-26T10:00:00.000Z' })
  await database.plans.put({ id: '55555555-5555-4555-8555-555555555555', day: '2026-10-27', lookID: L1, note: '', markedAsWorn: false })
  await database.references.put({ id: '66666666-6666-4666-8666-666666666666', title: 'Pin', urlString: 'https://pin.it/abc', colors: ['rosa'], notes: '', isFavorite: false, linkedLookIDs: [], linkedGarmentIDs: [], formality: 2, createdAt: '2026-10-26T10:00:00.000Z' })
  await database.settings.put({ key: 'preferences', value: { ...((await import('@/domain/models')).defaultPreferences()), displayName: 'Angie' } })
}

describe('backup', () => {
  it('exports iOS-compatible dates and restores everything (replace)', async () => {
    const source = freshDB()
    await populate(source)
    const archive = await makeArchive('test', source)
    expect(archive.format).toBe('LOOKSY-backup')
    expect(archive.formatVersion).toBe(BACKUP_VERSION)
    expect(archive.garments[0]!.createdAt).toBe('2026-10-26T10:00:00Z')
    expect(archive.plans[0]!.day).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(archive.files).toHaveLength(1)

    const blob = await exportBackup('test', source)
    const target = freshDB()
    const report = await restoreArchive(parseArchive(await blob.text()), 'replace', target)
    expect(report).toMatchObject({ garmentsAdded: 1, looksAdded: 1, collectionsAdded: 1, plansAdded: 1, referencesAdded: 1, filesRestored: 1, invalidFiles: 0, missingFiles: 0 })
    expect((await target.garments.get(G1))!.imageFileName).toBe(`${G1}-orig.png`)
    expect((await target.plans.toArray())[0]!.day).toBe('2026-10-27')
    expect((await target.looks.get(L1))!.composition!.items[0]!.garmentID).toBe(G1)
    expect(((await target.settings.get('preferences'))!.value as { displayName: string }).displayName).toBe('Angie')
  })

  it('merge skips duplicate IDs', async () => {
    const database = freshDB()
    await populate(database)
    const report = await restoreArchive(await makeArchive('t', database), 'merge', database)
    expect(report.garmentsAdded).toBe(0)
    expect(report.duplicatesSkipped).toBe(5)
    expect(await database.garments.count()).toBe(1)
  })

  it('rejects tampered images and drops their references', async () => {
    const source = freshDB()
    await populate(source)
    const archive = await makeArchive('t', source)
    archive.files[0]!.data = btoa('tampered')
    const target = freshDB()
    const report = await restoreArchive(archive, 'replace', target)
    expect(report.invalidFiles).toBe(1)
    expect(report.missingFiles).toBe(1)
    expect((await target.garments.get(G1))!.imageFileName).toBeUndefined()
  })

  it('rejects newer formats and garbage', () => {
    expect(() => parseArchive(JSON.stringify({ format: 'LOOKSY-backup', formatVersion: 99, garments: [], files: [] }))).toThrow(/más nueva/)
    expect(() => parseArchive('{}')).toThrow()
    expect(() => parseArchive('no json')).toThrow()
  })

  it('validates file names and image signatures', () => {
    expect(isSafeFileName('../evil.png')).toBe(false)
    expect(isSafeFileName('.hidden')).toBe(false)
    expect(isSafeFileName('ABC-thumb-1.jpg')).toBe(true)
    expect(imageMimeType(PNG)).toBe('image/png')
    expect(imageMimeType(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeNull()
  })
})
