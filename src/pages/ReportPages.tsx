import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, ChevronLeft, Download, HardHat, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExportPanel } from '../components/ExportPanel'
import { HomeButton, SaveInspectionButton } from '../components/InspectionActions'
import { Logo } from '../components/Logo'
import { PhotoStrip } from '../components/PhotoStrip'
import { SeverityPill } from '../components/Severity'
import { checklistProgress, formatDate, isOpen, isOverdue, reviewedKeys } from '../db/actions'
import { areaItems, areaName } from '../db/catalog'
import { useCatalog } from '../db/checklistStore'
import { db, SNAG_STATUS_LABEL, WALK_TYPE_LABEL, type Contractor, type House, type Snag } from '../db/schema'
import { downloadInspectionPdf } from '../lib/inspectionExport'
import { useObjectUrls } from '../lib/useObjectUrls'

const SEVERITY_ORDER = { alta: 0, media: 1, baja: 2 }

function Toolbar({ walkId }: { walkId?: number }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function pdf() {
    if (!walkId) return window.print()
    setBusy(true)
    try {
      await downloadInspectionPdf(walkId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="report-toolbar no-print">
      <button className="btn" onClick={() => navigate(-1)}>
        <ChevronLeft size={18} /> Volver
      </button>
      <HomeButton />
      {walkId && <SaveInspectionButton />}
      <button className="btn primary" onClick={pdf} disabled={busy}>
        <Download size={18} /> {busy ? 'Generando…' : walkId ? 'Descargar PDF' : 'Imprimir / PDF'}
      </button>
    </div>
  )
}

function Cover({ blob }: { blob: Blob | null | undefined }) {
  const items = useMemo(() => (blob ? [{ id: 0, blob }] : []), [blob])
  const url = useObjectUrls(items)[0]?.url
  return url ? <img className="report-cover" src={url} alt="Fachada de la vivienda" /> : null
}

function Summary({ snags }: { snags: Snag[] }) {
  const n = (p: string) => snags.filter((s) => s.priority === p).length
  return (
    <div className="summary-tiles">
      <div className="sum total"><b>{snags.length}</b>Total</div>
      <div className="sum alta"><b>{n('alta')}</b>Alta</div>
      <div className="sum media"><b>{n('media')}</b>Media</div>
      <div className="sum baja"><b>{n('baja')}</b>Baja</div>
    </div>
  )
}

interface FindingListProps {
  snags: Snag[]
  contractors: Map<number, Contractor>
  houses?: Map<number, House>
  withPhotos?: boolean
}

function FindingList({ snags, contractors, houses, withPhotos = true }: FindingListProps) {
  const catalog = useCatalog()
  if (snags.length === 0) return <p className="muted">Sin hallazgos.</p>
  const sorted = [...snags].sort((a, b) => SEVERITY_ORDER[a.priority] - SEVERITY_ORDER[b.priority] || a.number - b.number)
  return (
    <>
      {sorted.map((s) => (
        <section key={s.id} className="report-finding">
          <div className="report-finding-head">
            <h3>
              {houses && `${houses.get(s.houseId)?.code ?? ''} · `}#{s.number} {s.description}
            </h3>
            <SeverityPill value={s.priority} />
          </div>
          <p className="muted">{[s.area && areaName(catalog, s.area), s.element, s.location].filter(Boolean).join(' · ')}</p>
          <p className="small">
            {SNAG_STATUS_LABEL[s.status]}
            {isOverdue(s) && <b className="text-alta"> · Vencido</b>} · Responsable:{' '}
            {s.contractorId ? (contractors.get(s.contractorId)?.name ?? '—') : 'Sin asignar'} · Compromiso: {formatDate(s.dueDate)}
          </p>
          {withPhotos && (
            <div className="report-photos">
              <PhotoStrip snagId={s.id} kind="antes" readOnly title="Antes" />
              <PhotoStrip snagId={s.id} kind="despues" readOnly title="Después" />
            </div>
          )}
        </section>
      ))}
    </>
  )
}

function useContractors() {
  return useLiveQuery(async () => new Map((await db.contractors.toArray()).map((c) => [c.id, c])))
}

/** Fecha de emisión del reporte, fija durante la vida del componente. */
function usePrintedOn(): string {
  return useState(() => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }))[0]
}

/** Reporte de una inspección con marca, resumen, hallazgos, checklist y firmas. */
export function InspectionReport() {
  const walkId = Number(useParams().id)
  const contractors = useContractors()
  const catalog = useCatalog()
  const data = useLiveQuery(async () => {
    const walk = await db.walks.get(walkId)
    if (!walk) return null
    const house = await db.houses.get(walk.houseId)
    const project = house ? await db.projects.get(house.projectId) : undefined
    const houseSnags = await db.snags.where('houseId').equals(walk.houseId).toArray()
    return { walk, house, project, houseSnags }
  }, [walkId])

  if (data === undefined || !contractors) return null
  if (data === null) return <p className="empty">Inspección no encontrada.</p>

  const { walk, house, project, houseSnags } = data
  const snags = houseSnags.filter((s) => s.walkId === walkId)
  const others = houseSnags.filter((s) => s.walkId !== walkId && isOpen(s))
  const reviewed = reviewedKeys(walk, snags)
  const progress = checklistProgress(walk, snags, catalog)

  return (
    <article className="report">
      <Toolbar walkId={walkId} />
      <ExportPanel walk={walk} />
      <header className="report-brand">
        <Logo size={44} />
        <div>
          <h1>Reporte de inspección de vivienda</h1>
          <p>{project?.name}</p>
          <p>{house?.code}</p>
          <p className="muted">{house?.address}</p>
        </div>
      </header>
      <Cover blob={house?.photo} />
      <div className="report-meta">
        <div><User size={16} /><span>Cliente</span><b>{house?.ownerName || '—'}</b></div>
        <div><CalendarDays size={16} /><span>Fecha de inspección</span><b>{formatDate(walk.date)}</b></div>
        <div><HardHat size={16} /><span>Inspector</span><b>{walk.inspector || '—'}</b></div>
      </div>
      <p className="muted small">
        {WALK_TYPE_LABEL[walk.type]}
        {project?.company && ` · ${project.company}`}
        {house?.surface ? ` · ${house.surface} m²` : ''} · {house?.type === 'departamento' ? 'Departamento' : 'Casa'}
      </p>

      <h2>Resumen de hallazgos</h2>
      <Summary snags={snags} />
      <h2>Hallazgos</h2>
      <FindingList snags={snags} contractors={contractors} />

      {others.length > 0 && (
        <>
          <h2>Pendientes de inspecciones anteriores</h2>
          <FindingList snags={others} contractors={contractors} withPhotos={false} />
        </>
      )}

      <h2>
        Checklist ({progress.done}/{progress.total} puntos revisados)
      </h2>
      <table className="report-table">
        <tbody>
          {catalog.areas.map((a) => {
            const keys = areaItems(a)
            const n = snags.filter((s) => s.area === a.id).length
            return (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>
                  {keys.filter((k) => reviewed.has(k)).length}/{keys.length}
                </td>
                <td className={n ? 'text-alta' : ''}>
                  {n} hallazgo{n === 1 ? '' : 's'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {walk.notes && (
        <>
          <h2>Observaciones finales</h2>
          <p className="pre">{walk.notes}</p>
        </>
      )}
      <div className="sign-row">
        <div className="sign-block">
          {walk.inspectorSignature && <img src={walk.inspectorSignature} alt="Firma del inspector" />}
          <p>
            {walk.inspector || 'Inspector'}
            <small>Inspector</small>
          </p>
        </div>
        <div className="sign-block">
          {walk.signature && <img src={walk.signature} alt="Firma del cliente" />}
          <p>
            {walk.signedBy || 'Nombre y firma'}
            <small>Cliente</small>
          </p>
        </div>
      </div>
      {walk.confirmed && (
        <p className="muted small center">El cliente confirma haber recibido el reporte y conocer los hallazgos identificados.</p>
      )}
    </article>
  )
}

/** Reporte completo de hallazgos de una vivienda. */
export function HouseReport() {
  const houseId = Number(useParams().id)
  const contractors = useContractors()
  const printedOn = usePrintedOn()
  const data = useLiveQuery(async () => {
    const house = await db.houses.get(houseId)
    if (!house) return null
    const project = await db.projects.get(house.projectId)
    const snags = await db.snags.where('houseId').equals(houseId).toArray()
    return { house, project, snags }
  }, [houseId])

  if (data === undefined || !contractors) return null
  if (data === null) return <p className="empty">Vivienda no encontrada.</p>

  const { house, project, snags } = data
  return (
    <article className="report">
      <Toolbar />
      <header className="report-brand">
        <Logo size={44} />
        <div>
          <h1>Reporte de hallazgos de la vivienda</h1>
          <p>
            {project?.name} · {house.code}
          </p>
          <p className="muted">
            {house.ownerName || 'Sin cliente'} · {printedOn}
          </p>
        </div>
      </header>
      <Summary snags={snags.filter(isOpen)} />
      <h2>Pendientes</h2>
      <FindingList snags={snags.filter(isOpen)} contractors={contractors} />
      <h2>Cerrados / no procede</h2>
      <FindingList snags={snags.filter((s) => !isOpen(s))} contractors={contractors} withPhotos={false} />
    </article>
  )
}

/** Lista de trabajo para un contratista: sus pendientes por vivienda. */
export function ContractorReport() {
  const param = useParams().id
  const contractorId = param === 'sin-asignar' ? null : Number(param)
  const contractors = useContractors()
  const printedOn = usePrintedOn()
  const data = useLiveQuery(async () => {
    const all =
      contractorId === null
        ? await db.snags.filter((s) => s.contractorId === null).toArray()
        : await db.snags.where('contractorId').equals(contractorId).toArray()
    const snags = all.filter((s) => s.status === 'abierta' || s.status === 'en_proceso')
    const houses = await db.houses.bulkGet([...new Set(snags.map((s) => s.houseId))])
    return { snags, houses: new Map(houses.filter((h) => !!h).map((h) => [h.id, h])) }
  }, [contractorId])

  if (!data || !contractors) return null
  const contractor = contractorId === null ? null : contractors.get(contractorId)

  return (
    <article className="report">
      <Toolbar />
      <header className="report-brand">
        <Logo size={44} />
        <div>
          <h1>Pendientes de {contractor ? contractor.name : 'hallazgos sin asignar'}</h1>
          <p className="muted">
            {contractor?.trade} · {data.snags.length} hallazgos · {printedOn}
          </p>
        </div>
      </header>
      <FindingList snags={data.snags} contractors={contractors} houses={data.houses} />
    </article>
  )
}
