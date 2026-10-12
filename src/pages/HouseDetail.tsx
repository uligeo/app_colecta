import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { FindingCard } from '../components/FindingCard'
import { InspectionCard } from '../components/InspectionCard'
import { PlanView } from '../components/PlanView'
import { Thumb } from '../components/Thumb'
import { deleteHouse, inspectionStatus, isOpen, isOverdue } from '../db/actions'
import { db, HOUSE_STATUS_LABEL, SNAG_STATUS_LABEL, type HouseStatus, type SnagStatus } from '../db/schema'

type Tab = 'hallazgos' | 'plano' | 'inspecciones'
type Filter = 'pendientes' | 'todas' | SnagStatus

export function HouseDetail() {
  const houseId = Number(useParams().id)
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const house = await db.houses.get(houseId)
    if (!house) return null
    const [project, snags, walks, plans, contractors] = await Promise.all([
      db.projects.get(house.projectId),
      db.snags.where('houseId').equals(houseId).sortBy('number'),
      db.walks.where('houseId').equals(houseId).reverse().sortBy('date'),
      db.plans.where('projectId').equals(house.projectId).toArray(),
      db.contractors.toArray(),
    ])
    return { house, project, snags, walks, plans, contractorName: new Map(contractors.map((c) => [c.id, c.name])) }
  }, [houseId])
  const [tab, setTab] = useState<Tab>('hallazgos')
  const [filter, setFilter] = useState<Filter>('pendientes')
  const [planId, setPlanId] = useState<number | null>(null)

  if (data === undefined) return null
  if (data === null) return <p className="empty">Vivienda no encontrada.</p>

  const { house, project, snags, walks, plans, contractorName } = data
  const open = snags.filter(isOpen)
  const visible = snags.filter((s) => (filter === 'todas' ? true : filter === 'pendientes' ? isOpen(s) : s.status === filter))
  const plan = plans.find((p) => p.id === planId) ?? plans[0]

  async function handleDelete() {
    if (!confirm(`¿Eliminar la vivienda ${house.code} con sus hallazgos e inspecciones?`)) return
    await deleteHouse(houseId)
    navigate(`/desarrollos/${house.projectId}`)
  }

  const tabLabel: Record<Tab, string> = {
    hallazgos: `Hallazgos (${snags.length})`,
    plano: 'Plano',
    inspecciones: `Inspecciones (${walks.length})`,
  }

  return (
    <>
      <AppHeader title={house.code} back={`/desarrollos/${house.projectId}`} />
      <div className="content">
        <div className="card house-card">
          <Thumb blob={house.photo} size={72} />
          <div className="finding-main">
            <strong>{project?.name}</strong>
            <small>{[house.ownerName, house.address].filter(Boolean).join(' · ') || 'Sin datos del cliente'}</small>
            <small>
              {house.type === 'departamento' ? 'Departamento' : 'Casa'}
              {house.surface ? ` · ${house.surface} m²` : ''}
              {house.model ? ` · ${house.model}` : ''}
            </small>
          </div>
          <select
            className="inline-select"
            value={house.status}
            aria-label="Estado de la vivienda"
            onChange={(e) => db.houses.update(houseId, { status: e.target.value as HouseStatus })}
          >
            {Object.entries(HOUSE_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="kpis">
          <span><b>{open.length}</b> pendientes</span>
          <span><b>{snags.filter((s) => s.status === 'corregida').length}</b> por verificar</span>
          <span className={snags.some((s) => isOverdue(s)) ? 'alert' : ''}><b>{snags.filter((s) => isOverdue(s)).length}</b> vencidos</span>
          <span><b>{snags.length - open.length}</b> cerrados</span>
        </div>

        <div className="actions">
          <Link className="btn primary" to={`/inspecciones/nueva?vivienda=${houseId}`}><Plus size={18} /> Nueva inspección</Link>
          <Link className="btn" to={`/viviendas/${houseId}/hallazgo`}><Plus size={18} /> Hallazgo</Link>
          <Link className="btn" to={`/viviendas/${houseId}/reporte`}><FileText size={18} /> Reporte</Link>
        </div>

        <div className="tabs" role="tablist">
          {(Object.keys(tabLabel) as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {tabLabel[t]}
            </button>
          ))}
        </div>

        {tab === 'hallazgos' && (
          <>
            <div className="chips">
              {(['pendientes', 'todas', ...Object.keys(SNAG_STATUS_LABEL)] as Filter[]).map((f) => (
                <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'pendientes' ? 'Pendientes' : f === 'todas' ? 'Todos' : SNAG_STATUS_LABEL[f]}
                </button>
              ))}
            </div>
            {visible.length === 0 && <p className="empty">Sin hallazgos en este filtro.</p>}
            <ul className="list">
              {visible.map((s) => (
                <FindingCard key={s.id} snag={s} contractorName={s.contractorId ? contractorName.get(s.contractorId) : undefined} />
              ))}
            </ul>
          </>
        )}

        {tab === 'plano' &&
          (plan ? (
            <div className="form-stack">
              {plans.length > 1 && (
                <select value={plan.id} onChange={(e) => setPlanId(Number(e.target.value))}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <PlanView
                blob={plan.blob}
                pins={snags
                  .filter((s) => s.pin?.planId === plan.id)
                  .map((s) => ({ id: s.id, x: s.pin!.x, y: s.pin!.y, label: String(s.number), tone: s.status }))}
                onPinClick={(id) => navigate(`/hallazgos/${id}`)}
              />
            </div>
          ) : (
            <p className="empty">
              El desarrollo no tiene planos. Súbelos desde <Link to={`/desarrollos/${house.projectId}`}>{project?.name}</Link>.
            </p>
          ))}

        {tab === 'inspecciones' && (
          <>
            {walks.length === 0 && <p className="empty">Sin inspecciones registradas.</p>}
            <ul className="list">
              {walks.map((w) => {
                const mine = snags.filter((s) => s.walkId === w.id)
                return (
                  <InspectionCard key={w.id} walk={w} house={house} project={project} status={inspectionStatus(w, snags)} findings={mine.length} firstSnagId={mine[0]?.id} />
                )
              })}
            </ul>
          </>
        )}

        <button className="btn ghost danger-text" onClick={handleDelete}>Eliminar vivienda</button>
      </div>
    </>
  )
}
