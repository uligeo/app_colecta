import { compressImage } from '../lib/image'

interface PhotoPickerProps {
  onPick: (blobs: Blob[]) => void
  label?: string
}

/** Botón que abre la cámara o galería y entrega las imágenes ya comprimidas. */
export function PhotoPicker({ onPick, label = '+ Foto' }: PhotoPickerProps) {
  async function handle(input: HTMLInputElement) {
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length) onPick(await Promise.all(files.map(compressImage)))
  }

  return (
    <label className="photo-add">
      {label}
      <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => handle(e.target)} />
    </label>
  )
}
