import { Building2, ChevronRight, CloudUpload, HardHat, Info, Palette } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { updateProfile, useBrand, useProfile } from '../db/settings'

const LINKS = [
  { to: '/desarrollos', label: 'Desarrollos y viviendas', hint: 'Alta masiva, planos y estado de obra', icon: Building2 },
  { to: '/contratistas', label: 'Contratistas', hint: 'Responsables por especialidad', icon: HardHat },
  { to: '/configuracion', label: 'Configuración', hint: 'Mi firma, nombre de la app, logo y color', icon: Palette },
  { to: '/respaldo', label: 'Respaldo', hint: 'Carpeta local y respaldo de datos', icon: CloudUpload },
]

export function More() {
  const profile = useProfile()
  const brand = useBrand()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', company: '' })

  function startEdit() {
    setForm({ name: profile?.name ?? '', company: profile?.company ?? '' })
    setEditing(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await updateProfile({ name: form.name.trim(), company: form.company.trim() })
    setEditing(false)
  }

  return (
    <>
      <AppHeader title="Más" />
      <div className="content">
        <div className="card profile-card">
          {editing ? (
            <form className="form-stack" onSubmit={save}>
              <label>Nombre *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Empresa<input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
              <div className="actions">
                <button className="btn primary">Guardar</button>
                <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <span className="avatar">{profile?.name?.[0]?.toUpperCase() ?? '?'}</span>
              <div className="finding-main">
                <strong>{profile?.name}</strong>
                <small>{profile?.company || 'Sin empresa'}</small>
              </div>
              <button type="button" className="link-btn" onClick={startEdit}>Editar</button>
            </>
          )}
        </div>
        <ul className="menu-list">
          {LINKS.map(({ to, label, hint, icon: Icon }) => (
            <li key={to}>
              <Link to={to}>
                <Icon size={20} />
                <span><b>{label}</b><small>{hint}</small></span>
                <ChevronRight size={18} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="muted small center">
          <Info size={14} /> {brand.name} v{__APP_VERSION__} · Los datos se guardan en este dispositivo.
        </p>
      </div>
    </>
  )
}
