import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, FileText, HardHat } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { formatDate, INSPECTION_STATUS_LABEL, inspectionStatus, isOverdue } from '../db/actions'
import { db, WALK_TYPE_LABEL } from '../db/schema'

/** Acceso a reportes de inspección y listas de trabajo por contratista. */
export function Reports() {
  const data = useLiveQuery(async () => {
    const [walks, snags, houses, projects, contractors] = await Promise.all([
      db.walks.toArray(),
      db.snags.toArray(),
      db.houses.toArray(),
      db.projects.toArray(),
      db.contractors.orderBy('name').toArray(),
    ])
    walks.sort((a, b) => b.date.localeCompare(a.date))
    return { walks, snags, houses: new Map(houses.map((h) => [h.id, h])), projects: new Map(projects.map((p) => [p.id, p])), contractors }
  })

  if (!data) return null

  const active = data.snags.filter((s) => s.status === 'abierta' || s.status === 'en_proceso')
  const unassigned = active.filter((s) => s.contractorId === null).length

  return (
    <>
      <AppHeader title="Reportes" />
      <div className="content">
        <h2>Reportes de inspección</h2>
        {data.walks.length === 0 && <p className="empty">Aún no hay inspecciones.</p>}
        <ul className="menu-list">
          {data.walks.map((w) => {
            const house = data.houses.get(w.houseId)
            const project = house ? data.projects.get(house.projectId) : undefined
            return (
              <li key={w.id}>
                <Link to={`/inspecciones/${w.id}/reporte`}>
                  <FileText size={20} />
                  <span>
                    <b>{project?.name} · {house?.code}</b>
                    <small>{WALK_TYPE_LABEL[w.type]} · {formatDate(w.date)} · {INSPECTION_STATUS_LABEL[inspectionStatus(w, data.snags)]}</small>
                  </span>
                  <ChevronRight size={18} />
                </Link>
              </li>
            )
          })}
        </ul>

        <h2>Listas por contratista</h2>
        <ul className="menu-list">
          {data.contractors.map((c) => {
            const mine = active.filter((s) => s.contractorId === c.id)
            const late = mine.filter((s) => isOverdue(s)).length
            return (
              <li key={c.id}>
                <Link to={`/contratistas/${c.id}/reporte`}>
                  <HardHat size={20} />
                  <span>
                    <b>{c.name}</b>
                    <small>{c.trade} · {mine.length} pendientes{late ? ` · ${late} vencidos` : ''}</small>
                  </span>
                  <ChevronRight size={18} />
                </Link>
              </li>
            )
          })}
          {unassigned > 0 && (
            <li>
              <Link to="/contratistas/sin-asignar/reporte">
                <HardHat size={20} />
                <span><b>Sin asignar</b><small>{unassigned} pendientes</small></span>
                <ChevronRight size={18} />
              </Link>
            </li>
          )}
        </ul>
        {data.contractors.length === 0 && <p className="empty">Registra contratistas en Más → Contratistas.</p>}
      </div>
    </>
  )
}
