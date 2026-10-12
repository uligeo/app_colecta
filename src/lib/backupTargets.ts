import { backupFileName, exportBackup } from '../db/backup'
import { getBackupSettings, getSetting, setSetting, updateBackupSettings } from '../db/settings'
import { hasDriveSession, parseFolderId, uploadToFolder } from './drive'
import { downloadBlob } from './image'

type PermissionMode = { mode: 'readwrite' }

interface DirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission: (o: PermissionMode) => Promise<PermissionState>
  requestPermission: (o: PermissionMode) => Promise<PermissionState>
}

type DirectoryPicker = (o: { mode: 'readwrite'; id: string }) => Promise<DirectoryHandle>

export function canPickFolder(): boolean {
  return 'showDirectoryPicker' in window
}

/** Pide al usuario una carpeta del equipo donde se guardarán los respaldos. */
export async function pickLocalFolder(): Promise<void> {
  const picker = (window as unknown as { showDirectoryPicker: DirectoryPicker }).showDirectoryPicker
  const handle = await picker({ mode: 'readwrite', id: 'nivela-respaldos' })
  await setSetting('localDir', handle)
  await updateBackupSettings({ localFolderName: handle.name })
}

/** Carpeta local autorizada; con `interactive` puede pedir permiso al usuario. */
async function localDir(interactive: boolean): Promise<DirectoryHandle | null> {
  const handle = canPickFolder() ? await getSetting<DirectoryHandle | null>('localDir', null) : null
  if (!handle) return null
  let perm = await handle.queryPermission({ mode: 'readwrite' })
  if (perm !== 'granted' && interactive) perm = await handle.requestPermission({ mode: 'readwrite' })
  return perm === 'granted' ? handle : null
}

async function writeFile(dir: FileSystemDirectoryHandle, name: string, blob: Blob): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(blob)
  await writable.close()
}

/**
 * Guarda el respaldo en la carpeta local elegida; si no hay carpeta o permiso, lo descarga.
 * Con `interactive` en falso nunca muestra diálogos (para respaldos automáticos).
 */
async function saveLocal(blob: Blob, name: string, interactive: boolean): Promise<'carpeta' | 'descarga' | null> {
  const dir = await localDir(interactive)
  if (dir) {
    await writeFile(dir, name, blob)
    return 'carpeta'
  }
  if (!interactive) return null
  downloadBlob(blob, name)
  return 'descarga'
}

/** Escribe varios archivos en una subcarpeta de la carpeta local; devuelve falso si no hay carpeta autorizada. */
export async function saveFilesLocal(subfolder: string, files: { name: string; blob: Blob }[], interactive = true): Promise<boolean> {
  const dir = await localDir(interactive)
  if (!dir) return false
  const sub = await dir.getDirectoryHandle(subfolder, { create: true })
  for (const f of files) await writeFile(sub, f.name, f.blob)
  return true
}

export interface BackupResult {
  local: 'carpeta' | 'descarga' | null
  drive: 'ok' | null
  errors: string[]
}

/** Genera un respaldo y lo guarda en los destinos indicados. */
export async function runBackup(targets: { local: boolean; drive: boolean }, interactive = true): Promise<BackupResult> {
  const settings = await getBackupSettings()
  const blob = await exportBackup()
  const name = backupFileName()
  const result: BackupResult = { local: null, drive: null, errors: [] }

  if (targets.drive) {
    const folderId = parseFolderId(settings.driveFolderUrl)
    try {
      if (!folderId) throw new Error('El enlace de la carpeta de Drive no es válido.')
      await uploadToFolder(folderId, name, blob)
      result.drive = 'ok'
      await updateBackupSettings({ driveAt: Date.now() })
    } catch (err) {
      result.errors.push(`Drive: ${err instanceof Error ? err.message : 'error desconocido'}`)
    }
  }
  if (targets.local) {
    try {
      result.local = await saveLocal(blob, name, interactive)
      if (result.local) await updateBackupSettings({ localAt: Date.now() })
    } catch (err) {
      result.errors.push(`Local: ${err instanceof Error ? err.message : 'error desconocido'}`)
    }
  }
  return result
}

/** Respaldo silencioso tras eventos importantes; sólo usa destinos ya autorizados. */
export async function autoBackup(): Promise<void> {
  const settings = await getBackupSettings()
  await runBackup({ local: true, drive: hasDriveSession() && !!parseFolderId(settings.driveFolderUrl) }, false)
}

/** Comparte el respaldo con el menú nativo (en móvil permite elegir Google Drive). */
export async function shareBackup(): Promise<boolean> {
  const file = new File([await exportBackup()], backupFileName(), { type: 'application/json' })
  if (!navigator.canShare?.({ files: [file] })) return false
  await navigator.share({ files: [file], title: 'Respaldo de inspecciones' })
  await updateBackupSettings({ localAt: Date.now() })
  return true
}
