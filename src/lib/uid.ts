/** Identificador corto único; funciona también fuera de contextos seguros (http por IP). */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
