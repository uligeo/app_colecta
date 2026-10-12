import { CheckCircle2, CloudUpload, ExternalLink, FolderOpen, HardDrive, RotateCcw, Share2, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { importBackup } from '../db/backup'
import { updateBackupSettings, useBackupSettings } from '../db/settings'
import { canPickFolder, pickLocalFolder, runBackup, shareBackup } from '../lib/backupTargets'
import { downloadFile, isDriveConfigured, listBackups, parseFolderId, type DriveFile } from '../lib/drive'
import { timeAgo } from '../lib/time'

type Message = { kind: 'ok' | 'error'; text: string }

export function BackupPage() {
  const settings = useBackupSettings()
  const [folderInput, setFolderInput] = useState<string | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [busy, setBusy] = useState(false)
  const [driveFiles, setDriveFiles] = useState<DriveFile[] | null>(null)

  if (!settings) return null

  const folderUrl = folderInput ?? settings.driveFolderUrl
  const folderId = parseFolderId(settings.driveFolderUrl)
  const driveReady = isDriveConfigured() && !!folderId

  async function task(fn: () => Promise<string>) {
    setBusy(true)
    setMessage(null)
    try {
      setMessage({ kind: 'ok', text: await fn() })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Ocurrió un error.' })
    } finally {
      setBusy(false)
    }
  }

  const backupNow = (drive: boolean, local: boolean) =>
    task(async () => {
      const r = await runBackup({ drive, local })
      if (r.errors.length) throw new Error(r.errors.join(' '))
      const parts = [r.drive && 'Google Drive', r.local === 'carpeta' && 'carpeta local', r.local === 'descarga' && 'Descargas']
      return `Respaldo guardado en ${parts.filter(Boolean).join(' y ')}.`
    })

  async function removeFolder() {
    await updateBackupSettings({ driveFolderUrl: '' })
    setDriveFiles(null)
    setMessage({ kind: 'ok', text: 'Enlace de Drive eliminado.' })
  }

  async function saveFolder() {
    const value = (folderInput ?? '').trim()
    if (value && !parseFolderId(value)) return setMessage({ kind: 'error', text: 'El enlace no parece una carpeta de Google Drive.' })
    await updateBackupSettings({ driveFolderUrl: value })
    setFolderInput(null)
    setMessage({ kind: 'ok', text: 'Carpeta de Drive guardada.' })
  }

  const restore = (load: () => Promise<Blob>) =>
    task(async () => {
      if (!confirm('Restaurar reemplazará todos los datos de este dispositivo. ¿Continuar?')) return 'Restauración cancelada.'
      await importBackup(await load())
      setDriveFiles(null)
      return 'Respaldo restaurado correctamente.'
    })

  return (
    <>
      <AppHeader title="Respaldo" back="/mas" />
      <div className="content form-stack">
        <p className="muted small">
          La información vive en este dispositivo. Respáldala en Google Drive (principal) y en una copia local para no perderla.
        </p>
        <button className="btn primary block" disabled={busy} onClick={() => backupNow(driveReady, true)}>
          <CloudUpload size={18} /> Respaldar ahora{driveReady ? ' (Drive + local)' : ' (local)'}
        </button>
        {message && <p className={`toast ${message.kind === 'error' ? 'error' : ''}`} role="status">{message.text}</p>}

        <section className="card form-stack">
          <h3><CloudUpload size={18} /> Google Drive · carpeta compartida</h3>
          <p className="muted small">Aquí se suben los reportes en PDF con sus fotos (una carpeta por inspección) y los respaldos de datos.</p>
          <label>
            Enlace de la carpeta compartida
            <input value={folderUrl} placeholder="https://drive.google.com/drive/folders/…" onChange={(e) => setFolderInput(e.target.value)} />
          </label>
          <div className="actions tight">
            {folderInput !== null && <button className="btn primary sm" onClick={saveFolder}>Guardar enlace</button>}
            {folderId && (
              <a className="btn sm" href={`https://drive.google.com/drive/folders/${folderId}`} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Abrir carpeta
              </a>
            )}
            {settings.driveFolderUrl && folderInput === null && (
              <button className="btn ghost sm danger-text" onClick={removeFolder}>
                <Trash2 size={16} /> Quitar enlace
              </button>
            )}
          </div>
          <p className="muted small">
            {settings.driveAt ? <><CheckCircle2 size={14} /> Último respaldo en Drive {timeAgo(settings.driveAt)}</> : 'Sin respaldos en Drive todavía.'}
          </p>
          {isDriveConfigured() ? (
            <div className="actions tight">
              <button className="btn sm" disabled={busy || !folderId} onClick={() => backupNow(true, false)}>
                <Upload size={16} /> Respaldar en Drive
              </button>
              <button
                className="btn sm"
                disabled={busy || !folderId}
                onClick={() => task(async () => {
                  const files = await listBackups(folderId!)
                  setDriveFiles(files)
                  return files.length ? `${files.length} respaldos encontrados en Drive.` : 'La carpeta no tiene respaldos de la app.'
                })}
              >
                <RotateCcw size={16} /> Restaurar desde Drive
              </button>
            </div>
          ) : null}
          {driveFiles && driveFiles.length > 0 && (
            <ul className="menu-list">
              {driveFiles.map((f) => (
                <li key={f.id}>
                  <button type="button" disabled={busy} onClick={() => restore(() => downloadFile(f.id))}>
                    <RotateCcw size={18} />
                    <span><b>{f.name}</b><small>{new Date(f.createdTime).toLocaleString('es-MX')}{f.size ? ` · ${(Number(f.size) / 1e6).toFixed(1)} MB` : ''}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="btn soft sm" disabled={busy} onClick={() => task(async () => ((await shareBackup()) ? 'Respaldo compartido.' : 'Este navegador no permite compartir archivos; usa la copia local.'))}>
            <Share2 size={16} /> Compartir respaldo (elegir Drive)
          </button>
        </section>

        <section className="card form-stack">
          <h3><HardDrive size={18} /> Copia local</h3>
          {canPickFolder() ? (
            <>
              <p className="muted small">
                {settings.localFolderName ? <>Carpeta: <b>{settings.localFolderName}</b>. Cada respaldo se guarda ahí con fecha.</> : 'Elige una carpeta del equipo para guardar los respaldos automáticamente.'}
              </p>
              <button className="btn sm" disabled={busy} onClick={() => task(async () => { await pickLocalFolder(); return 'Carpeta local configurada.' })}>
                <FolderOpen size={16} /> {settings.localFolderName ? 'Cambiar carpeta' : 'Elegir carpeta'}
              </button>
            </>
          ) : (
            <p className="muted small">Este navegador descargará el respaldo a la carpeta de Descargas.</p>
          )}
          <p className="muted small">
            {settings.localAt ? <><CheckCircle2 size={14} /> Última copia local {timeAgo(settings.localAt)}</> : 'Sin copias locales todavía.'}
          </p>
          <div className="actions tight">
            <button className="btn sm" disabled={busy} onClick={() => backupNow(false, true)}>
              <HardDrive size={16} /> Guardar copia local
            </button>
            <label className="btn sm">
              <Upload size={16} /> Restaurar desde archivo
              <input type="file" accept="application/json,.json" hidden onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) restore(async () => file)
              }} />
            </label>
          </div>
        </section>
      </div>
    </>
  )
}
