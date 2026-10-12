import { useLiveQuery } from 'dexie-react-hooks'
import { Camera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { PhotoAnnotator } from '../../components/PhotoAnnotator'
import { SnagForm } from '../../components/SnagForm'
import { createSnag, dueDateFor, suggestContractor, type SnagInput } from '../../db/actions'
import { findElement, type Catalog } from '../../db/catalog'
import { getCatalog } from '../../db/checklistStore'
import { db, type Contractor, type House } from '../../db/schema'
import { currentUser } from '../../db/settings'
import { compressImage } from '../../lib/image'

interface Pending {
  id: number
  blob: Blob
  url: string
}

function initialInput(area: string, element: string, checkItem: string, contractors: Contractor[], catalog: Catalog): SnagInput {
  const trade = findElement(catalog, area, element)?.trade ?? 'Otros'
  return {
    area,
    element,
    checkItem,
    defectType: '',
    location: '',
    trade,
    description: '',
    priority: 'media',
    contractorId: suggestContractor(contractors, trade, null),
    dueDate: dueDateFor('media'),
    pin: null,
  }
}

/** Registro de hallazgo desde una inspección (`/inspecciones/:id`) o directo en la vivienda (`/viviendas/:id`). */
export function FindingNew() {
  const id = Number(useParams().id)
  const fromWalk = useLocation().pathname.startsWith('/inspecciones/')
  const [params] = useSearchParams()
  const target = useLiveQuery(async () => {
    const walk = fromWalk ? await db.walks.get(id) : undefined
    const house = await db.houses.get(walk ? walk.houseId : id)
    const count = house ? await db.snags.where('houseId').equals(house.id).count() : 0
    return { walk, house, count, contractors: await db.contractors.toArray(), catalog: await getCatalog() }
  }, [id, fromWalk])

  if (target === undefined) return null
  if (!target.house) return <p className="empty">Vivienda no encontrada.</p>
  return (
    <FindingForm
      house={target.house}
      walkId={target.walk?.id ?? null}
      count={target.count}
      contractors={target.contractors}
      catalog={target.catalog}
      preset={[params.get('area') ?? '', params.get('elemento') ?? '', params.get('punto') ?? '']}
    />
  )
}

interface FindingFormProps {
  house: House
  walkId: number | null
  count: number
  contractors: Contractor[]
  catalog: Catalog
  preset: [area: string, element: string, checkItem: string]
}

function FindingForm({ house, walkId, count, contractors, catalog, preset }: FindingFormProps) {
  const navigate = useNavigate()
  const [input, setInput] = useState(() => initialInput(...preset, contractors, catalog))
  const [photos, setPhotos] = useState<Pending[]>([])
  const [editing, setEditing] = useState<Blob | null>(null)
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  async function pick(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ''
    if (file) setEditing(await compressImage(file))
  }

  function addPhoto(blob: Blob) {
    setPhotos((prev) => [...prev, { id: Date.now(), blob, url: URL.createObjectURL(blob) }])
    setEditing(null)
  }

  function removePhoto(pid: number) {
    setPhotos((prev) => {
      prev.filter((p) => p.id === pid).forEach((p) => URL.revokeObjectURL(p.url))
      return prev.filter((p) => p.id !== pid)
    })
  }

  async function save(again: boolean) {
    if (busy) return
    setBusy(true)
    try {
      const data = { ...input, description: input.description.trim() }
      await createSnag(house.id, walkId, data, photos.map((p) => p.blob), await currentUser())
      photos.forEach((p) => URL.revokeObjectURL(p.url))
      setPhotos([])
      if (!again) return navigate(-1)
      setSaved(`Hallazgo #${count + 1} registrado.`)
      setInput((prev) => initialInput(prev.area, prev.element, '', contractors, catalog))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="wizard">
        <AppHeader title="Fotografía del hallazgo" back={() => setEditing(null)} />
        <PhotoAnnotator blob={editing} onDone={addPhoto} onRetake={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target)} />
      </div>
    )
  }

  return (
    <form
      className="wizard"
      onSubmit={(e) => {
        e.preventDefault()
        save(false)
      }}
    >
      <AppHeader title="Registrar hallazgo" back={true} />
      <div className="content">
        <p className="muted small">
          {house.code} · Hallazgo #{count + 1}
        </p>
        {saved && <p className="toast" role="status">{saved}</p>}
        <SnagForm projectId={house.projectId} value={input} onChange={(patch) => setInput((prev) => ({ ...prev, ...patch }))} pinLabel={String(count + 1)} />

        <div className="field photo-field">
          <span className="field-label">Fotografías</span>
          {photos.length > 0 && (
            <div className="photos">
              {photos.map((p) => (
                <figure key={p.id}>
                  <img src={p.url} alt="Evidencia" />
                  <button type="button" className="photo-del" onClick={() => removePhoto(p.id)} aria-label="Quitar foto">×</button>
                </figure>
              ))}
            </div>
          )}
          <button type="button" className="btn soft block" onClick={() => fileRef.current?.click()}>
            <Camera size={18} /> Tomar fotografía
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target)} />
        </div>
        <button type="button" className="link-btn" disabled={busy} onClick={(e) => e.currentTarget.form?.reportValidity() && save(true)}>
          Guardar y registrar otro
        </button>
      </div>
      <div className="bottom-actions">
        <button type="button" className="btn" onClick={() => navigate(-1)}>Cancelar</button>
        <button className="btn primary" disabled={busy}>Guardar</button>
      </div>
    </form>
  )
}
