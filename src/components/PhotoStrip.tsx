import { useLiveQuery } from 'dexie-react-hooks'
import { addPhotos } from '../db/actions'
import { db, type PhotoKind } from '../db/schema'
import { useObjectUrls } from '../lib/useObjectUrls'
import { PhotoPicker } from './PhotoPicker'

const NONE: never[] = []

interface PhotoStripProps {
  snagId: number
  kind: PhotoKind
  readOnly?: boolean
  title?: string
}

/** Fotos guardadas de una observación (antes o después). */
export function PhotoStrip({ snagId, kind, readOnly, title }: PhotoStripProps) {
  const photos = useLiveQuery(() => db.photos.where('snagId').equals(snagId).filter((p) => p.kind === kind).toArray(), [snagId, kind])
  const urls = useObjectUrls(photos ?? NONE)

  if (readOnly && urls.length === 0) return null

  return (
    <div className="photos">
      {title && <span className="photos-title">{title}</span>}
      {urls.map((u) => (
        <figure key={u.id}>
          <a href={u.url} target="_blank" rel="noreferrer">
            <img src={u.url} alt={`Foto ${kind}`} />
          </a>
          {!readOnly && (
            <button type="button" className="photo-del" onClick={() => db.photos.delete(u.id)} aria-label="Eliminar foto">
              ×
            </button>
          )}
        </figure>
      ))}
      {!readOnly && <PhotoPicker onPick={(blobs) => addPhotos(snagId, kind, blobs)} />}
    </div>
  )
}
