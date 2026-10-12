import { ClipboardList, FileText, Home, ListTodo, MoreHorizontal } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/inspecciones', label: 'Inspecciones', icon: ClipboardList, end: false },
  { to: '/pendientes', label: 'Pendientes', icon: ListTodo, end: false },
  { to: '/reportes', label: 'Reportes', icon: FileText, end: false },
  { to: '/mas', label: 'Más', icon: MoreHorizontal, end: false },
]

/** Pantallas principales con barra de pestañas inferior (lateral en escritorio). */
export function TabLayout() {
  return (
    <div className="tab-shell">
      <nav className="tabbar no-print" aria-label="Principal">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="screen">
        <Outlet />
      </main>
    </div>
  )
}

/** Pantallas de flujo (asistente, detalle) sin barra de pestañas. */
export function FlowLayout() {
  return (
    <main className="screen flow">
      <Outlet />
    </main>
  )
}
