import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { dueDateFor, suggestContractor, type SnagInput } from '../db/actions'
import { findArea, TRADES } from '../db/catalog'
import { useCatalog } from '../db/checklistStore'
import { db } from '../db/schema'
import { PlanView } from './PlanView'
import { SeverityPicker } from './Severity'

interface SnagFormProps {
  projectId: number
  value: SnagInput
  onChange: (patch: Partial<SnagInput>) => void
  pinLabel: string
}

const OTHER = 'Otro'

function autoDescription(defect: string, element: string): string {
  return defect && defect !== OTHER ? `${defect} en ${element.toLowerCase()}` : ''
}

/** Campos de un hallazgo; se usa tanto para registrar como para editar. */
export function SnagForm({ projectId, value, onChange, pinLabel }: SnagFormProps) {
  const contractors = useLiveQuery(() => db.contractors.orderBy('name').toArray())
  const plans = useLiveQuery(() => db.plans.where('projectId').equals(projectId).toArray(), [projectId])
  const [planId, setPlanId] = useState<number | null>(value.pin?.planId ?? null)

  const catalog = useCatalog()
  const area = findArea(catalog, value.area)
  const elements = area?.elements ?? []
  const elementDef = elements.find((e) => e.name === value.element)
  const defects = elementDef?.defects ?? []
  const plan = plans?.find((p) => p.id === planId) ?? plans?.[0]
  const sortedContractors = [...(contractors ?? [])].sort(
    (a, b) => Number(b.trade === value.trade) - Number(a.trade === value.trade),
  )

  function changeElement(element: string, areaId = value.area) {
    const trade = findArea(catalog, areaId)?.elements.find((e) => e.name === element)?.trade ?? value.trade
    onChange({
      area: areaId,
      element,
      checkItem: '',
      defectType: '',
      trade,
      contractorId: suggestContractor(contractors ?? [], trade, value.contractorId),
    })
  }

  function changeDefect(defectType: string) {
    const previousAuto = autoDescription(value.defectType, value.element)
    const keepText = value.description.trim() && value.description !== previousAuto
    onChange({ defectType, description: keepText ? value.description : autoDescription(defectType, value.element) })
  }

  return (
    <div className="form-stack">
      <label>
        Área *
        <select required value={value.area} onChange={(e) => changeElement(findArea(catalog, e.target.value)?.elements[0]?.name ?? '', e.target.value)}>
          <option value="" disabled>
            Selecciona un área
          </option>
          {catalog.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Elemento *
        <select required value={value.element} onChange={(e) => changeElement(e.target.value)}>
          <option value="" disabled>
            Selecciona un elemento
          </option>
          {elements.map((el) => (
            <option key={el.name}>{el.name}</option>
          ))}
          {value.element && !elementDef && <option>{value.element}</option>}
        </select>
      </label>
      <label>
        Tipo de defecto *
        <select required value={value.defectType} onChange={(e) => changeDefect(e.target.value)}>
          <option value="" disabled>
            Selecciona el defecto
          </option>
          {[...defects, OTHER].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <div className="field">
        <span className="field-label">Severidad *</span>
        <SeverityPicker value={value.priority} onChange={(priority) => onChange({ priority, dueDate: dueDateFor(priority) })} />
      </div>
      <label>
        Descripción *
        <textarea required rows={2} value={value.description} onChange={(e) => onChange({ description: e.target.value })} />
      </label>
      <label>
        Ubicación
        <input placeholder="Muro norte, junto a ventana" value={value.location} onChange={(e) => onChange({ location: e.target.value })} />
      </label>

      <details className="subsection">
        <summary>Seguimiento y responsable</summary>
        <div className="form-stack">
          <label>
            Especialidad
            <select
              value={value.trade}
              onChange={(e) =>
                onChange({ trade: e.target.value, contractorId: suggestContractor(contractors ?? [], e.target.value, value.contractorId) })
              }
            >
              {TRADES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Contratista responsable
            <select value={value.contractorId ?? ''} onChange={(e) => onChange({ contractorId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Sin asignar</option>
              {sortedContractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.trade})
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha compromiso de corrección
            <input type="date" value={value.dueDate} onChange={(e) => onChange({ dueDate: e.target.value })} />
          </label>
          {plan && plans && (
            <div className="field">
              <span className="field-label">Ubicación en plano (toca para marcar)</span>
              {plans.length > 1 && (
                <select value={plan.id} onChange={(e) => setPlanId(Number(e.target.value))}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <PlanView
                blob={plan.blob}
                pins={value.pin?.planId === plan.id ? [{ id: 'actual', x: value.pin.x, y: value.pin.y, label: pinLabel, tone: 'abierta' }] : []}
                onPick={(x, y) => onChange({ pin: { planId: plan.id, x, y } })}
              />
              {value.pin && (
                <button type="button" className="btn ghost" onClick={() => onChange({ pin: null })}>
                  Quitar marca
                </button>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
