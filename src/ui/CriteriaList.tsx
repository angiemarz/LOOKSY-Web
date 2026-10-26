import { CircleCheck, CircleDashed, CircleHelp, CircleX } from 'lucide-react'
import type { ComparisonCriterion } from '@/domain/recreation'

const ICONS = { match: CircleCheck, partial: CircleDashed, miss: CircleX, unknown: CircleHelp }
const TONES = { match: 'text-accent', partial: 'text-rose', miss: 'text-muted', unknown: 'text-muted' }

/** Explainable comparison criteria (no invented similarity percentages). */
export function CriteriaList({ criteria }: { criteria: ComparisonCriterion[] }) {
  return (
    <ul className="space-y-2 rounded-2xl bg-cream p-3">
      {criteria.map((c) => {
        const Icon = ICONS[c.status]
        return (
          <li key={c.title} className="flex gap-2">
            <Icon size={18} className={`mt-0.5 shrink-0 ${TONES[c.status]}`} aria-hidden />
            <div><p className="text-xs font-semibold">{c.title}</p><p className="text-xs text-muted">{c.detail}</p></div>
          </li>
        )
      })}
    </ul>
  )
}
