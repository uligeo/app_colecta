import { useState } from 'react'
import { Logo } from '../components/Logo'
import { setSetting } from '../db/settings'

/** Primera ejecución: presentación y creación del perfil local del inspector. */
export function Welcome() {
  const [step, setStep] = useState<'intro' | 'perfil'>('intro')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await setSetting('profile', { name: name.trim(), company: company.trim() })
  }

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <Logo size={72} className="logo-hero" />
        <p className="welcome-tagline">Inspección y seguimiento de viviendas para constructoras e inmobiliarias</p>
      </div>
      {step === 'intro' ? (
        <div className="welcome-actions">
          <button className="btn primary block" onClick={() => setStep('perfil')}>
            Comenzar
          </button>
          <p className="welcome-note">Funciona sin internet. Tus datos se guardan en este dispositivo.</p>
        </div>
      ) : (
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
        </form>
      )}
      <p className="welcome-footer">Calidad · Seguridad · Tranquilidad</p>
    </div>
  )
}
