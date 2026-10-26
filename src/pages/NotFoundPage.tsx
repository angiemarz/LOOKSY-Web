import { Link } from 'react-router-dom'
import { PageHeader } from '@/ui/Layout'

export function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Página no encontrada" />
      <Link to="/" className="font-semibold text-accent">Volver al inicio</Link>
    </div>
  )
}
