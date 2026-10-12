import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isOverdue } from '../db/actions'
import { areaName } from '../db/catalog'
import { useCatalog } from '../db/checklistStore'
import { SNAG_STATUS_LABEL, type Snag } from '../db/schema'
import { Badge } from './Badge'
import { SeverityPill } from './Severity'
import { Thumb } from './Thumb'

interface FindingCardProps {
  snag: Snag
  context?: string
  contractorName?: string
}

/** Tarjeta de hallazgo con miniatura, ubicación, severidad y estado de seguimiento. */
export function FindingCard({ snag, context, contractorName }: FindingCardProps) {
  const catalog = useCatalog()
  const place = [snag.area ? areaName(catalog, snag.area) : snag.location, snag.element].filter(Boolean).join(' · ')
  return (
    <li>
      <Link to={`/hallazgos/${snag.id}`} className="finding-card">
        <Thumb snagId={snag.id} />
        <div className="finding-main">
          <strong>{snag.description}</strong>
          <small>
            {context && `${context} · `}#{snag.number} · {place || 'Sin ubicación'}
          </small>
          <div className="finding-meta">
            {snag.status !== 'abierta' && <Badge tone={snag.status}>{SNAG_STATUS_LABEL[snag.status]}</Badge>}
            {isOverdue(snag) && <Badge tone="vencida">Vencido</Badge>}
            {contractorName && <small>{contractorName}</small>}
          </div>
        </div>
        <SeverityPill value={snag.priority} />
        <ChevronRight size={18} className="chev" />
      </Link>
    </li>
  )
}
