import { areaItems, PRIORITY_DAYS, type Catalog } from './catalog'
import { db, type Contractor, type PhotoKind, type Priority, type Snag, type SnagStatus, type Walk } from './schema'

export type SnagInput = Pick<
  Snag,
  | 'area'
  | 'element'
  | 'checkItem'
  | 'defectType'
  | 'location'
  | 'trade'
  | 'description'
  | 'priority'
  | 'contractorId'
  | 'dueDate'
  | 'pin'
>

export type InspectionStatus = 'en_proceso' | 'en_revision' | 'completada'

export const INSPECTION_STATUS_LABEL: Record<InspectionStatus, string> = {
  en_proceso: 'En proceso',
  en_revision: 'En revisión',
  completada: 'Completada',
}

export const OPEN_STATUSES: SnagStatus[] = ['abierta', 'en_proceso', 'corregida']

/** Transiciones permitidas en el flujo de seguimiento de un hallazgo. */
export const TRANSITIONS: Record<SnagStatus, { to: SnagStatus; label: string; needsNote?: boolean }[]> = {
  abierta: [
    { to: 'en_proceso', label: 'Iniciar corrección' },
    { to: 'corregida', label: 'Marcar corregido' },
    { to: 'no_procede', label: 'No procede', needsNote: true },
  ],
  en_proceso: [
    { to: 'corregida', label: 'Marcar corregido' },
    { to: 'abierta', label: 'Regresar a abierto' },
  ],
  corregida: [
    { to: 'cerrada', label: 'Verificar y cerrar' },
    { to: 'abierta', label: 'Rechazar corrección', needsNote: true },
  ],
  cerrada: [{ to: 'abierta', label: 'Reabrir', needsNote: true }],
  no_procede: [{ to: 'abierta', label: 'Reabrir', needsNote: true }],
}

/** Fecha local en formato AAAA-MM-DD. */
export function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function dueDateFor(priority: Priority): string {
  return today(PRIORITY_DAYS[priority])
}

export function isOpen(s: Snag): boolean {
  return OPEN_STATUSES.includes(s.status)
}

/** Vencido: sigue a cargo del contratista y pasó su fecha compromiso. */
export function isOverdue(s: Snag, ref = today()): boolean {
  return (s.status === 'abierta' || s.status === 'en_proceso') && !!s.dueDate && s.dueDate < ref
}

export function inspectionStatus(walk: Walk, snags: Snag[]): InspectionStatus {
  if (!walk.finalizedAt) return 'en_proceso'
  return snags.some((s) => s.walkId === walk.id && isOpen(s)) ? 'en_revision' : 'completada'
}

/** Puntos revisados del checklist: conformes o con hallazgo registrado. */
export function reviewedKeys(walk: Walk, snags: Snag[]): Set<string> {
  const keys = new Set(Object.keys(walk.checks).filter((k) => walk.checks[k]))
  for (const s of snags) if (s.walkId === walk.id && s.checkItem) keys.add(s.checkItem)
  return keys
}

export function checklistProgress(walk: Walk, snags: Snag[], catalog: Catalog): { done: number; total: number } {
  const reviewed = reviewedKeys(walk, snags)
  const all = catalog.areas.flatMap(areaItems)
  return { done: all.filter((k) => reviewed.has(k)).length, total: all.length }
}

/** Sugiere el contratista: se conserva si es de la especialidad, o el único disponible de ella. */
export function suggestContractor(contractors: Contractor[], trade: string, currentId: number | null): number | null {
  const current = contractors.find((c) => c.id === currentId)
  if (current?.trade === trade) return current.id
  const matches = contractors.filter((c) => c.trade === trade)
  return matches.length === 1 ? matches[0].id : null
}

/** Registra un hallazgo con número consecutivo dentro de la vivienda. */
export async function createSnag(
  houseId: number,
  walkId: number | null,
  input: SnagInput,
  photos: Blob[],
  by: string,
): Promise<number> {
  return db.transaction('rw', db.houses, db.snags, db.photos, async () => {
    const house = await db.houses.get(houseId)
    if (!house) throw new Error('Vivienda no encontrada')
    const existing = await db.snags.where('houseId').equals(houseId).toArray()
    const number = existing.reduce((max, s) => Math.max(max, s.number), 0) + 1
    const now = Date.now()
    const id = await db.snags.add({
      ...input,
      projectId: house.projectId,
      houseId,
      walkId,
      number,
      status: 'abierta',
      createdBy: by,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      history: [{ at: now, status: 'abierta', note: 'Registrado', by }],
    })
    await db.photos.bulkAdd(photos.map((blob) => ({ snagId: id, kind: 'antes' as const, blob, createdAt: now })))
    return id
  })
}

export async function changeStatus(snagId: number, status: SnagStatus, note: string, by: string): Promise<void> {
  await db.transaction('rw', db.snags, async () => {
    const snag = await db.snags.get(snagId)
    if (!snag) return
    const now = Date.now()
    await db.snags.update(snagId, {
      status,
      updatedAt: now,
      closedAt: status === 'cerrada' || status === 'no_procede' ? now : null,
      history: [...snag.history, { at: now, status, note, by }],
    })
  })
}

export async function addPhotos(snagId: number, kind: PhotoKind, blobs: Blob[]): Promise<void> {
  const now = Date.now()
  await db.photos.bulkAdd(blobs.map((blob) => ({ snagId, kind, blob, createdAt: now })))
}

export async function deleteSnag(snagId: number): Promise<void> {
  await db.transaction('rw', db.snags, db.photos, async () => {
    await db.photos.where('snagId').equals(snagId).delete()
    await db.snags.delete(snagId)
  })
}

/** Elimina una inspección; sus hallazgos se conservan en la vivienda. */
export async function deleteWalk(walkId: number): Promise<void> {
  await db.transaction('rw', db.walks, db.snags, async () => {
    await db.snags.where('walkId').equals(walkId).modify({ walkId: null })
    await db.walks.delete(walkId)
  })
}

/** Elimina una vivienda junto con sus inspecciones, hallazgos y fotos. */
export async function deleteHouse(houseId: number): Promise<void> {
  await db.transaction('rw', db.houses, db.walks, db.snags, db.photos, async () => {
    const snagIds = await db.snags.where('houseId').equals(houseId).primaryKeys()
    await db.photos.where('snagId').anyOf(snagIds).delete()
    await db.snags.bulkDelete(snagIds)
    await db.walks.where('houseId').equals(houseId).delete()
    await db.houses.delete(houseId)
  })
}

/** Elimina un desarrollo con sus planos, viviendas y todo lo relacionado. */
export async function deleteProject(projectId: number): Promise<void> {
  const houseIds = await db.houses.where('projectId').equals(projectId).primaryKeys()
  for (const id of houseIds) await deleteHouse(id)
  await db.plans.where('projectId').equals(projectId).delete()
  await db.projects.delete(projectId)
}
