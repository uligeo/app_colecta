import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isOverdue } from '../db/actions'
import { TRADES } from '../db/catalog'
import { db, type Contractor } from '../db/schema'
import { whatsappLink } from '../lib/whatsapp'
import { AppHeader } from '../components/AppHeader'

const EMPTY = { name: '', trade: TRADES[0] as string, phone: '', email: '' }

export function Contractors() {
  const data = useLiveQuery(async () => {
    const [contractors, snags, houses] = await Promise.all([
      db.contractors.orderBy('name').toArray(),
      db.snags.where('status').anyOf('abierta', 'en_proceso').toArray(),
      db.houses.toArray(),
    ])
    return { contractors, snags, houseCode: new Map(houses.map((h) => [h.id, h.code])) }
  })
  const [form, setForm] = useState(EMPTY)

  if (!data) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await db.contractors.add({ ...form, name: form.name.trim() })
    setForm(EMPTY)
  }

  async function handleDelete(c: Contractor) {
    if (!confirm(`¿Eliminar a ${c.name}? Sus hallazgos quedarán sin asignar.`)) return
    await db.transaction('rw', db.contractors, db.snags, async () => {
      await db.snags.where('contractorId').equals(c.id).modify({ contractorId: null })
      await db.contractors.delete(c.id)
    })
  }

  function summary(c: Contractor): string {
    const list = data!.snags.filter((s) => s.contractorId === c.id)
    const lines = list.map((s) => `- ${data!.houseCode.get(s.houseId) ?? ''} #${s.number}: ${s.description} (${s.location || 'N/D'}) compromiso ${s.dueDate || 'N/D'}`)
    return `Pendientes asignados a ${c.name} (${list.length}):\n${lines.join('\n')}`
  }

  const unassigned = data.snags.filter((s) => s.contractorId === null).length

  return (
    <>
      <AppHeader title="Contratistas" back="/mas" />
      <div className="content">
      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          Nombre / empresa *
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Especialidad
          <select value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })}>
            {TRADES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Teléfono / WhatsApp
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Correo
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <button className="btn primary">Agregar contratista</button>
      </form>

      {unassigned > 0 && (
        <p className="toast warn">
          Hay {unassigned} hallazgos abiertos sin asignar.{' '}
          <Link to="/pendientes?contratista=sin">Asignarlas</Link> ·{' '}
          <Link to="/contratistas/sin-asignar/reporte">Ver lista</Link>
        </p>
      )}

      {data.contractors.length === 0 && <p className="empty">No hay contratistas registrados.</p>}
      <ul className="list">
        {data.contractors.map((c) => {
          const mine = data.snags.filter((s) => s.contractorId === c.id)
          const late = mine.filter((s) => isOverdue(s)).length
          return (
            <li key={c.id} className="card contractor">
              <div>
                <strong>{c.name}</strong>
                <small className="muted">{[c.trade, c.phone, c.email].filter(Boolean).join(' · ')}</small>
                <small>
                  {mine.length} pendientes{late > 0 && <b className="r-falla"> · {late} vencidas</b>}
                </small>
              </div>
              <div className="actions tight">
                <Link className="btn" to={`/pendientes?contratista=${c.id}`}>
                  Ver
                </Link>
                <Link className="btn" to={`/contratistas/${c.id}/reporte`}>
                  Lista imprimible
                </Link>
                {c.phone && mine.length > 0 && (
                  <a className="btn" href={whatsappLink(c.phone, summary(c))} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
                <button className="btn danger" onClick={() => handleDelete(c)}>
                  Eliminar
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      </div>
    </>
  )
}
