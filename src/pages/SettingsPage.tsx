import { Link } from 'react-router-dom'
import { ChevronRight, Download, HeartHandshake, HardDrive, Lock, Smartphone } from 'lucide-react'
import { usePreferences } from '@/state/preferences'
import { PageHeader } from '@/ui/Layout'
import { inputClass } from '@/ui/primitives'

const VERSION = __APP_VERSION__

export function SettingsPage() {
  const [prefs, setPrefs] = usePreferences()
  const links = [
    ['/ajustes/preferencias', 'Preferencias de estilo', HeartHandshake],
    ['/ajustes/respaldo', 'Respaldo, restauración y almacenamiento', HardDrive],
    ['/ajustes/instalar', 'Instalar LOOKSY en tu dispositivo', Smartphone],
  ] as const
  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" back="/" />
      <label className="card block space-y-2 p-4">
        <span className="text-sm font-semibold">Tu nombre (para el saludo)</span>
        <input defaultValue={prefs.displayName} onBlur={(e) => setPrefs({ ...prefs, displayName: e.target.value })} className={inputClass} autoComplete="given-name" />
      </label>
      <div className="card divide-y divide-line">
        {links.map(([to, label, Icon]) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 py-4">
            <Icon size={20} className="text-accent" aria-hidden /><span className="flex-1">{label}</span><ChevronRight size={18} className="text-muted" aria-hidden />
          </Link>
        ))}
      </div>
      <section className="card space-y-3 p-4 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Lock size={18} className="text-accent" />Privacidad</h2>
        <p className="text-muted">Tus fotos y datos se guardan solo en este dispositivo (IndexedDB del navegador).</p>
        <p className="text-muted">LOOKSY no usa cuentas, servidores propios ni servicios de IA en la nube. El análisis de color y el recorte se hacen en tu dispositivo.</p>
        <p className="text-muted">Pinterest solo se abre cuando tú lo pides; LOOKSY no envía tus fotos a ningún sitio.</p>
      </section>
      <p className="flex items-center justify-center gap-2 text-xs text-muted"><Download size={12} />LOOKSY Web {VERSION}</p>
    </div>
  )
}
