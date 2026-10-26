import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus } from 'lucide-react'
import { PageHeader } from '@/ui/Layout'
import { Banner, Button } from '@/ui/primitives'

interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallPage() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPromptEvent(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  return (
    <div className="space-y-5">
      <PageHeader title="Instalar LOOKSY" back="/ajustes" />
      {standalone && <Banner tone="success">LOOKSY ya está instalada en este dispositivo.</Banner>}
      {promptEvent && <Button full onClick={async () => { await promptEvent.prompt(); setPromptEvent(null) }}><Download size={18} />Instalar ahora</Button>}
      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-semibold">iPhone y iPad (Safari)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Abre LOOKSY en <strong>Safari</strong>.</li>
          <li>Toca <Share size={14} className="inline" aria-label="Compartir" /> <strong>Compartir</strong>.</li>
          <li>Elige <SquarePlus size={14} className="inline" aria-hidden /> <strong>Agregar a pantalla de inicio</strong> y confirma.</li>
        </ol>
        <p className="text-xs text-muted">Importante en iPhone: abre LOOKSY desde el ícono instalado. Safari puede borrar los datos de sitios web que no visitas en varios días, pero respeta los de las apps agregadas a la pantalla de inicio. Aun así, crea respaldos.</p>
      </section>
      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-semibold">Android (Chrome)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Abre LOOKSY en Chrome.</li>
          <li>Toca el aviso <strong>Instalar app</strong> o el menú ⋮ → <strong>Instalar aplicación</strong>.</li>
        </ol>
      </section>
      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-semibold">Windows (Chrome o Edge)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Abre LOOKSY en Chrome o Edge.</li>
          <li>Haz clic en el ícono de instalar en la barra de direcciones (o menú → <strong>Instalar LOOKSY</strong>).</li>
        </ol>
        <p className="text-xs text-muted">Cada dispositivo guarda sus propios datos. Para pasar tu armario de un dispositivo a otro usa Ajustes → Respaldo.</p>
      </section>
    </div>
  )
}
