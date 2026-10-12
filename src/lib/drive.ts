/**
 * Integración mínima con Google Drive desde el navegador mediante Google Identity Services.
 * Requiere `VITE_GOOGLE_CLIENT_ID` (cliente OAuth tipo "Aplicación web").
 */

const SCOPE = 'https://www.googleapis.com/auth/drive'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void
}

interface GoogleOAuth {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (r: TokenResponse) => void
        error_callback?: (e: { type?: string; message?: string }) => void
      }) => TokenClient
    }
  }
}

export interface DriveFile {
  id: string
  name: string
  createdTime: string
  size?: string
}

let token: { value: string; expiresAt: number } | null = null

export const driveClientId: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export const DRIVE_NOT_ENABLED = 'La subida a Google Drive no está disponible. Guarda el reporte en este equipo.'

export function isDriveConfigured(): boolean {
  return driveClientId.length > 0
}

export function hasDriveSession(): boolean {
  return !!token && token.expiresAt > Date.now() + 60_000
}

/** Extrae el ID de carpeta de un enlace de Google Drive (o acepta el ID directamente). */
export function parseFolderId(input: string): string | null {
  const text = input.trim()
  const match = text.match(/\/folders\/([\w-]{10,})/) ?? text.match(/[?&]id=([\w-]{10,})/)
  if (match) return match[1]
  return /^[\w-]{10,}$/.test(text) ? text : null
}

let gisPromise: Promise<GoogleOAuth> | null = null
let tokenClient: TokenClient | null = null
let pending: { resolve: (t: string) => void; reject: (e: Error) => void }[] = []

function settle(fn: (p: (typeof pending)[number]) => void) {
  const list = pending
  pending = []
  list.forEach(fn)
}

function loadGis(): Promise<GoogleOAuth> {
  const w = window as unknown as { google?: GoogleOAuth }
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google)
  gisPromise ??= new Promise<GoogleOAuth>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => (w.google ? resolve(w.google) : reject(new Error('No se pudo cargar Google.')))
    script.onerror = () => {
      gisPromise = null
      reject(new Error('Sin conexión con Google. Revisa tu internet.'))
    }
    document.head.appendChild(script)
  })
  return gisPromise
}

/**
 * Carga Google con anticipación. En el teléfono la ventana de permiso sólo se abre si se pide
 * en el mismo toque del usuario, así que el cliente debe estar listo antes de presionar el botón.
 */
export async function prepareDrive(): Promise<void> {
  if (!isDriveConfigured() || tokenClient) return
  const google = await loadGis()
  tokenClient ??= google.accounts.oauth2.initTokenClient({
    client_id: driveClientId,
    scope: SCOPE,
    callback: (r) => {
      if (r.error) return settle((p) => p.reject(new Error(r.error_description ?? r.error)))
      token = { value: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 }
      settle((p) => p.resolve(r.access_token))
    },
    error_callback: (e) => settle((p) => p.reject(new Error(e.message ?? 'Autorización cancelada.'))),
  })
}

/**
 * Obtiene un token de acceso; abre la ventana de autorización de Google si hace falta.
 * Debe llamarse al inicio del manejador del clic, antes de cualquier otra espera.
 */
export function getAccessToken(): Promise<string> {
  if (hasDriveSession()) return Promise.resolve(token!.value)
  if (!isDriveConfigured()) return Promise.reject(new Error(DRIVE_NOT_ENABLED))
  return new Promise((resolve, reject) => {
    pending.push({ resolve, reject })
    if (pending.length > 1) return
    if (tokenClient) return tokenClient.requestAccessToken()
    prepareDrive()
      .then(() => tokenClient?.requestAccessToken())
      .catch((e: Error) => settle((p) => p.reject(e)))
  })
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const access = await getAccessToken()
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${access}` } })
  if (res.ok) return res
  if (res.status === 401) token = null
  let message = `Error ${res.status} de Google Drive.`
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    if (body.error?.message) message = body.error.message
  } catch {
    /* La respuesta de error no siempre es JSON. */
  }
  if (res.status === 404) message = 'No se encontró la carpeta o tu cuenta no tiene permiso de edición.'
  throw new Error(message)
}

/** Carga reanudable (admite archivos grandes): crea un archivo nuevo o reemplaza el contenido de uno existente. */
async function resumableUpload(blob: Blob, metadata: object, fileId?: string): Promise<DriveFile> {
  const url = fileId ? `${UPLOAD}/${fileId}` : UPLOAD
  const init = await driveFetch(`${url}?uploadType=resumable&supportsAllDrives=true`, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': blob.type || 'application/octet-stream' },
    body: JSON.stringify(metadata),
  })
  const location = init.headers.get('Location')
  if (!location) throw new Error('Google Drive no devolvió la dirección de carga.')
  const res = await fetch(location, { method: 'PUT', body: blob })
  if (!res.ok) throw new Error(`La carga a Google Drive falló (${res.status}).`)
  return (await res.json()) as DriveFile
}

export function uploadToFolder(folderId: string, name: string, blob: Blob): Promise<DriveFile> {
  return resumableUpload(blob, { name, parents: [folderId], mimeType: blob.type })
}

/** Sube el archivo o, si ya existe uno con ese nombre en la carpeta, reemplaza su contenido. */
export function upsertFile(folderId: string, name: string, blob: Blob, existingId?: string): Promise<DriveFile> {
  return existingId ? resumableUpload(blob, { name }, existingId) : uploadToFolder(folderId, name, blob)
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/** Archivos (no eliminados) dentro de una carpeta, indexados por nombre. */
export async function listChildren(folderId: string): Promise<Map<string, DriveFile>> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const res = await driveFetch(`${API}/files?q=${q}&pageSize=1000&fields=files(id,name,createdTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`)
  const files = ((await res.json()) as { files: DriveFile[] }).files
  return new Map(files.map((f) => [f.name, f]))
}

/** Busca una subcarpeta por nombre dentro de la carpeta principal o la crea. */
export async function ensureSubfolder(parentId: string, name: string, knownId: string | null): Promise<string> {
  if (knownId) {
    try {
      const res = await driveFetch(`${API}/files/${knownId}?fields=id,trashed&supportsAllDrives=true`)
      const f = (await res.json()) as { id: string; trashed?: boolean }
      if (!f.trashed) return f.id
    } catch {
      /* La carpeta guardada ya no existe; se busca o se crea de nuevo. */
    }
  }
  const q = encodeURIComponent(
    `'${parentId}' in parents and name = '${escapeQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  )
  const found = await driveFetch(`${API}/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`)
  const existing = ((await found.json()) as { files: { id: string }[] }).files[0]
  if (existing) return existing.id
  const res = await driveFetch(`${API}/files?supportsAllDrives=true&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  })
  return ((await res.json()) as { id: string }).id
}

export function folderLink(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`
}

/** Lista los respaldos de la app en la carpeta, del más reciente al más antiguo. */
export async function listBackups(folderId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and name contains 'nivela-respaldo' and trashed = false`)
  const res = await driveFetch(
    `${API}/files?q=${q}&orderBy=createdTime desc&pageSize=20&fields=files(id,name,createdTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  )
  return ((await res.json()) as { files: DriveFile[] }).files
}

export async function downloadFile(fileId: string): Promise<Blob> {
  const res = await driveFetch(`${API}/files/${fileId}?alt=media&supportsAllDrives=true`)
  return res.blob()
}
