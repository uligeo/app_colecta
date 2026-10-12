import { db } from '../db/schema'
import { getBackupSettings } from '../db/settings'
import { saveFilesLocal } from './backupTargets'
import { ensureSubfolder, folderLink, hasDriveSession, isDriveConfigured, listChildren, parseFolderId, upsertFile } from './drive'
import { downloadBlob } from './image'
import { inspectionFolderName, inspectionImages, loadInspection, pdfFileName, type NamedFile } from './inspectionData'
import { buildInspectionPdf } from './pdf'

async function packageFiles(walkId: number) {
  const data = await loadInspection(walkId)
  const pdf = await buildInspectionPdf(data)
  const files: NamedFile[] = [{ name: pdfFileName(data), blob: pdf }, ...inspectionImages(data)]
  return { data, pdf, files, folder: inspectionFolderName(data) }
}

export async function downloadInspectionPdf(walkId: number): Promise<void> {
  const { data, pdf } = await packageFiles(walkId)
  downloadBlob(pdf, pdfFileName(data))
}

/**
 * Sube el PDF, las fotos y las firmas a una subcarpeta de la carpeta compartida de Drive.
 * Si la inspección ya se subió, actualiza los archivos existentes en lugar de duplicarlos.
 */
export async function uploadInspectionToDrive(walkId: number, onProgress?: (done: number, total: number) => void): Promise<string> {
  const parentId = parseFolderId((await getBackupSettings()).driveFolderUrl)
  if (!isDriveConfigured()) throw new Error('Falta configurar el acceso a Google Drive (VITE_GOOGLE_CLIENT_ID).')
  if (!parentId) throw new Error('Configura el enlace de la carpeta compartida en Google Drive y respaldo.')
  const { data, files, folder } = await packageFiles(walkId)
  const folderId = await ensureSubfolder(parentId, folder, data.walk.driveFolderId)
  const existing = await listChildren(folderId)
  for (const [i, f] of files.entries()) {
    onProgress?.(i, files.length)
    await upsertFile(folderId, f.name, f.blob, existing.get(f.name)?.id)
  }
  onProgress?.(files.length, files.length)
  await db.walks.update(walkId, { driveFolderId: folderId, driveUploadedAt: Date.now() })
  return folderLink(folderId)
}

/** Guarda PDF, fotos y firmas en una subcarpeta local; sin carpeta elegida, descarga el PDF. */
export async function saveInspectionLocal(walkId: number): Promise<'carpeta' | 'descarga'> {
  const { data, pdf, files, folder } = await packageFiles(walkId)
  const result = (await saveFilesLocal(folder, files)) ? 'carpeta' : 'descarga'
  if (result === 'descarga') downloadBlob(pdf, pdfFileName(data))
  await db.walks.update(walkId, { localSavedAt: Date.now() })
  return result
}

/** Comparte PDF y fotos con el menú del sistema (en móvil permite elegir Google Drive). */
export async function shareInspection(walkId: number): Promise<boolean> {
  const { files } = await packageFiles(walkId)
  const list = files.map((f) => new File([f.blob], f.name, { type: f.blob.type }))
  if (!navigator.canShare?.({ files: list })) return false
  await navigator.share({ files: list, title: files[0].name })
  return true
}

/** Exportación silenciosa al finalizar: sólo usa destinos ya autorizados, sin diálogos. */
export async function autoExportInspection(walkId: number): Promise<void> {
  const settings = await getBackupSettings()
  const { files, folder } = await packageFiles(walkId)
  await saveFilesLocal(folder, files, false).catch(() => false)
  if (hasDriveSession() && parseFolderId(settings.driveFolderUrl)) await uploadInspectionToDrive(walkId)
}
