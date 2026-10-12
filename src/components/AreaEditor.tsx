import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AREA_ICONS, TRADES, type AreaDef, type AreaIcon, type ElementDef } from '../db/catalog'
import {
  addElement,
  addItem,
  deleteArea,
  deleteElement,
  deleteItem,
  updateArea,
  updateElement,
  updateItem,
} from '../db/checklistStore'
import { CommitInput } from './CommitInput'

type Run = (fn: () => Promise<unknown>) => void

/** Edición del checklist de un área: datos del área, elementos, puntos y defectos frecuentes. */
export function AreaEditor({ area, onDeleted }: { area: AreaDef; onDeleted: () => void }) {
  const [error, setError] = useState('')
  const [newElement, setNewElement] = useState({ name: '', trade: 'Albañilería' })

  const run: Run = (fn) => {
    setError('')
    fn().catch((err) => setError(err instanceof Error ? err.message : 'No se pudo guardar.'))
  }

  async function removeArea() {
    if (!confirm(`¿Eliminar el área "${area.name}" del checklist? Los hallazgos ya registrados se conservan.`)) return
    await deleteArea(area.id)
    onDeleted()
  }

  return (
    <div className="form-stack">
      {error && <p className="toast error" role="alert">{error}</p>}
      <section className="card form-stack">
        <h3>Datos del área</h3>
        <label>
          Nombre
          <CommitInput value={area.name} onCommit={(name) => run(() => updateArea(area.id, { name }))} />
        </label>
        <label>
          Descripción
          <CommitInput value={area.subtitle} allowEmpty onCommit={(subtitle) => run(() => updateArea(area.id, { subtitle }))} />
        </label>
        <label>
          Icono
          <select value={area.icon} onChange={(e) => run(() => updateArea(area.id, { icon: e.target.value as AreaIcon }))}>
            {Object.entries(AREA_ICONS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn ghost danger-text sm" onClick={removeArea}>
          <Trash2 size={16} /> Eliminar área
        </button>
      </section>

      {area.elements.map((el, i) => (
        <ElementEditor key={`${i}-${el.name}`} areaId={area.id} element={el} run={run} />
      ))}

      <form
        className="card form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          const name = newElement.name.trim()
          if (!name) return
          run(async () => {
            await addElement(area.id, name, newElement.trade)
            setNewElement({ ...newElement, name: '' })
          })
        }}
      >
        <h3>Agregar elemento</h3>
        <label>
          Nombre del elemento
          <input value={newElement.name} placeholder="Ej. Barandal, Cisterna, Clima" onChange={(e) => setNewElement({ ...newElement, name: e.target.value })} />
        </label>
        <label>
          Especialidad
          <select value={newElement.trade} onChange={(e) => setNewElement({ ...newElement, trade: e.target.value })}>
            {TRADES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <button className="btn primary sm" disabled={!newElement.name.trim()}>
          <Plus size={16} /> Agregar elemento
        </button>
      </form>
    </div>
  )
}

function ElementEditor({ areaId, element, run }: { areaId: string; element: ElementDef; run: Run }) {
  const [text, setText] = useState('')

  function add() {
    const value = text.trim()
    if (!value) return
    run(async () => {
      await addItem(areaId, element.name, value)
      setText('')
    })
  }

  return (
    <section className="card form-stack element-editor">
      <div className="editor-row">
        <CommitInput ariaLabel="Nombre del elemento" value={element.name} onCommit={(name) => run(() => updateElement(areaId, element.name, { name }))} />
        <button
          type="button"
          className="icon-btn danger"
          aria-label={`Eliminar elemento ${element.name}`}
          onClick={() => confirm(`¿Eliminar "${element.name}" y sus ${element.items.length} puntos?`) && run(() => deleteElement(areaId, element.name))}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <label>
        Especialidad
        <select value={element.trade} onChange={(e) => run(() => updateElement(areaId, element.name, { trade: e.target.value }))}>
          {TRADES.map((t) => <option key={t}>{t}</option>)}
          {!TRADES.includes(element.trade as (typeof TRADES)[number]) && <option>{element.trade}</option>}
        </select>
      </label>

      <div className="field">
        <span className="field-label">Puntos a revisar ({element.items.length})</span>
        <ul className="editor-list">
          {element.items.map((item) => (
            <li key={item.id} className="editor-row">
              <CommitInput ariaLabel="Texto del punto" value={item.text} onCommit={(t) => run(() => updateItem(areaId, element.name, item.id, t))} />
              <button
                type="button"
                className="icon-btn danger"
                aria-label={`Eliminar punto ${item.text}`}
                onClick={() => confirm(`¿Eliminar el punto "${item.text}"?`) && run(() => deleteItem(areaId, element.name, item.id))}
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
        <div className="editor-row">
          <input
            value={text}
            placeholder="Nuevo punto a revisar"
            aria-label={`Nuevo punto para ${element.name}`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <button type="button" className="icon-btn add" aria-label="Agregar punto" disabled={!text.trim()} onClick={add}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      <label>
        Tipos de defecto frecuentes (separados por coma)
        <CommitInput
          allowEmpty
          value={element.defects.join(', ')}
          onCommit={(v) => run(() => updateElement(areaId, element.name, { defects: v.split(',').map((d) => d.trim()).filter(Boolean) }))}
        />
      </label>
    </section>
  )
}
