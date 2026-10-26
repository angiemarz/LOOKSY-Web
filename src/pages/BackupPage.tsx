import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Upload, Sparkles } from 'lucide-react'
import { db, requestPersistentStorage } from '@/db/db'
import { backupFileName, exportBackup, parseArchive, reportSummary, restoreArchive, BackupError, type BackupArchive, type ImportMode } from '@/services/backup'
import { shareOrDownload } from '@/services/collageRender'
import { deleteImages } from '@/services/images'
import { useToast } from '@/state/toast'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button, Sheet, Spinner } from '@/ui/primitives'

const formatBytes = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

export function BackupPage() {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const counts = useLiveQuery(async () => ({ garments: await db.garments.count(), looks: await db.looks.count(), images: await db.images.count() }), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<BackupArchive | null>(null)
  const [result, setResult] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  const refreshStorage = async () => {
    const estimate = await navigator.storage?.estimate?.()
    if (estimate?.usage !== undefined && estimate.quota !== undefined) setUsage({ used: estimate.usage, quota: estimate.quota })
    setPersisted((await navigator.storage?.persisted?.()) ?? null)
  }
  useEffect(() => { void refreshStorage() }, [])

  const doExport = async () => {
    setBusy('Creando respaldo…'); setError(null); setResult(null)
    try {
      const blob = await exportBackup(`web ${__APP_VERSION__}`)
      const outcome = await shareOrDownload(blob, backupFileName(), 'Respaldo de LOOKSY')
      if (outcome !== 'cancelled') toast(outcome === 'downloaded' ? 'Respaldo descargado' : 'Respaldo listo')
    } catch {
      setError('No se pudo crear el respaldo.')
    } finally { setBusy(null) }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null); setResult(null)
    try { setPending(parseArchive(await file.text())) } catch (e) { setError(e instanceof BackupError ? e.message : 'No se pudo leer el archivo de respaldo.') }
  }

  const doImport = async (mode: ImportMode) => {
    if (!pending) return
    const archive = pending
    setPending(null)
    setBusy('Restaurando…')
    try {
      const report = await restoreArchive(archive, mode)
      setResult(reportSummary(report))
      await refreshStorage()
    } catch {
      setError('No se pudo restaurar el respaldo.')
    } finally { setBusy(null) }
  }

  const cleanOrphans = async () => {
    const [garments, looks, refs, images] = await Promise.all([db.garments.toArray(), db.looks.toArray(), db.references.toArray(), db.images.toCollection().primaryKeys()])
    const used = new Set<string>()
    garments.forEach((g) => [g.imageFileName, g.cutoutFileName, g.thumbnailFileName].forEach((f) => f && used.add(f)))
    looks.forEach((l) => l.exportedImageFileName && used.add(l.exportedImageFileName))
    refs.forEach((r) => r.imageFileName && used.add(r.imageFileName))
    const orphans = (images as string[]).filter((id) => !used.has(id))
    await deleteImages(orphans)
    toast(orphans.length ? `Se eliminaron ${orphans.length} imagen(es) sin uso` : 'No había imágenes huérfanas')
    await refreshStorage()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Respaldo" back="/ajustes" />
      <Banner>El respaldo es un archivo .json con tus prendas, fotos, looks, collages, colecciones, calendario, referencias y preferencias. Guárdalo donde prefieras; LOOKSY no lo sube a ningún lado.</Banner>
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Exportar</h2>
        <Button full onClick={doExport} disabled={!!busy}><Download size={18} />Crear respaldo ({counts?.garments ?? 0} prendas, {counts?.looks ?? 0} looks)</Button>
      </section>
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Restaurar</h2>
        <Button variant="secondary" full onClick={() => input.current?.click()} disabled={!!busy}><Upload size={18} />Restaurar desde archivo</Button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        <p className="text-xs text-muted">Se verifica la integridad de cada foto (SHA-256). Los registros con IDs repetidos se omiten. Compatible con respaldos de LOOKSY para iOS (formato v1).</p>
      </section>
      {busy && <Spinner label={busy} />}
      {result && <div className="card space-y-1 p-4 text-sm"><p className="font-semibold">Restauración completada</p>{result.map((l) => <p key={l} className="text-muted">{l}</p>)}</div>}
      {error && <Banner tone="warning">{error}</Banner>}

      <section className="card space-y-3 p-4 text-sm">
        <h2 className="font-semibold">Almacenamiento</h2>
        <p className="text-muted">{counts?.images ?? 0} imágenes guardadas{usage ? ` · ${formatBytes(usage.used)} usados de ${formatBytes(usage.quota)} disponibles para el sitio` : ''}.</p>
        <p className="text-muted">
          {persisted ? 'El navegador marcó los datos de LOOKSY como persistentes.' : 'El navegador puede borrar datos de sitios poco usados si falta espacio. Instala LOOKSY en tu pantalla de inicio y haz respaldos periódicos.'}
        </p>
        {!persisted && <Button variant="secondary" onClick={async () => { setPersisted(await requestPersistentStorage()) }}><Sparkles size={16} />Pedir almacenamiento persistente</Button>}
        <Button variant="ghost" onClick={cleanOrphans}>Limpiar imágenes huérfanas</Button>
      </section>

      <Sheet open={!!pending} onClose={() => setPending(null)} title="¿Cómo quieres restaurar?">
        <p className="text-sm text-muted">Combinar conserva tus datos actuales y añade lo nuevo. Reemplazar borra lo actual de este dispositivo y restaura el respaldo.</p>
        {pending && <p className="mt-2 text-xs text-muted">Respaldo del {pending.createdAt ? new Date(pending.createdAt).toLocaleString('es-MX') : '—'} · {pending.garments.length} prendas · {pending.looks.length} looks · {pending.files.length} fotos</p>}
        <div className="mt-5 flex flex-col gap-2">
          <Button full onClick={() => doImport('merge')}>Combinar con mis datos</Button>
          <Button variant="danger" full onClick={() => doImport('replace')}>Reemplazar todo</Button>
          <Button variant="ghost" full onClick={() => setPending(null)}>Cancelar</Button>
        </div>
      </Sheet>
    </div>
  )
}
