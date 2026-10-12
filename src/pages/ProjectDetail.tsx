import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { deleteProject, isOpen, isOverdue } from '../db/actions'
import { db, HOUSE_STATUS_LABEL, type HouseStatus } from '../db/schema'
import { compressImage } from '../lib/image'
import { AppHeader } from '../components/AppHeader'

const EMPTY = { code: '', model: '', address: '', ownerName: '', ownerPhone: '' }
const BULK = { prefix: 'Mz 1 Lt ', from: 1, to: 10, model: '' }

export function ProjectDetail() {
  const projectId = Number(useParams().id)
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const project = await db.projects.get(projectId)
    if (!project) return null
    const [houses, snags, plans] = await Promise.all([
      db.houses.where('projectId').equals(projectId).toArray(),
      db.snags.where('projectId').equals(projectId).toArray(),
      db.plans.where('projectId').equals(projectId).toArray(),
    ])
    houses.sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }))
    return { project, houses, snags, plans }
  }, [projectId])
  const [form, setForm] = useState(EMPTY)
  const [bulk, setBulk] = useState(BULK)
  const [showBulk, setShowBulk] = useState(false)
  const [planName, setPlanName] = useState('')
  const [filter, setFilter] = useState<HouseStatus | 'todas' | 'pendientes'>('todas')
  const [query, setQuery] = useState('')

  if (data === undefined) return null
  if (data === null) return <p className="empty">Desarrollo no encontrado.</p>

  const { project, houses, snags, plans } = data
  const base = { projectId, address: '', ownerName: '', ownerPhone: '', status: 'en_construccion' as const, type: 'casa' as const, surface: null, photo: null }

  async function addHouse(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) return
    await db.houses.add({ ...base, ...form, code: form.code.trim(), createdAt: Date.now() })
    setForm(EMPTY)
  }

  async function addBulk(e: React.FormEvent) {
    e.preventDefault()
    const existing = new Set(houses.map((h) => h.code))
    const codes = Array.from({ length: Math.max(0, bulk.to - bulk.from + 1) }, (_, i) => `${bulk.prefix}${bulk.from + i}`.trim())
    const fresh = codes.filter((c) => !existing.has(c))
    if (fresh.length > 500) return alert('Máximo 500 viviendas por alta masiva.')
    if (!confirm(`Se crearán ${fresh.length} viviendas. ¿Continuar?`)) return
    const now = Date.now()
    await db.houses.bulkAdd(fresh.map((code) => ({ ...base, code, model: bulk.model, createdAt: now })))
    setShowBulk(false)
  }

  async function addPlan(file: File | undefined) {
    if (!file) return
    await db.plans.add({ projectId, name: planName.trim() || file.name, blob: await compressImage(file, 2400), createdAt: Date.now() })
    setPlanName('')
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${project.name}" con todas sus viviendas, planos y hallazgos?`)) return
    await deleteProject(projectId)
    navigate('/desarrollos')
  }

  const openByHouse = new Map<number, { open: number; late: number }>()
  for (const s of snags.filter(isOpen)) {
    const entry = openByHouse.get(s.houseId) ?? { open: 0, late: 0 }
    entry.open += 1
    if (isOverdue(s)) entry.late += 1
    openByHouse.set(s.houseId, entry)
  }

  const q = query.trim().toLowerCase()
  const visible = houses.filter((h) => {
    if (filter === 'pendientes' && !openByHouse.has(h.id)) return false
    if (filter !== 'todas' && filter !== 'pendientes' && h.status !== filter) return false
    return !q || `${h.code} ${h.ownerName} ${h.model}`.toLowerCase().includes(q)
  })

  return (
    <>
      <AppHeader title={project.name} back="/desarrollos" />
      <div className="content">
      <p className="muted">{[project.company, project.location].filter(Boolean).join(' · ')}</p>

      <div className="stats compact">
        <div className="stat"><span className="stat-value">{houses.length}</span><span className="stat-label">Viviendas</span></div>
        <div className="stat"><span className="stat-value">{snags.filter(isOpen).length}</span><span className="stat-label">Pendientes</span></div>
        <div className="stat"><span className="stat-value">{houses.length - openByHouse.size}</span><span className="stat-label">Sin pendientes</span></div>
        <div className="stat"><span className="stat-value">{snags.filter((s) => s.status === 'cerrada').length}</span><span className="stat-label">Cerradas</span></div>
      </div>

      <h2>Viviendas</h2>
      <div className="toolbar">
        <input type="search" placeholder="Buscar clave, propietario o modelo" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="todas">Todas</option>
          <option value="pendientes">Con pendientes</option>
          {Object.entries(HOUSE_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {visible.length === 0 && <p className="empty">Sin viviendas para mostrar.</p>}
      <ul className="list">
        {visible.map((h) => {
          const o = openByHouse.get(h.id)
          return (
            <li key={h.id}>
              <Link to={`/viviendas/${h.id}`} className="row">
                <div>
                  <strong>{h.code}</strong>
                  <small>{[h.model, h.ownerName].filter(Boolean).join(' · ') || HOUSE_STATUS_LABEL[h.status]}</small>
                </div>
                <div className="row-badges">
                  {o?.late ? <Badge tone="vencida">{o.late} vencidas</Badge> : null}
                  {o ? <Badge tone="abierta">{o.open} pendientes</Badge> : <Badge tone="cerrada">Sin pendientes</Badge>}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <details className="card">
        <summary>Agregar vivienda</summary>
        <form className="form-grid" onSubmit={addHouse}>
          <label>Clave (manzana / lote) *<input required placeholder="Mz 3 Lt 12" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
          <label>Prototipo / modelo<input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
          <label>Dirección<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>Propietario<input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></label>
          <label>Teléfono<input type="tel" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} /></label>
          <button className="btn primary">Agregar</button>
        </form>
        <button type="button" className="btn ghost" onClick={() => setShowBulk(!showBulk)}>
          {showBulk ? 'Ocultar alta masiva' : 'Alta masiva por lotes'}
        </button>
        {showBulk && (
          <form className="form-grid" onSubmit={addBulk}>
            <label>Prefijo<input value={bulk.prefix} onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })} /></label>
            <label>Del lote<input type="number" min={0} value={bulk.from} onChange={(e) => setBulk({ ...bulk, from: Number(e.target.value) })} /></label>
            <label>Al lote<input type="number" min={0} value={bulk.to} onChange={(e) => setBulk({ ...bulk, to: Number(e.target.value) })} /></label>
            <label>Modelo<input value={bulk.model} onChange={(e) => setBulk({ ...bulk, model: e.target.value })} /></label>
            <button className="btn primary">Crear viviendas</button>
          </form>
        )}
      </details>

      <details className="card">
        <summary>Planos del desarrollo ({plans.length})</summary>
        <p className="muted">Sube imágenes (JPG o PNG) de las plantas por prototipo para marcar hallazgos sobre ellas.</p>
        <ul className="list">
          {plans.map((p) => (
            <li key={p.id} className="row">
              <span>{p.name}</span>
              <button className="btn danger" onClick={() => confirm(`¿Eliminar el plano ${p.name}?`) && db.plans.delete(p.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
        <div className="form-grid">
          <label>Nombre del plano<input placeholder="Prototipo A · Planta baja" value={planName} onChange={(e) => setPlanName(e.target.value)} /></label>
          <label className="btn">
            Subir plano
            <input type="file" accept="image/*" hidden onChange={(e) => addPlan(e.target.files?.[0])} />
          </label>
        </div>
      </details>

      <div className="actions">
        <Link className="btn" to={`/pendientes?desarrollo=${projectId}`}>Ver hallazgos del desarrollo</Link>
        <button className="btn danger" onClick={handleDelete}>Eliminar desarrollo</button>
      </div>
      </div>
    </>
  )
}
