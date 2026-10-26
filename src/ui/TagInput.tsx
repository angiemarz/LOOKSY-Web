import { useState } from 'react'
import { X } from 'lucide-react'
import { Button, inputClass } from './primitives'

export function TagInput({ tags, onChange, placeholder = 'Añadir etiqueta' }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [value, setValue] = useState('')
  const add = () => {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setValue('')
  }
  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-3 py-1.5 text-sm">
              #{t}
              <button type="button" aria-label={`Quitar etiqueta ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}><X size={14} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder={placeholder} className={inputClass} enterKeyHint="done" />
        <Button variant="secondary" onClick={add} disabled={!value.trim()}>Añadir</Button>
      </div>
    </div>
  )
}
