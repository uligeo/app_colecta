import { useState } from 'react'
import { LegalDocs } from '../components/LegalDocs'
import { Logo } from '../components/Logo'
import { LEGAL_VERSION } from '../legal/documents'
import { setSetting } from '../db/settings'

/** Aceptación obligatoria del aviso de privacidad y los términos antes de usar la app. */
export function LegalGate({ onAccepted, updated = false }: { onAccepted?: () => void; updated?: boolean }) {
  const [checked, setChecked] = useState(false)

  async function accept() {
    await setSetting('legal', { version: LEGAL_VERSION, acceptedAt: Date.now() })
    onAccepted?.()
  }

  return (
    <div className="legal-gate">
      <header className="home-header">
        <Logo size={30} />
      </header>
      <div className="content">
        <h1 className="screen-title">{updated ? 'Actualizamos los términos' : 'Antes de comenzar'}</h1>
        <p className="muted small">
          Lee el aviso de privacidad y los términos de uso. Tus datos se guardan sólo en este dispositivo y la aplicación se
          ofrece sin garantías.
        </p>
        <LegalDocs />
      </div>
      <div className="bottom-actions legal-actions">
        <label className="check-line">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          He leído y acepto el Aviso de privacidad y los Términos de uso y deslinde de responsabilidad.
        </label>
        <button type="button" className="btn primary" disabled={!checked} onClick={accept}>
          Aceptar y continuar
        </button>
      </div>
    </div>
  )
}
