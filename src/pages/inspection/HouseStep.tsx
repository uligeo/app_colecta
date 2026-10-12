import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Save } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import type { SavedState } from '../../components/InspectionActions'
import { Stepper } from '../../components/Stepper'
import { today } from '../../db/actions'
import { db, WALK_TYPE_LABEL, type House, type HouseType, type Project, type Walk, type WalkType } from '../../db/schema'
import { useProfile } from '../../db/settings'
import { compressImage } from '../../lib/image'
import { useObjectUrls } from '../../lib/useObjectUrls'

const NEW = 'nuevo'

interface FormState {
  projectId: string
  projectName: string
  company: string
  houseId: string
  code: string
  ownerName: string
  ownerPhone: string
  address: string
  type: HouseType
  surface: string
  photo: Blob | null
  walkType: WalkType
  date: string
  inspector: string
}

function initialState(inspector: string, walk?: Walk, house?: House, project?: Project): FormState {
  return {
    projectId: project ? String(project.id) : '',
    projectName: '',
    company: project?.company ?? '',
    houseId: house ? String(house.id) : '',
    code: '',
    ownerName: house?.ownerName ?? '',
    ownerPhone: house?.ownerPhone ?? '',
    address: house?.address ?? '',
    type: house?.type ?? 'casa',
    surface: house?.surface ? String(house.surface) : '',
    photo: house?.photo ?? null,
    walkType: walk?.type ?? 'calidad',
    date: walk?.date ?? today(),
    inspector: walk?.inspector ?? inspector,
  }
}

/** Paso 1: carga datos existentes (inspección o vivienda preseleccionada) y muestra el formulario. */
export function HouseStep() {
  const walkParam = useParams().id
  const walkId = walkParam ? Number(walkParam) : null
  const presetHouse = Number(useSearchParams()[0].get('vivienda')) || null
  const profile = useProfile()
  const data = useLiveQuery(async () => {
    const walk = walkId ? await db.walks.get(walkId) : undefined
    const houseId = walk?.houseId ?? presetHouse
    const house = houseId ? await db.houses.get(houseId) : undefined
    const project = house ? await db.projects.get(house.projectId) : undefined
    return { walk, house, project }
  }, [walkId, presetHouse])

  if (!data || profile === undefined) return null
  return (
    <HouseForm
      walkId={walkId}
      initial={initialState(profile?.name ?? '', data.walk, data.house, data.project)}
    />
  )
}

function HouseForm({ walkId, initial }: { walkId: number | null; initial: FormState }) {
  const navigate = useNavigate()
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(false)
  const exitAfterSave = useRef(false)
  const projects = useLiveQuery(() => db.projects.orderBy('name').toArray())
  const houses = useLiveQuery(
    () => (f.projectId && f.projectId !== NEW ? db.houses.where('projectId').equals(Number(f.projectId)).toArray() : []),
    [f.projectId],
  )
  const photoItems = useMemo(() => (f.photo ? [{ id: 0, blob: f.photo }] : []), [f.photo])
  const photoUrl = useObjectUrls(photoItems)[0]?.url

  const set = (patch: Partial<FormState>) => setF((prev) => ({ ...prev, ...patch }))

  function selectProject(id: string) {
    const p = projects?.find((x) => String(x.id) === id)
    set({ projectId: id, company: p?.company ?? '', houseId: id === NEW ? NEW : '' })
  }

  function selectHouse(id: string) {
    const h = houses?.find((x) => String(x.id) === id)
    set({
      houseId: id,
      ownerName: h?.ownerName ?? '',
      ownerPhone: h?.ownerPhone ?? '',
      address: h?.address ?? '',
      type: h?.type ?? 'casa',
      surface: h?.surface ? String(h.surface) : '',
      photo: h?.photo ?? null,
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const id = await db.transaction('rw', db.projects, db.houses, db.walks, async () => {
        let projectId = Number(f.projectId)
        if (f.projectId === NEW) {
          projectId = await db.projects.add({ name: f.projectName.trim(), company: f.company.trim(), location: '', createdAt: Date.now() })
        } else {
          await db.projects.update(projectId, { company: f.company.trim() })
        }
        const houseData = {
          ownerName: f.ownerName.trim(),
          ownerPhone: f.ownerPhone.trim(),
          address: f.address.trim(),
          type: f.type,
          surface: f.surface ? Number(f.surface) : null,
          photo: f.photo,
        }
        let houseId = Number(f.houseId)
        if (f.houseId === NEW) {
          houseId = await db.houses.add({
            ...houseData,
            projectId,
            code: f.code.trim(),
            model: '',
            status: 'en_construccion',
            createdAt: Date.now(),
          })
        } else {
          await db.houses.update(houseId, houseData)
        }
        const walkData = { houseId, type: f.walkType, date: f.date, inspector: f.inspector.trim() }
        if (walkId) {
          await db.walks.update(walkId, walkData)
          return walkId
        }
        return db.walks.add({
          ...walkData,
          notes: '',
          checks: {},
          signature: '',
          signedBy: f.ownerName.trim(),
          inspectorSignature: '',
          confirmed: false,
          finalizedAt: null,
          driveFolderId: null,
          driveUploadedAt: null,
          createdAt: Date.now(),
        })
      })
      if (exitAfterSave.current) {
        const state: SavedState = { saved: 'Inspección guardada en este dispositivo.' }
        navigate('/', { state })
      } else {
        navigate(`/inspecciones/${id}/checklist`, { replace: !walkId })
      }
    } finally {
      exitAfterSave.current = false
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} onInvalidCapture={() => (exitAfterSave.current = false)} className="wizard">
      <AppHeader
        title={walkId ? 'Datos de la vivienda' : 'Nueva inspección'}
        back={walkId ? `/inspecciones/${walkId}/checklist` : '/'}
        right={
          <button className="header-btn" disabled={busy} onClick={() => (exitAfterSave.current = true)}>
            <Save size={18} /> Guardar
          </button>
        }
      />
      <Stepper current={1} walkId={walkId ?? undefined} />
      <div className="content form-stack">
        <h2 className="step-title">Datos de la vivienda</h2>

        <label>
          Desarrollo *
          <select required value={f.projectId} onChange={(e) => selectProject(e.target.value)}>
            <option value="" disabled>Selecciona un desarrollo</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value={NEW}>+ Nuevo desarrollo</option>
          </select>
        </label>
        {f.projectId === NEW && (
          <label>
            Nombre del desarrollo *
            <input required value={f.projectName} onChange={(e) => set({ projectName: e.target.value })} placeholder="Residencial del Valle" />
          </label>
        )}
        <label>
          Constructor
          <input value={f.company} onChange={(e) => set({ company: e.target.value })} placeholder="Constructora ABC" />
        </label>

        <label>
          Vivienda *
          <select required value={f.houseId} disabled={!f.projectId} onChange={(e) => selectHouse(e.target.value)}>
            <option value="" disabled>Selecciona una vivienda</option>
            {houses?.map((h) => (
              <option key={h.id} value={h.id}>{h.code}</option>
            ))}
            <option value={NEW}>+ Nueva vivienda</option>
          </select>
        </label>
        {f.houseId === NEW && (
          <label>
            Clave de la vivienda *
            <input required value={f.code} onChange={(e) => set({ code: e.target.value })} placeholder="Casa 12 / Mz 3 Lt 12" />
          </label>
        )}

        <label>
          Cliente *
          <input required value={f.ownerName} onChange={(e) => set({ ownerName: e.target.value })} placeholder="Juan Pérez" />
        </label>
        <label>
          Teléfono del cliente
          <input type="tel" value={f.ownerPhone} onChange={(e) => set({ ownerPhone: e.target.value })} />
        </label>
        <label>
          Dirección *
          <input required value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="Av. Las Flores 123" />
        </label>

        <div className="field">
          <span className="field-label">Tipo de vivienda</span>
          <div className="radio-row">
            {(['casa', 'departamento'] as HouseType[]).map((t) => (
              <label key={t} className="radio">
                <input type="radio" name="tipo" checked={f.type === t} onChange={() => set({ type: t })} />
                {t === 'casa' ? 'Casa' : 'Departamento'}
              </label>
            ))}
          </div>
        </div>
        <label>
          Superficie (m²)
          <input type="number" inputMode="decimal" min={0} value={f.surface} onChange={(e) => set({ surface: e.target.value })} />
        </label>

        <div className="field">
          <span className="field-label">Foto de fachada</span>
          <label className="cover-picker">
            {photoUrl ? <img src={photoUrl} alt="Fachada" /> : <span><Camera size={22} /> Agregar foto</span>}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) set({ photo: await compressImage(file, 1200) })
              }}
            />
          </label>
        </div>

        <label>
          Tipo de inspección
          <select value={f.walkType} onChange={(e) => set({ walkType: e.target.value as WalkType })}>
            {Object.entries(WALK_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha de inspección *
          <input required type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label>
          Inspector *
          <input required value={f.inspector} onChange={(e) => set({ inspector: e.target.value })} />
        </label>
      </div>
      <div className="bottom-actions">
        <span />
        <button className="btn primary" disabled={busy}>Siguiente</button>
      </div>
    </form>
  )
}
