import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { FindingCard } from '../../components/FindingCard'
import { Stepper } from '../../components/Stepper'
import { changeStatus, isOpen } from '../../db/actions'
import { PRIORITY_LABEL, type Priority, type Snag } from '../../db/schema'
import { currentUser } from '../../db/settings'
import { useInspection } from './useInspection'
import { SaveInspectionButton } from '../../components/InspectionActions'

type Tab = 'todos' | Priority

/** Paso 3: hallazgos de la inspección y verificación de correcciones previas. */
export function FindingsStep() {
  const walkId = Number(useParams().id)
  const navigate = useNavigate()
  const data = useInspection(walkId)
  const [tab, setTab] = useState<Tab>('todos')

  if (data === undefined) return null
  if (data === null) return <p className="empty">Inspección no encontrada.</p>

  const { snags, houseSnags, walk } = data
  const visible = snags.filter((s) => tab === 'todos' || s.priority === tab)
  const toVerify = houseSnags.filter((s) => s.status === 'corregida' && s.walkId !== walkId)
  const previousOpen = houseSnags.filter((s) => isOpen(s) && s.status !== 'corregida' && s.walkId !== walkId)

  async function verify(s: Snag, ok: boolean) {
    const by = await currentUser()
    if (ok) return changeStatus(s.id, 'cerrada', 'Verificado en inspección', by)
    const note = prompt(`Motivo del rechazo del hallazgo #${s.number}:`)?.trim()
    if (note) await changeStatus(s.id, 'abierta', note, by)
  }

  return (
    <div className="wizard">
      <AppHeader title="Hallazgos" back={`/inspecciones/${walkId}/checklist`} right={<SaveInspectionButton label="Guardar" className="header-btn" />} />
      <Stepper current={3} walkId={walkId} />
      <div className="tabs" role="tablist">
        {(['todos', 'alta', 'media', 'baja'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`${tab === t ? 'active' : ''} tab-${t}`} onClick={() => setTab(t)}>
            {t === 'todos' ? 'Todos' : PRIORITY_LABEL[t]} ({t === 'todos' ? snags.length : snags.filter((s) => s.priority === t).length})
          </button>
        ))}
      </div>
      <div className="content">
        {visible.length === 0 && (
          <p className="empty">
            {snags.length === 0 ? 'Sin hallazgos registrados. Agrégalos desde el checklist o con el botón +.' : 'Sin hallazgos de esta severidad.'}
          </p>
        )}
        <ul className="list">
          {visible.map((s) => (
            <FindingCard key={s.id} snag={s} />
          ))}
        </ul>

        {toVerify.length > 0 && (
          <>
            <h2>Correcciones por verificar ({toVerify.length})</h2>
            <p className="muted small">Hallazgos de inspecciones anteriores que el contratista reporta como corregidos.</p>
            <ul className="list">
              {toVerify.map((s) => (
                <li key={s.id} className="verify-row">
                  <Link to={`/hallazgos/${s.id}`}>
                    #{s.number} {s.description}
                  </Link>
                  <div className="actions tight">
                    <button type="button" className="btn primary sm" onClick={() => verify(s, true)}>Cerrar</button>
                    <button type="button" className="btn danger sm" onClick={() => verify(s, false)}>Rechazar</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {previousOpen.length > 0 && (
          <>
            <h2>Pendientes anteriores ({previousOpen.length})</h2>
            <ul className="list">
              {previousOpen.map((s) => (
                <FindingCard key={s.id} snag={s} />
              ))}
            </ul>
          </>
        )}
      </div>
      {!walk.finalizedAt && (
        <Link to={`/inspecciones/${walkId}/hallazgo`} className="fab above-actions" aria-label="Agregar hallazgo">
          <Plus size={28} />
        </Link>
      )}
      <div className="bottom-actions">
        <button type="button" className="btn" onClick={() => navigate(`/inspecciones/${walkId}/checklist`)}>Atrás</button>
        <button type="button" className="btn primary" onClick={() => navigate(`/inspecciones/${walkId}/revisar`)}>Siguiente</button>
      </div>
    </div>
  )
}
