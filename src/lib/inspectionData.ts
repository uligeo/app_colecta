import { isOpen } from '../db/actions'
import type { Catalog } from '../db/catalog'
import { getCatalog } from '../db/checklistStore'
import { db, type Contractor, type House, type Photo, type Project, type Snag, type Walk } from '../db/schema'
import { getBrand, type Brand } from '../db/settings'

export interface InspectionData {
  walk: Walk
  house: House | undefined
  project: Project | undefined
  snags: Snag[]
  others: Snag[]
  contractors: Map<number, Contractor>
  photos: Map<number, Photo[]>
  brand: Brand
  catalog: Catalog
}

export interface NamedFile {
  name: string
  blob: Blob
}

/** Reúne todo lo necesario para el reporte y los archivos de una inspección. */
export async function loadInspection(walkId: number): Promise<InspectionData> {
  const walk = await db.walks.get(walkId)
  if (!walk) throw new Error('Inspección no encontrada.')
  const house = await db.houses.get(walk.houseId)
  const [project, houseSnags, contractors, brand, catalog] = await Promise.all([
    house ? db.projects.get(house.projectId) : undefined,
    db.snags.where('houseId').equals(walk.houseId).sortBy('number'),
    db.contractors.toArray(),
    getBrand(),
    getCatalog(),
  ])
  const snags = houseSnags.filter((s) => s.walkId === walkId)
  const all = await db.photos.where('snagId').anyOf(snags.map((s) => s.id)).toArray()
  const photos = new Map<number, Photo[]>()
  for (const p of all.sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)) {
    photos.set(p.snagId, [...(photos.get(p.snagId) ?? []), p])
  }
  return {
    walk,
    house,
    project,
    snags,
    others: houseSnags.filter((s) => s.walkId !== walkId && isOpen(s)),
    contractors: new Map(contractors.map((c) => [c.id, c])),
    photos,
    brand,
    catalog,
  }
}

/** Nombre seguro para archivos y carpetas en Drive y en el sistema de archivos. */
export function safeName(text: string): string {
  return text.replace(/[\\/:*?"<>|#]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function inspectionFolderName(d: InspectionData): string {
  return safeName(`${d.project?.name ?? 'Desarrollo'} - ${d.house?.code ?? 'Vivienda'} - ${d.walk.date} - ${d.walk.type}`)
}

export function pdfFileName(d: InspectionData): string {
  return safeName(`Reporte ${d.house?.code ?? ''} ${d.walk.date}`) + '.pdf'
}

function dataUrlToBlob(url: string): Blob {
  const [head, body] = url.split(',')
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

/** Fotos y firmas de la inspección con nombres descriptivos (el PDF se agrega aparte). */
export function inspectionImages(d: InspectionData): NamedFile[] {
  const files: NamedFile[] = []
  if (d.house?.photo) files.push({ name: 'fachada.jpg', blob: d.house.photo })
  for (const s of d.snags) {
    const counters = { antes: 0, despues: 0 }
    for (const p of d.photos.get(s.id) ?? []) {
      counters[p.kind] += 1
      const n = String(s.number).padStart(2, '0')
      files.push({ name: safeName(`H${n} ${p.kind} ${counters[p.kind]} - ${s.description}`) + '.jpg', blob: p.blob })
    }
  }
  if (d.walk.inspectorSignature) files.push({ name: 'firma-inspector.png', blob: dataUrlToBlob(d.walk.inspectorSignature) })
  if (d.walk.signature) files.push({ name: 'firma-cliente.png', blob: dataUrlToBlob(d.walk.signature) })
  return files
}
