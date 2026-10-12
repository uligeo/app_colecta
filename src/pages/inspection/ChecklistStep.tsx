import { ArrowDown, ArrowUp, Check, ChevronRight, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { AreaIcon } from '../../components/AreaIcon'
import { SaveInspectionButton } from '../../components/InspectionActions'
import { Stepper } from '../../components/Stepper'
import { checklistProgress, reviewedKeys } from '../../db/actions'
import { AREA_ICONS, areaItems, type AreaIcon as AreaIconName } from '../../db/catalog'
import { addArea, moveArea, useCatalog } from '../../db/checklistStore'
import { useInspection } from './useInspection'

/** Paso 2: áreas de la vivienda con su avance de revisión; permite agregar y ordenar áreas. */
export function ChecklistStep() {
  const walkId = Number(useParams().id)
  const navigate = useNavigate()
  const data = useInspection(walkId)
  const catalog = useCatalog()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<{ name: string; subtitle: string; icon: AreaIconName }>({ name: '', subtitle: '', icon: 'exterior' })

  if (data === undefined) return null
  if (data === null) return <p className="empty">Inspección no encontrada.</p>

  const { walk, house, snags } = data
  const reviewed = reviewedKeys(walk, snags)
  const progress = checklistProgress(walk, snags, catalog)

  async function createArea(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const id = await addArea({ name: form.name.trim(), subtitle: form.subtitle.trim(), icon: form.icon })
    navigate(`/inspecciones/${walkId}/checklist/${id}?editar=1`)
  }

  return (
    <div className="wizard">
      <AppHeader title="Áreas de la vivienda" back={`/inspecciones/${walkId}/vivienda`} right={<SaveInspectionButton label="Guardar" className="header-btn" />} />
      <Stepper current={2} walkId={walkId} />
      <div className="content">
        <div className="progress-head">
          <span>{house?.code}</span>
          <span>
            {progress.done}/{progress.total} puntos revisados
          </span>
        </div>
        <div className="progress"><div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
        <div className="section-head top">
          <span className="muted small">{editing ? 'Ordena las áreas o entra a cada una para editarla.' : `${catalog.areas.length} áreas`}</span>
          <button type="button" className="link-btn" onClick={() => setEditing(!editing)}>
            {editing ? <><Check size={16} /> Listo</> : <><Pencil size={16} /> Editar áreas</>}
          </button>
        </div>
        <ul className="area-list">
          {catalog.areas.map((a, i) => {
            const keys = areaItems(a)
            const done = keys.filter((k) => reviewed.has(k)).length
            const findings = snags.filter((s) => s.area === a.id).length
            return (
              <li key={a.id} className={editing ? 'area-edit-row' : ''}>
                <Link
                  to={`/inspecciones/${walkId}/checklist/${a.id}${editing ? '?editar=1' : ''}`}
                  className={`area-row ${keys.length && done === keys.length ? 'complete' : ''}`}
                >
                  <AreaIcon name={a.icon} />
                  <div className="finding-main">
                    <strong>{a.name}</strong>
                    <small>{a.subtitle}</small>
                    {findings > 0 && <small className="text-alta">{findings} hallazgo{findings > 1 ? 's' : ''}</small>}
                  </div>
                  {editing ? <Pencil size={16} className="chev" /> : <span className="area-count">{done}/{keys.length}</span>}
                  <ChevronRight size={18} className="chev" />
                </Link>
                {editing && (
                  <div className="reorder">
                    <button type="button" className="icon-btn" aria-label={`Subir ${a.name}`} disabled={i === 0} onClick={() => moveArea(a.id, -1)}>
                      <ArrowUp size={18} />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Bajar ${a.name}`} disabled={i === catalog.areas.length - 1} onClick={() => moveArea(a.id, 1)}>
                      <ArrowDown size={18} />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {editing && (
          <form className="card form-stack add-area" onSubmit={createArea}>
            <h3>Agregar área</h3>
            <label>
              Nombre *
              <input required value={form.name} placeholder="Ej. Terraza, Estudio, Alberca" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Descripción
              <input value={form.subtitle} placeholder="Elementos que incluye" onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </label>
            <label>
              Icono
              <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value as AreaIconName })}>
                {Object.entries(AREA_ICONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button className="btn primary sm"><Plus size={16} /> Agregar área</button>
          </form>
        )}
      </div>
      <div className="bottom-actions">
        <button type="button" className="btn" onClick={() => navigate(`/inspecciones/${walkId}/vivienda`)}>Atrás</button>
        <button type="button" className="btn primary" onClick={() => navigate(`/inspecciones/${walkId}/hallazgos`)}>Siguiente</button>
      </div>
    </div>
  )
}
