import { useLiveQuery } from 'dexie-react-hooks'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Badge } from '../components/Badge'
import { PhotoStrip } from '../components/PhotoStrip'
import { SeverityPill } from '../components/Severity'
import { SnagForm } from '../components/SnagForm'
import { changeStatus, deleteSnag, formatDate, isOverdue, TRANSITIONS, type SnagInput } from '../db/actions'
import { areaName } from '../db/catalog'
import { useCatalog } from '../db/checklistStore'
import { db, SNAG_STATUS_LABEL, type Snag } from '../db/schema'
import { currentUser } from '../db/settings'
import { whatsappLink } from '../lib/whatsapp'

function pickInput(s: Snag): SnagInput {
  const { area, element, checkItem, defectType, location, trade, description, priority, contractorId, dueDate, pin } = s
  return { area, element, checkItem, defectType, location, trade, description, priority, contractorId, dueDate, pin }
}

/** Detalle y seguimiento de un hallazgo hasta su cierre. */
export function SnagPage() {
  const snagId = Number(useParams().id)
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const snag = await db.snags.get(snagId)
    if (!snag) return null
    const [house, project, contractor] = await Promise.all([
      db.houses.get(snag.houseId),
      db.projects.get(snag.projectId),
      snag.contractorId ? db.contractors.get(snag.contractorId) : undefined,
    ])
    return { snag, house, project, contractor }
  }, [snagId])
  const catalog = useCatalog()
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState(false)
  const [draft, setDraft] = useState<SnagInput | null>(null)

  if (data === undefined) return null
  if (data === null) return <p className="empty">Hallazgo no encontrado.</p>

  const { snag, house, project, contractor } = data
  const form = draft ?? pickInput(snag)

  async function transition(to: Snag['status'], needsNote?: boolean) {
    if (needsNote && !note.trim()) return setNoteError(true)
    await changeStatus(snagId, to, note.trim(), await currentUser())
    setNote('')
    setNoteError(false)
  }

  async function saveDraft() {
    if (!draft || !draft.description.trim()) return
    await db.snags.update(snagId, { ...draft, updatedAt: Date.now() })
    setDraft(null)
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el hallazgo #${snag.number}?`)) return
    await deleteSnag(snagId)
    navigate(-1)
  }

  const message = [
    `${project?.name ?? ''} · ${house?.code ?? ''}`,
    `Hallazgo #${snag.number}: ${snag.description}`,
    `Ubicación: ${[snag.area && areaName(catalog, snag.area), snag.element, snag.location].filter(Boolean).join(' · ') || 'N/D'}`,
    `Fecha compromiso: ${formatDate(snag.dueDate)}`,
  ].join('\n')

  return (
    <>
      <AppHeader title={`Hallazgo #${snag.number}`} back={true} />
      <div className="content">
        <p className="crumbs">
          <Link to={`/desarrollos/${snag.projectId}`}>{project?.name}</Link> · <Link to={`/viviendas/${snag.houseId}`}>{house?.code}</Link>
        </p>
        <h2 className="detail-title">{snag.description}</h2>
        <div className="finding-meta">
          <SeverityPill value={snag.priority} />
          <Badge tone={snag.status}>{SNAG_STATUS_LABEL[snag.status]}</Badge>
          {isOverdue(snag) && <Badge tone="vencida">Vencido</Badge>}
        </div>
        <p className="muted small">
          {[snag.area && areaName(catalog, snag.area), snag.element, snag.location].filter(Boolean).join(' · ')}
        </p>

        <div className="card">
          <h3>Seguimiento</h3>
          <label>
            Comentario {TRANSITIONS[snag.status].some((t) => t.needsNote) && '(obligatorio para rechazar, reabrir o descartar)'}
            <input value={note} className={noteError ? 'invalid' : ''} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="actions">
            {TRANSITIONS[snag.status].map((t) => (
              <button
                key={t.to}
                type="button"
                className={`btn ${t.to === 'cerrada' ? 'success' : t.to === 'corregida' ? 'primary' : ''}`}
                onClick={() => transition(t.to, t.needsNote)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {contractor?.phone && (
            <a className="btn soft block" href={whatsappLink(contractor.phone, message)} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Enviar a {contractor.name} por WhatsApp
            </a>
          )}
        </div>

        <div className="card">
          <h3>Fotografías</h3>
          <PhotoStrip snagId={snagId} kind="antes" title="Antes" />
          <PhotoStrip snagId={snagId} kind="despues" title="Después (corrección)" />
        </div>

        <details className="card">
          <summary>Editar datos del hallazgo</summary>
          <SnagForm key={snag.id} projectId={snag.projectId} value={form} onChange={(patch) => setDraft({ ...form, ...patch })} pinLabel={String(snag.number)} />
          {draft && (
            <div className="actions">
              <button className="btn primary" onClick={saveDraft} disabled={!draft.description.trim()}>Guardar cambios</button>
              <button className="btn ghost" onClick={() => setDraft(null)}>Descartar</button>
            </div>
          )}
        </details>

        <h2>Historial</h2>
        <ol className="timeline">
          {[...snag.history].reverse().map((h) => (
            <li key={h.at}>
              <Badge tone={h.status}>{SNAG_STATUS_LABEL[h.status]}</Badge>
              <span className="muted small">
                {new Date(h.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                {h.by && ` · ${h.by}`}
              </span>
              {h.note && <p>{h.note}</p>}
            </li>
          ))}
        </ol>

        <button className="btn ghost danger-text" onClick={handleDelete}>Eliminar hallazgo</button>
      </div>
    </>
  )
}
