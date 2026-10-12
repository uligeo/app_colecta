import { useLiveQuery } from 'dexie-react-hooks'
import { Download, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { FindingCard } from '../components/FindingCard'
import { isOpen, isOverdue, today } from '../db/actions'
import { TRADES } from '../db/catalog'
import { useCatalog } from '../db/checklistStore'
import { db, PRIORITY_LABEL } from '../db/schema'
import { snagsToCsv } from '../lib/csv'
import { downloadBlob } from '../lib/image'

const VIEWS = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'vencidas', label: 'Vencidos' },
  { id: 'corregida', label: 'Por verificar' },
  { id: 'cerrada', label: 'Cerrados' },
  { id: 'todas', label: 'Todos' },
]

/** Lista global de hallazgos para dar seguimiento, con filtros y exportación CSV. */
export function Pending() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const catalog = useCatalog()
  const view = params.get('estado') ?? 'pendientes'
  const projectId = params.get('desarrollo') ?? ''
  const trade = params.get('especialidad') ?? ''
  const contractor = params.get('contratista') ?? ''
  const priority = params.get('severidad') ?? ''

  const data = useLiveQuery(async () => {
    const [snags, projects, houses, contractors] = await Promise.all([
      db.snags.toArray(),
      db.projects.toArray(),
      db.houses.toArray(),
      db.contractors.orderBy('name').toArray(),
    ])
    return {
      snags,
      projects: new Map(projects.map((p) => [p.id, p])),
      houses: new Map(houses.map((h) => [h.id, h])),
      contractors: new Map(contractors.map((c) => [c.id, c])),
    }
  })

  if (!data) return null

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const ref = today()
  const q = query.trim().toLowerCase()
  const visible = data.snags
    .filter((s) => {
      if (view === 'pendientes' && !isOpen(s)) return false
      if (view === 'vencidas' && !isOverdue(s, ref)) return false
      if ((view === 'corregida' || view === 'cerrada') && s.status !== view) return false
      if (projectId && s.projectId !== Number(projectId)) return false
      if (trade && s.trade !== trade) return false
      if (contractor === 'sin' ? s.contractorId !== null : contractor && s.contractorId !== Number(contractor)) return false
      if (priority && s.priority !== priority) return false
      return !q || `${s.description} ${s.location} ${s.element} ${data.houses.get(s.houseId)?.code}`.toLowerCase().includes(q)
    })
    .sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9') || a.number - b.number)
  const activeFilters = [projectId, trade, contractor, priority].filter(Boolean).length

  return (
    <>
      <AppHeader
        title="Pendientes"
        right={
          <button type="button" className="icon-btn" aria-label="Filtros" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={20} />
            {activeFilters > 0 && <span className="dot-count">{activeFilters}</span>}
          </button>
        }
      />
      <div className="tabs scroll" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={view === v.id ? 'active' : ''} onClick={() => set('estado', v.id === 'pendientes' ? '' : v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="content">
        <input type="search" placeholder="Buscar descripción, elemento o vivienda" value={query} onChange={(e) => setQuery(e.target.value)} />
        {showFilters && (
          <div className="filters card">
            <select value={projectId} onChange={(e) => set('desarrollo', e.target.value)}>
              <option value="">Todos los desarrollos</option>
              {[...data.projects.values()].map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={trade} onChange={(e) => set('especialidad', e.target.value)}>
              <option value="">Todas las especialidades</option>
              {TRADES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={contractor} onChange={(e) => set('contratista', e.target.value)}>
              <option value="">Todos los contratistas</option>
              <option value="sin">Sin asignar</option>
              {[...data.contractors.values()].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={priority} onChange={(e) => set('severidad', e.target.value)}>
              <option value="">Todas las severidades</option>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
        <div className="section-head">
          <span className="muted small">{visible.length} hallazgos</span>
          <button
            type="button"
            className="link-btn"
            disabled={visible.length === 0}
            onClick={() => downloadBlob(snagsToCsv(visible, data.projects, data.houses, data.contractors, catalog), `nivela-hallazgos-${ref}.csv`)}
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
        {visible.length === 0 && <p className="empty">Sin hallazgos en esta vista.</p>}
        <ul className="list">
          {visible.map((s) => (
            <FindingCard
              key={s.id}
              snag={s}
              context={data.houses.get(s.houseId)?.code}
              contractorName={s.contractorId ? data.contractors.get(s.contractorId)?.name : undefined}
            />
          ))}
        </ul>
      </div>
    </>
  )
}
