import { PRIORITY_LABEL, type Priority } from '../db/schema'

const ORDER: Priority[] = ['alta', 'media', 'baja']

export function SeverityPill({ value }: { value: Priority }) {
  return (
    <span className={`sev-pill sev-${value}`}>
      <span className="sev-dot" />
      {PRIORITY_LABEL[value]}
    </span>
  )
}

interface SeverityPickerProps {
  value: Priority
  onChange: (value: Priority) => void
}

export function SeverityPicker({ value, onChange }: SeverityPickerProps) {
  return (
    <div className="sev-picker" role="radiogroup" aria-label="Severidad">
      {ORDER.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          className={`sev-option sev-${p} ${value === p ? 'selected' : ''}`}
          onClick={() => onChange(p)}
        >
          <span className="sev-dot" />
          {PRIORITY_LABEL[p]}
        </button>
      ))}
    </div>
  )
}
