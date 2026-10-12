import { CloudUpload, ExternalLink, FolderOpen, HardDrive, Share2 } from 'lucide-react'
import { useState } from 'react'
import type { Walk } from '../db/schema'
import { useBackupSettings } from '../db/settings'
import { canPickFolder, pickLocalFolder } from '../lib/backupTargets'
import { folderLink, isDriveConfigured, parseFolderId } from '../lib/drive'
import { saveInspectionLocal, shareInspection, uploadInspectionToDrive } from '../lib/inspectionExport'
import { timeAgo } from '../lib/time'

type Message = { kind: 'ok' | 'error'; text: string }

/** Guardado del reporte en este equipo (PDF, fotos y firmas); Drive sólo si está configurado. */
export function ExportPanel({ walk }: { walk: Walk }) {
  const settings = useBackupSettings()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const driveReady = isDriveConfigured() && !!parseFolderId(settings?.driveFolderUrl ?? '')
  const folderName = settings?.localFolderName

  async function run(label: string, fn: () => Promise<Message>) {
    setBusy(label)
    setMessage(null)
    try {
      setMessage(await fn())
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Ocurrió un error.' })
      }
    } finally {
      setBusy('')
    }
  }

  const saveLocal = () =>
    run('Guardando…', async () =>
      (await saveInspectionLocal(walk.id)) === 'carpeta'
        ? { kind: 'ok', text: `PDF, fotos y firmas guardados en la carpeta ${folderName}.` }
        : { kind: 'ok', text: 'PDF descargado en este equipo.' },
    )

  return (
    <section className="card form-stack no-print export-panel">
      <h3><HardDrive size={18} /> Guardar reporte</h3>
      <p className="muted small">
        {canPickFolder()
          ? folderName
            ? <>Se guarda en la carpeta <b>{folderName}</b>: una subcarpeta por inspección con el PDF, las fotos y las firmas.</>
            : 'Elige una carpeta del equipo para guardar el PDF con sus fotos y firmas; si no, sólo se descarga el PDF.'
          : 'El PDF se descarga en la carpeta de Descargas de este equipo.'}
      </p>
      <button type="button" className="btn primary block" disabled={!!busy} onClick={saveLocal}>
        <HardDrive size={18} /> {busy === 'Guardando…' ? busy : 'Guardar en este equipo'}
      </button>
      {walk.localSavedAt && <p className="muted small">Guardado {timeAgo(walk.localSavedAt)}</p>}
      <div className="actions tight">
        {canPickFolder() && (
          <button
            type="button"
            className="btn sm"
            disabled={!!busy}
            onClick={() => run('folder', async () => {
              await pickLocalFolder()
              return { kind: 'ok', text: 'Carpeta local configurada.' }
            })}
          >
            <FolderOpen size={16} /> {folderName ? 'Cambiar carpeta' : 'Elegir carpeta'}
          </button>
        )}
        <button
          type="button"
          className="btn sm"
          disabled={!!busy}
          onClick={() =>
            run('share', async () =>
              (await shareInspection(walk.id))
                ? { kind: 'ok', text: 'Reporte compartido.' }
                : { kind: 'error', text: 'Este navegador no permite compartir archivos. Usa Guardar en este equipo.' },
            )
          }
        >
          <Share2 size={16} /> Compartir
        </button>
        {driveReady && (
          <button
            type="button"
            className="btn sm"
            disabled={!!busy}
            onClick={() =>
              run('drive', async () => {
                await uploadInspectionToDrive(walk.id, (done, total) => setBusy(`Subiendo ${done}/${total}…`))
                return { kind: 'ok', text: 'PDF, fotos y firmas subidos a Google Drive.' }
              })
            }
          >
            <CloudUpload size={16} /> {busy.startsWith('Subiendo') ? busy : 'Subir a Drive'}
          </button>
        )}
      </div>
      {walk.driveFolderId && (
        <a className="link-btn" href={folderLink(walk.driveFolderId)} target="_blank" rel="noreferrer">
          Abrir carpeta de la inspección en Drive <ExternalLink size={12} />
        </a>
      )}
      {message && (
        <p className={`toast ${message.kind === 'error' ? 'error' : ''}`} role="status">
          {message.text}
        </p>
      )}
    </section>
  )
}
