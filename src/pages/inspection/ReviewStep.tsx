import { CheckCircle2, Eye, PenLine } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { DraftField } from '../../components/DraftField'
import { SignaturePad } from '../../components/SignaturePad'
import { Stepper } from '../../components/Stepper'
import { checklistProgress, deleteWalk } from '../../db/actions'
import { db, type Walk } from '../../db/schema'
import { useCatalog } from '../../db/checklistStore'
import { updateProfile, useProfile } from '../../db/settings'
import { autoBackup } from '../../lib/backupTargets'
import { autoExportInspection } from '../../lib/inspectionExport'
import { useInspection } from './useInspection'
import { SaveInspectionButton } from '../../components/InspectionActions'

/** Paso 4: resumen, observaciones finales, firma del cliente y cierre. */
export function ReviewStep() {
  const walkId = Number(useParams().id)
  const navigate = useNavigate()
  const data = useInspection(walkId)
  const profile = useProfile()
  const catalog = useCatalog()

  if (data === undefined) return null
  if (data === null) return <p className="empty">Inspección no encontrada.</p>

  const { walk, snags, house } = data
  const save = (patch: Partial<Walk>) => db.walks.update(walkId, patch)
  const progress = checklistProgress(walk, snags, catalog)
  const count = (p: string) => snags.filter((s) => s.priority === p).length
  const finalized = !!walk.finalizedAt
  const canFinish = walk.confirmed && !!walk.signature && !!walk.signedBy.trim()

  async function finish() {
    await save({ finalizedAt: Date.now() })
    autoBackup().catch(() => undefined)
    autoExportInspection(walkId).catch(() => undefined)
    navigate(`/inspecciones/${walkId}/reporte`)
  }

  async function remove() {
    if (!confirm('¿Eliminar esta inspección? Los hallazgos se conservan en la vivienda.')) return
    await deleteWalk(walkId)
    navigate(`/viviendas/${walk.houseId}`)
  }

  return (
    <div className="wizard">
      <AppHeader title="Firma y cierre" back={`/inspecciones/${walkId}/hallazgos`} right={<SaveInspectionButton label="Guardar" className="header-btn" />} />
      <Stepper current={4} walkId={walkId} />
      <div className="content form-stack">
        <div className="summary-tiles">
          <div className="sum total"><b>{snags.length}</b>Total</div>
          <div className="sum alta"><b>{count('alta')}</b>Alta</div>
          <div className="sum media"><b>{count('media')}</b>Media</div>
          <div className="sum baja"><b>{count('baja')}</b>Baja</div>
        </div>
        <p className="muted small">
          {house?.code} · Checklist {progress.done}/{progress.total} puntos revisados
        </p>
        <button type="button" className="btn soft block" onClick={() => navigate(`/inspecciones/${walkId}/reporte`)}>
          <Eye size={18} /> Vista previa del reporte
        </button>

        <label>
          Observaciones finales
          <DraftField multiline value={walk.notes} onCommit={(notes) => save({ notes })} placeholder="Resumen general de la inspección" />
        </label>

        <div className="field">
          <span className="field-label">Firma del inspector{walk.inspector ? ` · ${walk.inspector}` : ''}</span>
          <SignaturePad value={walk.inspectorSignature} onChange={(inspectorSignature) => save({ inspectorSignature })} />
          <div className="actions tight">
            {profile?.signature && walk.inspectorSignature !== profile.signature && (
              <button type="button" className="btn soft sm" onClick={() => save({ inspectorSignature: profile.signature })}>
                <PenLine size={16} /> Usar mi firma guardada
              </button>
            )}
            {walk.inspectorSignature && walk.inspectorSignature !== profile?.signature && (
              <button type="button" className="btn ghost sm" onClick={() => updateProfile({ signature: walk.inspectorSignature })}>
                Guardar como mi firma
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Firma del cliente</span>
          <SignaturePad value={walk.signature} onChange={(signature) => save({ signature })} />
        </div>
        <label>
          Nombre de quien firma
          <DraftField value={walk.signedBy} onCommit={(signedBy) => save({ signedBy })} />
        </label>
        <label className="check-line">
          <input type="checkbox" checked={walk.confirmed} onChange={(e) => save({ confirmed: e.target.checked })} />
          Confirmo que he recibido el reporte y conozco los hallazgos identificados.
        </label>

        {finalized && (
          <p className="toast">
            <CheckCircle2 size={16} /> Inspección finalizada el {new Date(walk.finalizedAt!).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}.
          </p>
        )}
        <div className="actions">
          {finalized && <button type="button" className="btn ghost" onClick={() => save({ finalizedAt: null })}>Reabrir inspección</button>}
          <button type="button" className="btn ghost danger-text" onClick={remove}>Eliminar inspección</button>
        </div>
      </div>
      <div className="bottom-actions">
        <button type="button" className="btn" onClick={() => navigate(`/inspecciones/${walkId}/hallazgos`)}>Atrás</button>
        {finalized ? (
          <button type="button" className="btn primary" onClick={() => navigate(`/inspecciones/${walkId}/reporte`)}>Ver reporte</button>
        ) : (
          <button type="button" className="btn success" disabled={!canFinish} onClick={finish} title={canFinish ? '' : 'Requiere firma, nombre y confirmación'}>
            Finalizar inspección
          </button>
        )}
      </div>
    </div>
  )
}
