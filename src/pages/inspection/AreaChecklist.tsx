import { AlertTriangle, Check, Pencil, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { AreaEditor } from '../../components/AreaEditor'
import { SaveInspectionButton } from '../../components/InspectionActions'
import { findArea } from '../../db/catalog'
import { useCatalog } from '../../db/checklistStore'
import { toggleCheck, useInspection } from './useInspection'

/** Checklist de un área: cada punto se marca conforme o se reporta como hallazgo; también permite editarlo. */
export function AreaChecklist() {
  const params = useParams()
  const walkId = Number(params.id)
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const catalog = useCatalog()
  const area = findArea(catalog, params.area ?? '')
  const data = useInspection(walkId)
  const [query, setQuery] = useState('')
  const editing = search.get('editar') === '1'
  const back = `/inspecciones/${walkId}/checklist`

  if (data === undefined) return null
  if (data === null || !area) return <p className="empty">Área no encontrada.</p>

  const { walk, snags } = data
  const q = query.trim().toLowerCase()
  const setEditing = (on: boolean) => setSearch(on ? { editar: '1' } : {}, { replace: true })
  const newFinding = (element = '', item = '') =>
    navigate(`/inspecciones/${walkId}/hallazgo?area=${area.id}&elemento=${encodeURIComponent(element)}&punto=${encodeURIComponent(item)}`)

  return (
    <div className="wizard">
      <AppHeader title={editing ? `Editar · ${area.name}` : area.name} back={back} right={<SaveInspectionButton label="Guardar" className="header-btn" />} />
      <div className="content">
        <div className="section-head top">
          <span className="muted small">{editing ? 'Los cambios se guardan al salir de cada campo.' : area.subtitle}</span>
          <button type="button" className="link-btn" onClick={() => setEditing(!editing)}>
            {editing ? <><Check size={16} /> Listo</> : <><Pencil size={16} /> Editar checklist</>}
          </button>
        </div>

        {editing ? (
          <AreaEditor area={area} onDeleted={() => navigate(back, { replace: true })} />
        ) : (
          <>
            <div className="search">
              <Search size={18} />
              <input type="search" placeholder="Buscar elemento…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {area.elements.length === 0 && (
              <p className="empty">Esta área no tiene elementos. Toca <b>Editar checklist</b> para agregarlos.</p>
            )}
            {area.elements.map((el) => {
              const items = el.items.filter((i) => !q || `${el.name} ${i.text}`.toLowerCase().includes(q))
              if (items.length === 0 && q) return null
              return (
                <section key={el.name} className="check-group">
                  <div className="section-head">
                    <h3>{el.name}</h3>
                    {items.length > 0 && (
                      <button type="button" className="link-btn" onClick={() => items.forEach((i) => toggleCheck(walkId, i.id, true))}>
                        Todo conforme
                      </button>
                    )}
                  </div>
                  {items.length === 0 ? (
                    <p className="muted small">Sin puntos. Agrégalos en Editar checklist.</p>
                  ) : (
                    <ul className="check-list">
                      {items.map((item) => {
                        const findings = snags.filter((s) => s.checkItem === item.id)
                        const ok = !!walk.checks[item.id]
                        return (
                          <li key={item.id} className={`check-row ${findings.length ? 'has-finding' : ''}`}>
                            <button
                              type="button"
                              className="report-btn"
                              aria-label={`Reportar hallazgo: ${el.name} · ${item.text}`}
                              onClick={() => newFinding(el.name, item.id)}
                            >
                              <AlertTriangle size={18} />
                            </button>
                            <span className="check-text">
                              {item.text}
                              {findings.length > 0 && (
                                <small className="text-alta"> · {findings.length} hallazgo{findings.length > 1 ? 's' : ''}</small>
                              )}
                            </span>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={ok}
                              aria-label={`Conforme: ${el.name} · ${item.text}`}
                              className={`checkbox ${ok ? 'checked' : ''}`}
                              onClick={() => toggleCheck(walkId, item.id)}
                            >
                              {ok && <Check size={16} strokeWidth={3} />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
            <p className="hint">
              <Check size={14} /> marca el punto como conforme · <AlertTriangle size={14} /> registra un hallazgo
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="bottom-actions single">
          <button type="button" className="btn primary block" onClick={() => newFinding(area.elements[0]?.name)}>
            Agregar hallazgo
          </button>
        </div>
      )}
    </div>
  )
}
