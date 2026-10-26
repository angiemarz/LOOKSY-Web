import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { ChevronLeft, Home, Shirt, Sparkles, WandSparkles, LayoutGrid } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { IconButton } from './primitives'

const TABS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/armario', label: 'Mi armario', icon: Shirt },
  { to: '/crear', label: 'Crear outfit', icon: WandSparkles },
  { to: '/inspiracion', label: 'Inspiración', icon: Sparkles },
  { to: '/looks', label: 'Mis looks', icon: LayoutGrid },
]

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="min-h-dvh md:flex">
      <nav aria-label="Secciones" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line bg-surface px-4 py-8 md:flex">
        <span className="mb-6 px-3 font-display text-2xl tracking-wide text-accent">LOOKSY</span>
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] ${isActive ? 'bg-rose-soft font-semibold text-accent' : 'text-ink hover:bg-cream'}`}>
            <Icon size={20} aria-hidden />{label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pb-12 md:pt-8">
        <Outlet />
      </main>
      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-safe backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10.5px] ${isActive ? 'font-semibold text-accent' : 'text-muted'}`}>
              <Icon size={22} aria-hidden />{label}
            </NavLink>
          ))}
        </div>
      </nav>
      <UpdatePrompt />
    </div>
  )
}

function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-bg shadow-xl md:bottom-6">
      <span>Hay una nueva versión de LOOKSY.</span>
      <button type="button" className="rounded-full bg-rose px-4 py-1.5 font-semibold text-ink" onClick={() => updateServiceWorker(true)}>Actualizar</button>
    </div>
  )
}

/** Page title with optional back button and trailing actions. */
export function PageHeader({ title, back, actions, subtitle }: { title: string; back?: boolean | string; actions?: ReactNode; subtitle?: string }) {
  const navigate = useNavigate()
  return (
    <header className="mb-5 flex items-start gap-2">
      {back && (
        <IconButton label="Atrás" className="-ml-2 mt-0.5" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}>
          <ChevronLeft size={24} />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[1.85rem] leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  )
}
