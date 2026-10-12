import type { Brand } from '../db/settings'

const LOGO_PATHS = ['M6 22 24 7l18 15', 'M11 19v21h9V29h8v11h9V19']

/** Texto blanco u oscuro según la luminancia del color de fondo. */
export function contrastText(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0f172a' : '#ffffff'
}

/** Aplica el color y el nombre de la marca a la interfaz. */
export function applyBrand(brand: Brand): void {
  const root = document.documentElement.style
  root.setProperty('--primary', brand.color)
  root.setProperty('--primary-text', contrastText(brand.color))
  document.title = `${brand.name} · Inspección de viviendas`
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', brand.color)
}

export function logoSvg(color: string, size = 48): string {
  const paths = LOGO_PATHS.map(
    (d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">${paths}</svg>`
}

/** Logo de la marca como PNG (data URL): el propio o el predeterminado con el color de marca. */
export async function brandLogoPng(brand: Brand, size = 256): Promise<string> {
  const src = brand.logo || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(brand.color, size))}`
  const img = new Image()
  img.src = src
  await img.decode()
  const canvas = document.createElement('canvas')
  const scale = size / Math.max(img.naturalWidth || size, img.naturalHeight || size)
  canvas.width = Math.round((img.naturalWidth || size) * scale)
  canvas.height = Math.round((img.naturalHeight || size) * scale)
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/** Reduce un logo subido a PNG cuadrado de hasta 256 px para guardarlo en los ajustes. */
export async function logoFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    return await brandLogoPng({ name: '', color: '#000', logo: url }, 256)
  } finally {
    URL.revokeObjectURL(url)
  }
}
