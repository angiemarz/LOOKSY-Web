import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { COLORS, colorHex, type FashionColor, COLOR_LIST } from '@/domain/color'
import { imageURL } from '@/services/collageRender'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({ variant = 'primary', full, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-accent text-on-accent shadow-sm active:scale-[0.98]',
    secondary: 'bg-rose-soft text-accent active:scale-[0.98]',
    ghost: 'text-accent hover:bg-rose-soft/60',
    danger: 'bg-danger/10 text-danger active:scale-[0.98]',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold transition disabled:opacity-40 disabled:pointer-events-none ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={`grid size-11 place-items-center rounded-full text-ink transition hover:bg-rose-soft active:scale-95 ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Chip({ selected, onClick, children, icon }: { selected: boolean; onClick: () => void; children: ReactNode; icon?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${selected ? 'border-transparent bg-accent text-on-accent' : 'border-line bg-cream text-ink'}`}
    >
      {icon}
      {children}
    </button>
  )
}

export function ChipGroup<T extends string>({ items, selected, onChange, label, single }: {
  items: readonly T[]; selected: T[]; onChange: (next: T[]) => void; label: (item: T) => string; single?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Chip
          key={item}
          selected={selected.includes(item)}
          onClick={() => {
            if (single) onChange(selected.includes(item) ? [] : [item])
            else onChange(selected.includes(item) ? selected.filter((x) => x !== item) : [...selected, item])
          }}
        >
          {label(item)}
        </Chip>
      ))}
    </div>
  )
}

export function ColorDot({ color, size = 14 }: { color: FashionColor; size?: number }) {
  const style = color === 'multicolor'
    ? { background: 'conic-gradient(#e53935,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)' }
    : { background: colorHex(color) }
  return <span role="img" aria-label={COLORS[color].label} className="inline-block shrink-0 rounded-full border border-line" style={{ ...style, width: size, height: size }} />
}

/** Color grid; single or multiple selection. `highlighted` marks colors detected in the photo. */
export function ColorPicker({ selected, onChange, multiple, exclude = [], highlighted = [] }: {
  selected: FashionColor[]; onChange: (next: FashionColor[]) => void; multiple?: boolean; exclude?: FashionColor[]; highlighted?: FashionColor[]
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
      {COLOR_LIST.filter((c) => !exclude.includes(c)).map((c) => {
        const on = selected.includes(c)
        return (
          <button
            key={c}
            type="button"
            aria-pressed={on}
            aria-label={COLORS[c].label}
            onClick={() => onChange(multiple ? (on ? selected.filter((x) => x !== c) : [...selected, c]) : [c])}
            className="flex flex-col items-center gap-1"
          >
            <span className={`relative rounded-full p-0.5 ${on ? 'ring-2 ring-accent' : ''}`}>
              <ColorDot color={c} size={28} />
              {highlighted.includes(c) && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-surface bg-accent" aria-hidden />}
            </span>
            <span className="w-full truncate text-center text-[10px] text-muted">{COLORS[c].label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Image stored in IndexedDB, loaded lazily with a skeleton. */
export function StoredImage({ id, alt, className = '', fit = 'contain' }: { id?: string; alt: string; className?: string; fit?: 'contain' | 'cover' }) {
  const [url, setURL] = useState<string | undefined>()
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(id ? 'loading' : 'missing')
  useEffect(() => {
    let alive = true
    if (!id) { setState('missing'); return }
    setState('loading')
    imageURL(id).then((u) => { if (alive) { setURL(u); setState(u ? 'ready' : 'missing') } })
    return () => { alive = false }
  }, [id])
  if (state === 'loading') return <div className={`skeleton rounded-2xl ${className}`} aria-hidden />
  if (state === 'missing' || !url) return <div className={`grid place-items-center rounded-2xl bg-cream text-xs text-muted ${className}`}>Sin foto</div>
  return <img src={url} alt={alt} className={`${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`} loading="lazy" decoding="async" />
}

export function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-20 place-items-center rounded-full bg-rose-soft text-rose">{icon}</div>
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Banner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  const toneClass = tone === 'warning' ? 'text-danger' : 'text-accent'
  return <div className={`rounded-2xl bg-rose-soft px-4 py-3 text-sm text-ink`}><span className={`mr-1 ${toneClass}`}>●</span>{children}</div>
}

export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputClass = 'w-full rounded-2xl border border-line bg-cream px-4 py-3 text-ink placeholder:text-muted/70 outline-none focus:border-accent'

/** Bottom sheet on phones, centered dialog on large screens. Uses the native <dialog>. */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-surface p-0 text-ink backdrop:bg-black/40 md:m-auto md:rounded-3xl ${wide ? 'md:max-w-3xl' : 'md:max-w-lg'}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-display text-lg">{title}</h2>
            <IconButton label="Cerrar" onClick={onClose}><X size={20} /></IconButton>
          </div>
          <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">{children}</div>
        </div>
      )}
    </dialog>
  )
}

/** Confirmation before destructive actions. */
export function Confirm({ open, title, message, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-5 flex flex-col gap-2">
        <Button variant="danger" full onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
        <Button variant="ghost" full onClick={onClose}>Cancelar</Button>
      </div>
    </Sheet>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-rose border-t-transparent" aria-hidden />
      {label}
    </div>
  )
}
