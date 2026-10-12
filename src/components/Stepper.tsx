import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

const STEPS = [
  { label: 'Vivienda', path: 'vivienda' },
  { label: 'Checklist', path: 'checklist' },
  { label: 'Hallazgos', path: 'hallazgos' },
  { label: 'Revisar', path: 'revisar' },
]

interface StepperProps {
  current: number
  walkId?: number
}

/** Indicador de los cuatro pasos de una inspección; navegable cuando ya existe. */
export function Stepper({ current, walkId }: StepperProps) {
  return (
    <ol className="stepper no-print">
      {STEPS.map((s, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'active' : ''
        const dot = <span className="step-dot">{n < current ? <Check size={14} strokeWidth={3} /> : n}</span>
        return (
          <li key={s.path} className={`step ${state}`}>
            {walkId ? <Link to={`/inspecciones/${walkId}/${s.path}`}>{dot}</Link> : dot}
            <span className="step-label">{s.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
