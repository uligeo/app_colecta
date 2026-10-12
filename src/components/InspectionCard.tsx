import { Link } from 'react-router-dom'
import { formatDate, INSPECTION_STATUS_LABEL, type InspectionStatus } from '../db/actions'
import { WALK_TYPE_LABEL, type House, type Project, type Walk } from '../db/schema'
import { InspectionFileActions } from './InspectionFileActions'
import { Thumb } from './Thumb'

interface InspectionCardProps {
  walk: Walk
  house?: House
  project?: Project
  status: InspectionStatus
  findings: number
  firstSnagId?: number
}

export function InspectionCard({ walk, house, project, status, findings, firstSnagId }: InspectionCardProps) {
  const target = status === 'en_proceso' ? `/inspecciones/${walk.id}/checklist` : `/inspecciones/${walk.id}/revisar`
  return (
    <li className="inspection-item">
      <Link to={target} className="inspection-card">
        <Thumb blob={house?.photo} snagId={house?.photo ? undefined : firstSnagId} size={64} />
        <div className="finding-main">
          <strong>{project?.name ?? 'Desarrollo'}</strong>
          <span>{house?.code ?? 'Vivienda'}</span>
          <small>
            {formatDate(walk.date)} · {WALK_TYPE_LABEL[walk.type]} · {findings} hallazgos
          </small>
        </div>
        <span className={`status-pill st-${status}`}>{INSPECTION_STATUS_LABEL[status]}</span>
      </Link>
      <InspectionFileActions walk={walk} />
    </li>
  )
}
