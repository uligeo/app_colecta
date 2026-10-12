import { useState } from 'react'

interface CommitInputProps {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  allowEmpty?: boolean
}

/** Campo que guarda al salir o con Enter; Escape descarta. Evita guardar nombres a medio escribir. */
export function CommitInput({ value, onCommit, placeholder, ariaLabel, allowEmpty }: CommitInputProps) {
  const [draft, setDraft] = useState(value)
  const [source, setSource] = useState(value)

  // Si el valor guardado cambia desde fuera, se refleja en el campo.
  if (value !== source) {
    setSource(value)
    setDraft(value)
  }

  function commit() {
    const next = draft.trim()
    if (next === value) return
    if (!next && !allowEmpty) return setDraft(value)
    onCommit(next)
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(value)
      }}
    />
  )
}
