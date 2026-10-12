import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { LegalDocs } from '../components/LegalDocs'
import type { LegalDoc } from '../legal/documents'
import { useLegalAcceptance } from '../db/settings'

export function Legal() {
  const initial = (useSearchParams()[0].get('doc') as LegalDoc | null) ?? 'privacidad'
  const accepted = useLegalAcceptance()
  return (
    <>
      <AppHeader title="Privacidad y términos" back="/mas" />
      <div className="content">
        <LegalDocs initial={initial} />
        {accepted && (
          <p className="muted small center">
            Aceptados el {new Date(accepted.acceptedAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}.
          </p>
        )}
      </div>
    </>
  )
}
