import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AppHeaderProps {
  title: string
  back?: string | true | (() => void)
  right?: React.ReactNode
}

/** Encabezado de pantalla con regreso y título centrado. */
export function AppHeader({ title, back, right }: AppHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="app-header no-print">
      <div className="app-header-side">
        {back && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Regresar"
            onClick={() => (typeof back === 'function' ? back() : back === true ? navigate(-1) : navigate(back))}
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      <h1 className="app-header-title">{title}</h1>
      <div className="app-header-side right">{right}</div>
    </header>
  )
}
