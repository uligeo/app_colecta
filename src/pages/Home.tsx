import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CheckCircle2, ClipboardList, CloudUpload, FileText, ListTodo, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { SavedState } from '../components/InspectionActions'
import { InspectionCard } from '../components/InspectionCard'
import { Logo } from '../components/Logo'
import { inspectionStatus, isOpen, isOverdue } from '../db/actions'
import { db } from '../db/schema'
import { useBackupSettings, useProfile } from '../db/settings'
import { timeAgo } from '../lib/time'

const STALE_DAYS = 3

export function Home() {
  const profile = useProfile()
  const backup = useBackupSettings()
  const [now] = useState(Date.now)
  const location = useLocation()
  const navigate = useNavigate()
  const [saved] = useState(() => (location.state as SavedState | null)?.saved ?? '')

  useEffect(() => {
    // Limpia el aviso del historial para que no reaparezca al recargar.
    if (location.state) navigate('.', { replace: true, state: null })
  }, [location.state, navigate])
  const data = useLiveQuery(async () => {
    const [walks, snags, houses, projects] = await Promise.all([
      db.walks.orderBy('date').reverse().toArray(),
      db.snags.toArray(),
      db.houses.toArray(),
      db.projects.toArray(),
    ])
    return {
      walks: walks.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5),
      snags,
      houses: new Map(houses.map((h) => [h.id, h])),
      projects: new Map(projects.map((p) => [p.id, p])),
    }
  })

  if (!data) return null

  const open = data.snags.filter(isOpen)
  const overdue = open.filter((s) => isOverdue(s)).length
  const toVerify = open.filter((s) => s.status === 'corregida').length
  const lastBackup = Math.max(backup?.driveAt ?? 0, backup?.localAt ?? 0)
  const stale = data.snags.length > 0 && now - lastBackup > STALE_DAYS * 86_400_000

  return (
    <>
      <header className="home-header">
        <Logo size={30} />
      </header>
      <div className="content">
        {saved && (
          <p className="toast" role="status">
            <CheckCircle2 size={16} /> {saved}
          </p>
        )}
        <h1 className="screen-title">Hola{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}</h1>

        <div className="tiles">
          <Link to="/inspecciones/nueva" className="tile">
            <span className="tile-icon primary"><Plus size={22} strokeWidth={2.5} /></span>
            Nueva inspección
          </Link>
          <Link to="/inspecciones" className="tile">
            <span className="tile-icon"><ClipboardList size={24} /></span>
            Mis inspecciones
          </Link>
          <Link to="/pendientes" className="tile">
            <span className="tile-icon">
              <ListTodo size={24} />
              {open.length > 0 && <span className="tile-badge">{open.length}</span>}
            </span>
            Pendientes
          </Link>
          <Link to="/respaldo" className="tile">
            <span className="tile-icon"><CloudUpload size={24} /></span>
            Respaldo
            <small>{lastBackup ? timeAgo(lastBackup) : 'Sin respaldo'}</small>
          </Link>
        </div>

        {stale && (
          <Link to="/respaldo" className="banner warn">
            <AlertTriangle size={18} />
            {lastBackup ? `Último respaldo ${timeAgo(lastBackup)}.` : 'Aún no has respaldado tu información.'} Guarda un respaldo en este equipo.
          </Link>
        )}

        {open.length > 0 && (
          <div className="kpis">
            <Link to="/pendientes"><b>{open.length}</b> pendientes</Link>
            <Link to="/pendientes?estado=vencidas" className={overdue ? 'alert' : ''}><b>{overdue}</b> vencidos</Link>
            <Link to="/pendientes?estado=corregida"><b>{toVerify}</b> por verificar</Link>
          </div>
        )}

        <div className="section-head">
          <h2>Inspecciones recientes</h2>
          <Link to="/inspecciones">Ver todas</Link>
        </div>
        {data.walks.length === 0 ? (
          <div className="empty-card">
            <FileText size={28} />
            <p>Aún no hay inspecciones. Toca <b>Nueva inspección</b> para comenzar.</p>
          </div>
        ) : (
          <ul className="list">
            {data.walks.map((w) => {
              const house = data.houses.get(w.houseId)
              const mine = data.snags.filter((s) => s.walkId === w.id)
              return (
                <InspectionCard
                  key={w.id}
                  walk={w}
                  house={house}
                  project={house ? data.projects.get(house.projectId) : undefined}
                  status={inspectionStatus(w, data.snags)}
                  findings={mine.length}
                  firstSnagId={mine[0]?.id}
                />
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
