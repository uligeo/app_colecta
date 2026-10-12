import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { OPEN_STATUSES } from '../db/actions'
import { db } from '../db/schema'
import { AppHeader } from '../components/AppHeader'

const EMPTY = { name: '', company: '', location: '' }

export function Projects() {
  const projects = useLiveQuery(() => db.projects.orderBy('name').toArray())
  const counts = useLiveQuery(async () => {
    const houses = new Map<number, number>()
    const open = new Map<number, number>()
    await db.houses.each((h) => houses.set(h.projectId, (houses.get(h.projectId) ?? 0) + 1))
    await db.snags.where('status').anyOf(OPEN_STATUSES).each((s) => open.set(s.projectId, (open.get(s.projectId) ?? 0) + 1))
    return { houses, open }
  })
  const [form, setForm] = useState(EMPTY)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await db.projects.add({
      name: form.name.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      createdAt: Date.now(),
    })
    setForm(EMPTY)
  }

  return (
    <>
      <AppHeader title="Desarrollos" back="/mas" />
      <div className="content">
      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          Nombre del desarrollo *
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Constructora / inmobiliaria
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </label>
        <label>
          Ubicación
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </label>
        <button className="btn primary">Agregar desarrollo</button>
      </form>

      {projects?.length === 0 && <p className="empty">No hay desarrollos registrados.</p>}
      <ul className="list">
        {projects?.map((p) => (
          <li key={p.id}>
            <Link to={`/desarrollos/${p.id}`} className="row">
              <div>
                <strong>{p.name}</strong>
                <small>{[p.company, p.location].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</small>
              </div>
              <span className="muted">
                {counts?.houses.get(p.id) ?? 0} viviendas · {counts?.open.get(p.id) ?? 0} pendientes
              </span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </>
  )
}
