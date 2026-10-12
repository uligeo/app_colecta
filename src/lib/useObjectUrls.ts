import { useEffect, useState } from 'react'

/** Crea URLs temporales para blobs y las libera al cambiar o desmontar. */
export function useObjectUrls(items: { id: number; blob: Blob }[]) {
  const [urls, setUrls] = useState<{ id: number; url: string }[]>([])

  useEffect(() => {
    const next = items.map((i) => ({ id: i.id, url: URL.createObjectURL(i.blob) }))
    // Las URLs de blob son un recurso externo que debe crearse y liberarse junto con el efecto.
    // oxlint-disable-next-line react/set-state-in-effect
    setUrls(next)
    return () => next.forEach((u) => URL.revokeObjectURL(u.url))
  }, [items])

  return urls
}
