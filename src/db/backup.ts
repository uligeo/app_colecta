import { db } from './schema'

const TABLES = ['projects', 'contractors', 'houses', 'walks', 'snags', 'photos', 'plans', 'settings'] as const
/** Ajustes propios del dispositivo que no viajan en el respaldo. */
const DEVICE_SETTINGS = new Set(['localDir'])
const VERSION = 3

type Row = Record<string, unknown>

interface Backup {
  app: 'nivela'
  version: number
  exportedAt: string
  tables: Record<string, Row[]>
}

interface EncodedBlob {
  __blob: string
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function encodeRow(row: Row): Promise<Row> {
  const out: Row = { ...row }
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Blob) out[k] = { __blob: await blobToDataUrl(v) } satisfies EncodedBlob
  }
  return out
}

async function decodeRow(row: Row): Promise<Row> {
  const out: Row = { ...row }
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === 'object' && '__blob' in v) out[k] = await (await fetch((v as EncodedBlob).__blob)).blob()
  }
  return out
}

export function backupFileName(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
  return `nivela-respaldo-${stamp}.json`
}

/** Exporta toda la base local a JSON; las imágenes se incluyen en base64. */
export async function exportBackup(): Promise<Blob> {
  const tables: Record<string, Row[]> = {}
  for (const name of TABLES) {
    const rows = ((await db.table(name).toArray()) as Row[]).filter((r) => !(name === 'settings' && DEVICE_SETTINGS.has(r.key as string)))
    tables[name] = await Promise.all(rows.map(encodeRow))
  }
  const data: Backup = { app: 'nivela', version: VERSION, exportedAt: new Date().toISOString(), tables }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

/** Reemplaza el contenido de la base local con un respaldo exportado previamente. */
export async function importBackup(file: Blob): Promise<void> {
  let data: Backup
  try {
    data = JSON.parse(await file.text()) as Backup
  } catch {
    throw new Error('El archivo no es un respaldo válido.')
  }
  if (data.app !== 'nivela' || data.version !== VERSION || typeof data.tables !== 'object') {
    throw new Error('El archivo no es un respaldo compatible con esta versión de la app.')
  }
  const restored: Record<string, Row[]> = {}
  for (const name of TABLES) restored[name] = await Promise.all((data.tables[name] ?? []).map(decodeRow))
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      if (name === 'settings') {
        if (!data.tables.settings) continue
        await db.settings.filter((r) => !DEVICE_SETTINGS.has(r.key)).delete()
        await db.settings.bulkPut(restored.settings.filter((r) => !DEVICE_SETTINGS.has(r.key as string)) as never[])
        continue
      }
      await db.table(name).clear()
      await db.table(name).bulkAdd(restored[name])
    }
  })
}
