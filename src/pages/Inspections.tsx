import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { InspectionCard } from '../components/InspectionCard'
import { INSPECTION_STATUS_LABEL, inspectionStatus, type InspectionStatus } from '../db/actions'
import { db } from '../db/schema'

type Filter = 'todas' | InspectionStatus

export function Inspections() {
  const [filter, setFilter] = useState<Filter>('todas')
  const [query, setQuery] = useState('')
  const data = useLiveQuery(async () => {
    const [walks, snags, houses, projects] = await Promise.all([
      db.walks.toArray(),
      db.snags.toArray(),
      db.houses.toArray(),
      db.projects.toArray(),
    ])
    walks.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    return { walks, snags, houses: new Map(houses.map((h) => [h.id, h])), projects: new Map(projects.map((p) => [p.id, p])) }
  })

  if (!data) return null

  const q = query.trim().toLowerCase()
  const rows = data.walks
    .map((w) => {
      const house = data.houses.get(w.houseId)
      const project = house ? data.projects.get(house.projectId) : undefined
      return { w, house, project, status: inspectionStatus(w, data.snags), mine: data.snags.filter((s) => s.walkId === w.id) }
    })
    .filter((r) => filter === 'todas' || r.status === filter)
    .filter((r) => !q || `${r.project?.name} ${r.house?.code} ${r.house?.ownerName}`.toLowerCase().includes(q))

  return (
    <>
      <AppHeader title="Mis inspecciones" />
      <div className="content">
        <input type="search" placeholder="Buscar desarrollo, vivienda o cliente" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips">
          {(['todas', 'en_proceso', 'en_revision', 'completada'] as Filter[]).map((f) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'todas' ? 'Todas' : INSPECTION_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        {rows.length === 0 && <p className="empty">No hay inspecciones en este filtro.</p>}
        <ul className="list">
          {rows.map((r) => (
            <InspectionCard key={r.w.id} walk={r.w} house={r.house} project={r.project} status={r.status} findings={r.mine.length} firstSnagId={r.mine[0]?.id} />
          ))}
        </ul>
      </div>
      <Link to="/inspecciones/nueva" className="fab" aria-label="Nueva inspección">
        <Plus size={28} />
      </Link>
    </>
  )
}
