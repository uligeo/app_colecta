import { LogIn, UserPen } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../components/Logo'
import { saveProfile, setSessionActive, type Profile } from '../db/settings'
import { LegalGate } from './LegalGate'

type Step = 'intro' | 'legal' | 'perfil'

/** Al entrar se muestra siempre Inicio, no la última pantalla que quedó abierta. */
function goHome() {
  window.location.hash = '#/'
}

/**
 * Pantalla de entrada. En la primera ejecución pide aceptar los términos y crear el perfil local;
 * tras usar Salir (`returning`) permite continuar con el perfil guardado o cambiarlo.
 */
export function Welcome({ returning }: { returning?: Profile }) {
  const [step, setStep] = useState<Step>('intro')
  const [name, setName] = useState(returning?.name ?? '')
  const [company, setCompany] = useState(returning?.company ?? '')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    goHome()
    await saveProfile(name.trim(), company.trim())
  }

  if (step === 'legal') return <LegalGate onAccepted={() => setStep('perfil')} />

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <Logo size={72} className="logo-hero" />
        <p className="welcome-tagline">Inspección y seguimiento de viviendas para constructoras e inmobiliarias</p>
      </div>
      {step === 'perfil' ? (
        <form className="welcome-form" onSubmit={save}>
          <label>
            Tu nombre *
            <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Carlos Mendoza" />
          </label>
          <label>
            Empresa
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Constructora ABC" />
          </label>
          <button className="btn primary block">Continuar</button>
          {returning && (
            <button type="button" className="btn ghost block welcome-link" onClick={() => setStep('intro')}>
              Volver
            </button>
          )}
        </form>
      ) : returning ? (
        <div className="welcome-actions">
          <button
            className="btn primary block"
            onClick={() => {
              goHome()
              setSessionActive(true)
            }}
          >
            <LogIn size={18} /> Continuar como {returning.name}
          </button>
          {returning.company && <p className="welcome-note">{returning.company}</p>}
          <button type="button" className="btn ghost block welcome-link" onClick={() => setStep('perfil')}>
            <UserPen size={18} /> Usar otro nombre
          </button>
        </div>
      ) : (
        <div className="welcome-actions">
          <button className="btn primary block" onClick={() => setStep('legal')}>
            Comenzar
          </button>
          <p className="welcome-note">Funciona sin internet. Tus datos se guardan en este dispositivo.</p>
        </div>
      )}
      <p className="welcome-footer">Calidad · Seguridad · Tranquilidad</p>
    </div>
  )
}
