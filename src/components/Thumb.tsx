import { useLiveQuery } from 'dexie-react-hooks'
import { ImageOff } from 'lucide-react'
import { useMemo } from 'react'
import { db } from '../db/schema'
import { useObjectUrls } from '../lib/useObjectUrls'

const NONE: never[] = []

/** Miniatura con la primera foto de un hallazgo o una imagen dada. */
export function Thumb({ snagId, blob, size = 56 }: { snagId?: number; blob?: Blob | null; size?: number }) {
  const photo = useLiveQuery(
    () => (snagId ? db.photos.where('snagId').equals(snagId).first() : undefined),
    [snagId],
  )
  const source = blob ?? photo?.blob
  const items = useMemo(() => (source ? [{ id: 0, blob: source }] : NONE), [source])
  const url = useObjectUrls(items)[0]?.url
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" /> : <ImageOff size={size / 2.6} />}
    </span>
  )
}
