import { Check, CloudUpload, HardDrive, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Walk } from '../db/schema'
import { useBackupSettings } from '../db/settings'
import { canPickFolder } from '../lib/backupTargets'
import { folderLink, isDriveConfigured, parseFolderId, prepareDrive } from '../lib/drive'
import { saveInspectionLocal, uploadInspectionToDrive } from '../lib/inspectionExport'
import { timeAgo } from '../lib/time'

type State = { kind: 'idle' | 'busy' | 'ok' | 'error'; text: string }

/**
 * Acciones de archivo en la tarjeta de inspección: guarda el PDF, las fotos y las firmas en la carpeta
 * local elegida (o descarga el PDF). La subida a Google Drive sólo aparece si está activada.
 */
export function InspectionFileActions({ walk }: { walk: Walk }) {
  const settings = useBackupSettings()
  const [state, setState] = useState<State>({ kind: 'idle', text: '' })
  const hasFolder = !!parseFolderId(settings?.driveFolderUrl ?? '')
  const driveEnabled = isDriveConfigured()

  useEffect(() => {
    prepareDrive().catch(() => undefined)
  }, [])

  async function run(fn: () => Promise<string>) {
    setState({ kind: 'busy', text: 'Generando PDF…' })
    try {
      setState({ kind: 'ok', text: await fn() })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return setState({ kind: 'idle', text: '' })
      setState({ kind: 'error', text: err instanceof Error ? err.message : 'No se pudo guardar.' })
    }
  }

  const saveLocal = () =>
    run(async () =>
      (await saveInspectionLocal(walk.id)) === 'carpeta'
        ? `Guardado en ${settings?.localFolderName || 'la carpeta local'}`
        : canPickFolder()
          ? 'PDF descargado (elige una carpeta en Respaldo para guardar también las fotos)'
          : 'PDF descargado',
    )

  const upload = () =>
    hasFolder
      ? run(async () => {
          await uploadInspectionToDrive(walk.id, (done, total) => setState({ kind: 'busy', text: `Subiendo ${done}/${total}…` }))
          return 'Subido a Drive'
        })
      : setState({ kind: 'error', text: 'Agrega tu carpeta de Google Drive en Más → Respaldo.' })

  const last = driveEnabled && walk.driveUploadedAt
    ? `En Drive ${timeAgo(walk.driveUploadedAt)}`
    : walk.localSavedAt
      ? `Guardado ${timeAgo(walk.localSavedAt)}`
      : 'Sin guardar'
  const busy = state.kind === 'busy'

  return (
    <div className="card-footer">
      <span className={`small ${state.kind === 'error' ? 'text-alta' : 'muted'}`} role="status">
        {state.kind === 'idle' ? last : state.text}
      </span>
      <div className="actions tight">
        {driveEnabled && (
          <button type="button" className="btn soft sm" disabled={busy} onClick={upload}>
            <CloudUpload size={16} /> Subir a Drive
          </button>
        )}
        {driveEnabled && walk.driveFolderId && (
          <a className="link-btn" href={folderLink(walk.driveFolderId)} target="_blank" rel="noreferrer">
            Ver en Drive
          </a>
        )}
        <button type="button" className="btn soft sm" disabled={busy} onClick={saveLocal}>
          {busy ? <Loader2 size={16} className="spin" /> : state.kind === 'ok' ? <Check size={16} /> : <HardDrive size={16} />}
          Guardar PDF
        </button>
      </div>
    </div>
  )
}
