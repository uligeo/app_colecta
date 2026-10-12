/** Versión vigente de los documentos legales; al cambiarla se vuelve a pedir la aceptación. */
export const LEGAL_VERSION = '2026-10-12'

export const LEGAL_DOCS = {
  privacidad: { title: 'Aviso de privacidad', file: 'legal/privacidad.md' },
  terminos: { title: 'Términos y deslinde', file: 'legal/terminos.md' },
} as const

export type LegalDoc = keyof typeof LEGAL_DOCS

export interface LegalAcceptance {
  version: string
  acceptedAt: number
}

/** Leyenda breve para reportes y PDF. */
export const REPORT_DISCLAIMER =
  'Documento informativo elaborado por quien realizó la inspección. No constituye dictamen pericial, peritaje estructural ni certificación de cumplimiento normativo.'

export async function loadLegalDoc(doc: LegalDoc): Promise<string> {
  const res = await fetch(`${import.meta.env.BASE_URL}${LEGAL_DOCS[doc].file}`)
  if (!res.ok) throw new Error('No se pudo cargar el documento.')
  return res.text()
}
