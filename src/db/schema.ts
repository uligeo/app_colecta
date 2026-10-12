import Dexie, { type EntityTable } from 'dexie'

export type HouseStatus = 'en_construccion' | 'lista' | 'entregada'
export type HouseType = 'casa' | 'departamento'
export type WalkType = 'calidad' | 'pre_entrega' | 'entrega' | 'postventa' | 'reinspeccion'
export type SnagStatus = 'abierta' | 'en_proceso' | 'corregida' | 'cerrada' | 'no_procede'
export type Priority = 'alta' | 'media' | 'baja'
export type PhotoKind = 'antes' | 'despues'

export interface Project {
  id: number
  name: string
  company: string
  location: string
  createdAt: number
}

export interface Plan {
  id: number
  projectId: number
  name: string
  blob: Blob
  createdAt: number
}

export interface Contractor {
  id: number
  name: string
  trade: string
  phone: string
  email: string
}

export interface House {
  id: number
  projectId: number
  code: string
  model: string
  type: HouseType
  surface: number | null
  address: string
  ownerName: string
  ownerPhone: string
  status: HouseStatus
  photo: Blob | null
  createdAt: number
}

/** Inspección de una vivienda; la tabla conserva el nombre histórico `walks`. */
export interface Walk {
  id: number
  houseId: number
  type: WalkType
  inspector: string
  date: string
  notes: string
  checks: Record<string, boolean>
  signature: string
  signedBy: string
  inspectorSignature: string
  confirmed: boolean
  finalizedAt: number | null
  /** Subcarpeta de Drive con el PDF y las fotos de esta inspección. */
  driveFolderId: string | null
  driveUploadedAt: number | null
  /** Última vez que se guardaron el PDF y las fotos en este equipo. */
  localSavedAt?: number | null
  createdAt: number
}

export interface PlanPin {
  planId: number
  x: number
  y: number
}

export interface SnagEvent {
  at: number
  status: SnagStatus
  note: string
  by: string
}

/** Hallazgo (observación) con su seguimiento hasta el cierre. */
export interface Snag {
  id: number
  projectId: number
  houseId: number
  walkId: number | null
  number: number
  area: string
  element: string
  checkItem: string
  defectType: string
  location: string
  trade: string
  description: string
  priority: Priority
  status: SnagStatus
  contractorId: number | null
  dueDate: string
  pin: PlanPin | null
  createdBy: string
  createdAt: number
  updatedAt: number
  closedAt: number | null
  history: SnagEvent[]
}

export interface Photo {
  id: number
  snagId: number
  kind: PhotoKind
  blob: Blob
  createdAt: number
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('inspeccion_viviendas') as Dexie & {
  projects: EntityTable<Project, 'id'>
  plans: EntityTable<Plan, 'id'>
  contractors: EntityTable<Contractor, 'id'>
  houses: EntityTable<House, 'id'>
  walks: EntityTable<Walk, 'id'>
  snags: EntityTable<Snag, 'id'>
  photos: EntityTable<Photo, 'id'>
  settings: EntityTable<Setting, 'key'>
}

const V2_STORES = {
  projects: '++id, name',
  plans: '++id, projectId',
  contractors: '++id, name, trade',
  houses: '++id, projectId, status, code',
  walks: '++id, houseId, date',
  snags: '++id, projectId, houseId, walkId, status, trade, contractorId, dueDate',
  photos: '++id, snagId',
}

db.version(1).stores({
  projects: '++id, name',
  houses: '++id, projectId, status, code',
  inspections: '++id, houseId, status, date',
  photos: '++id, inspectionId, itemId',
})

db.version(2)
  .stores({ ...V2_STORES, inspections: null })
  .upgrade((tx) => tx.table('photos').clear())

db.version(3)
  .stores({ ...V2_STORES, settings: 'key' })
  .upgrade(async (tx) => {
    await tx.table('houses').toCollection().modify((h) => {
      h.type ??= 'casa'
      h.surface ??= null
      h.photo ??= null
    })
    await tx.table('walks').toCollection().modify((w) => {
      w.checks ??= {}
      w.confirmed ??= false
      w.finalizedAt ??= w.closed ? w.createdAt : null
      delete w.closed
    })
    await tx.table('snags').toCollection().modify((s) => {
      if (s.priority === 'critica') s.priority = 'alta'
      s.area ??= ''
      s.element ??= ''
      s.checkItem ??= ''
      s.defectType ??= ''
    })
  })

db.version(4)
  .stores({ ...V2_STORES, settings: 'key' })
  .upgrade((tx) =>
    tx.table('walks').toCollection().modify((w) => {
      w.inspectorSignature ??= ''
      w.driveFolderId ??= null
      w.driveUploadedAt ??= null
    }),
  )

export const HOUSE_STATUS_LABEL: Record<HouseStatus, string> = {
  en_construccion: 'En construcción',
  lista: 'Lista para entrega',
  entregada: 'Entregada',
}

export const WALK_TYPE_LABEL: Record<WalkType, string> = {
  calidad: 'Control de calidad',
  pre_entrega: 'Pre-entrega',
  entrega: 'Entrega al cliente',
  postventa: 'Postventa / garantía',
  reinspeccion: 'Reinspección',
}

export const SNAG_STATUS_LABEL: Record<SnagStatus, string> = {
  abierta: 'Abierta',
  en_proceso: 'En corrección',
  corregida: 'Por verificar',
  cerrada: 'Cerrada',
  no_procede: 'No procede',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}
