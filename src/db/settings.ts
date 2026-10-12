import { useLiveQuery } from 'dexie-react-hooks'
import type { LegalAcceptance } from '../legal/documents'
import { db } from './schema'

export interface Profile {
  name: string
  company: string
  /** Firma del inspector en PNG (data URL) para aplicarla a las inspecciones. */
  signature?: string
}

export interface Brand {
  name: string
  color: string
  /** Logo propio en PNG (data URL); vacío usa el logo predeterminado. */
  logo: string
}

export const DEFAULT_BRAND: Brand = { name: 'NIVELA', color: '#1d4ed8', logo: '' }

export interface BackupSettings {
  driveFolderUrl: string
  driveAt: number | null
  localAt: number | null
  localFolderName: string
}

const DEFAULT_BACKUP: BackupSettings = {
  driveFolderUrl: import.meta.env.VITE_DRIVE_FOLDER_URL ?? '',
  driveAt: null,
  localAt: null,
  localFolderName: '',
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}

/** Perfil local: `undefined` mientras carga y `null` si aún no se ha creado. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(() => getSetting<Profile | null>('profile', null))
}

/** Aceptación del aviso y los términos: `undefined` mientras carga y `null` si no existe. */
export function useLegalAcceptance(): LegalAcceptance | null | undefined {
  return useLiveQuery(() => getSetting<LegalAcceptance | null>('legal', null))
}

/** Sesión local: `false` tras usar Salir; el perfil se conserva para volver a entrar rápido. */
export function useSessionActive(): boolean | undefined {
  return useLiveQuery(async () => (await getSetting<{ active: boolean }>('session', { active: true })).active)
}

export const setSessionActive = (active: boolean) => setSetting('session', { active })

/** Guarda nombre y empresa; si cambia la persona, descarta la firma guardada de la anterior. */
export async function saveProfile(name: string, company: string): Promise<void> {
  const current = await getSetting<Profile | null>('profile', null)
  const signature = current && current.name === name ? current.signature : undefined
  await setSetting('profile', { name, company, signature })
  await setSessionActive(true)
}

export async function getBrand(): Promise<Brand> {
  return { ...DEFAULT_BRAND, ...(await getSetting<Partial<Brand>>('brand', {})) }
}

/** Marca configurada; mientras carga devuelve la predeterminada. */
export function useBrand(): Brand {
  return useLiveQuery(() => getBrand(), [], DEFAULT_BRAND)
}

/** Actualiza la marca leyendo siempre el valor guardado para no perder cambios recientes. */
export async function updateBrand(patch: Partial<Brand>): Promise<void> {
  await setSetting('brand', { ...(await getBrand()), ...patch })
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const current = await getSetting<Profile>('profile', { name: '', company: '' })
  await setSetting('profile', { ...current, ...patch })
}

export function useBackupSettings(): BackupSettings | undefined {
  return useLiveQuery(() => getBackupSettings())
}

export async function getBackupSettings(): Promise<BackupSettings> {
  return { ...DEFAULT_BACKUP, ...(await getSetting<Partial<BackupSettings>>('backup', {})) }
}

export async function updateBackupSettings(patch: Partial<BackupSettings>): Promise<void> {
  await setSetting('backup', { ...(await getSetting<Partial<BackupSettings>>('backup', {})), ...patch })
}

/** Nombre del inspector para el historial de cambios. */
export async function currentUser(): Promise<string> {
  return (await getSetting<Profile | null>('profile', null))?.name ?? ''
}
