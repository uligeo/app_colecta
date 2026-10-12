import { House, Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { autoBackup } from '../lib/backupTargets'

export interface SavedState {
  saved: string
}

export function HomeButton({ className = 'btn' }: { className?: string }) {
  return (
    <Link to="/" className={className}>
      <House size={18} /> Inicio
    </Link>
  )
}

interface SaveButtonProps {
  label?: string
  className?: string
}

/**
 * Confirma el guardado de la inspección (los cambios ya se escriben en el dispositivo al capturar),
 * intenta un respaldo en los destinos autorizados y regresa a Inicio.
 */
export function SaveInspectionButton({ label = 'Guardar inspección', className = 'btn' }: SaveButtonProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    // Permite que los campos con borrador terminen de escribir al perder el foco.
    await new Promise((r) => setTimeout(r, 50))
    await autoBackup().catch(() => undefined)
    const state: SavedState = { saved: 'Inspección guardada en este dispositivo.' }
    navigate('/', { state })
  }

  return (
    <button type="button" className={className} onClick={save} disabled={busy}>
      <Save size={18} /> {label}
    </button>
  )
}
