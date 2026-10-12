import { useEffect, useRef, useState } from 'react'

interface DraftFieldProps {
  value: string
  onCommit: (value: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
}

const DELAY_MS = 400

/**
 * Campo de texto con borrador local: escribe en IndexedDB con retardo y al perder
 * el foco, evitando saltos de cursor mientras la consulta reactiva se actualiza.
 */
export function DraftField({ value, onCommit, multiline, placeholder, className }: DraftFieldProps) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<string | null>(null)
  const commitRef = useRef(onCommit)

  useEffect(() => {
    commitRef.current = onCommit
  })

  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])

  function flush() {
    window.clearTimeout(timer.current)
    if (pending.current !== null) {
      commitRef.current(pending.current)
      pending.current = null
    }
  }

  useEffect(() => flush, [])

  function handleChange(next: string) {
    setDraft(next)
    pending.current = next
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, DELAY_MS)
  }

  const props = {
    value: draft,
    placeholder,
    className,
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false
      flush()
    },
  }

  return multiline ? (
    <textarea {...props} onChange={(e) => handleChange(e.target.value)} />
  ) : (
    <input {...props} onChange={(e) => handleChange(e.target.value)} />
  )
}
