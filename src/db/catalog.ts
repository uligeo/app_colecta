import type { Priority } from './schema'

export const TRADES = [
  'Albañilería',
  'Acabados y pintura',
  'Pisos y azulejo',
  'Plomería',
  'Eléctrico',
  'Carpintería',
  'Cancelería y vidrio',
  'Herrería',
  'Impermeabilización',
  'Gas',
  'Exteriores',
  'Limpieza',
  'Otros',
] as const

interface ElementTemplate {
  trade: string
  items: string[]
  defects: string[]
}

/** Plantillas de elementos: puntos del checklist y tipos de defecto frecuentes. */
const ELEMENT_TEMPLATES: Record<string, ElementTemplate> = {
  Fachada: {
    trade: 'Albañilería',
    items: ['Acabado sin grietas', 'Pintura uniforme', 'Numeración visible'],
    defects: ['Grieta', 'Pintura manchada', 'Desprendimiento'],
  },
  'Cochera y banqueta': {
    trade: 'Exteriores',
    items: ['Firme sin fisuras', 'Pendiente correcta', 'Banqueta terminada'],
    defects: ['Fisura', 'Encharcamiento', 'Desnivel'],
  },
  Jardín: {
    trade: 'Exteriores',
    items: ['Área verde terminada', 'Bardas completas'],
    defects: ['Falta jardinería', 'Barda dañada'],
  },
  Pisos: {
    trade: 'Pisos y azulejo',
    items: ['Nivelación correcta', 'Sin piezas estrelladas o huecas', 'Juntas en buen estado', 'Zoclo completo'],
    defects: ['Pieza estrellada', 'Pieza hueca', 'Junta abierta', 'Desnivel', 'Falta zoclo', 'Mancha'],
  },
  Muros: {
    trade: 'Albañilería',
    items: ['Sin humedad', 'Acabado uniforme', 'Sin fisuras', 'Pintura sin manchas'],
    defects: ['Grieta', 'Fisura', 'Humedad', 'Pintura manchada', 'Desplome', 'Golpe'],
  },
  'Plafón / Techo': {
    trade: 'Acabados y pintura',
    items: ['Sin manchas', 'Sin fisuras', 'Luminarias alineadas'],
    defects: ['Mancha de humedad', 'Fisura', 'Pintura incompleta'],
  },
  Puertas: {
    trade: 'Carpintería',
    items: ['Abre y cierra sin rozar', 'Chapa y llaves funcionan', 'Bisagras firmes', 'Sin golpes ni rayones'],
    defects: ['Roza', 'No cierra', 'Chapa dañada', 'Rayón', 'Golpe', 'Bisagra floja'],
  },
  Ventanas: {
    trade: 'Cancelería y vidrio',
    items: ['Deslizan correctamente', 'Sin filtraciones', 'Vidrios sin rayones', 'Sellos completos'],
    defects: ['No desliza', 'Filtración', 'Vidrio rayado', 'Falta sello', 'Falta mosquitero'],
  },
  Closet: {
    trade: 'Carpintería',
    items: ['Puertas alineadas', 'Entrepaños firmes'],
    defects: ['Puerta desalineada', 'Entrepaño suelto', 'Rayón'],
  },
  'Muebles de cocina': {
    trade: 'Carpintería',
    items: ['Gabinetes alineados', 'Cubierta sin daños', 'Tarja sellada y sin fugas'],
    defects: ['Gabinete desalineado', 'Cubierta dañada', 'Falta sellado', 'Fuga en tarja'],
  },
  'Muebles sanitarios': {
    trade: 'Plomería',
    items: ['WC sin fugas', 'Descarga correcta', 'Lavabo sin goteo', 'Llaves funcionan'],
    defects: ['Fuga en llave', 'Fuga en WC', 'Descarga deficiente', 'Goteo'],
  },
  Regadera: {
    trade: 'Plomería',
    items: ['Presión adecuada', 'Agua caliente', 'Coladera con pendiente', 'Cancel sellado'],
    defects: ['Baja presión', 'Sin agua caliente', 'Encharcamiento', 'Filtración'],
  },
  Lavadero: {
    trade: 'Plomería',
    items: ['Lavadero firme', 'Toma de lavadora', 'Desagüe funciona'],
    defects: ['Lavadero flojo', 'Fuga', 'Desagüe tapado'],
  },
  Eléctrica: {
    trade: 'Eléctrico',
    items: ['Contactos con voltaje', 'Apagadores funcionan', 'Luminarias encienden', 'Centro de carga identificado', 'Timbre funciona'],
    defects: ['Contacto sin corriente', 'Apagador no funciona', 'Falta tapa', 'Luminaria no enciende'],
  },
  Hidráulica: {
    trade: 'Plomería',
    items: ['Tinaco o cisterna limpios', 'Calentador funcionando', 'Sin fugas visibles', 'Llaves de paso'],
    defects: ['Fuga', 'Baja presión', 'Calentador no enciende'],
  },
  Gas: {
    trade: 'Gas',
    items: ['Prueba de hermeticidad', 'Llave de paso', 'Conexiones selladas'],
    defects: ['Fuga de gas', 'Falta llave de paso', 'Conexión sin sellar'],
  },
  Sanitaria: {
    trade: 'Plomería',
    items: ['Registros limpios', 'Desagües sin obstrucción'],
    defects: ['Registro obstruido', 'Mal olor', 'Desagüe lento'],
  },
  Impermeabilización: {
    trade: 'Impermeabilización',
    items: ['Impermeabilizante completo', 'Sin encharcamientos', 'Pretiles sellados', 'Bajadas pluviales libres'],
    defects: ['Encharcamiento', 'Impermeabilizante incompleto', 'Bajada obstruida'],
  },
}

export const AREA_ICONS = {
  exterior: 'Exterior',
  sala: 'Sala',
  cocina: 'Cocina',
  recamara: 'Recámara',
  bano: 'Baño',
  lavado: 'Lavado',
  instalaciones: 'Instalaciones',
  azotea: 'Azotea',
} as const

export type AreaIcon = keyof typeof AREA_ICONS

export interface CheckItem {
  /** Identificador estable: las marcas y hallazgos se conservan aunque cambie el texto. */
  id: string
  text: string
}

export interface ElementDef {
  name: string
  trade: string
  items: CheckItem[]
  defects: string[]
}

export interface AreaDef {
  id: string
  name: string
  subtitle: string
  icon: AreaIcon
  elements: ElementDef[]
}

export interface Catalog {
  areas: AreaDef[]
}

const AREA_TEMPLATES: { id: string; name: string; subtitle: string; icon: AreaIcon; elements: string[] }[] = [
  { id: 'exterior', name: 'Exterior', subtitle: 'Fachada, cochera, jardín', icon: 'exterior', elements: ['Fachada', 'Cochera y banqueta', 'Jardín'] },
  { id: 'sala', name: 'Sala / Comedor', subtitle: 'Pisos, muros, plafón, ventanas', icon: 'sala', elements: ['Pisos', 'Muros', 'Plafón / Techo', 'Ventanas', 'Puertas'] },
  { id: 'cocina', name: 'Cocina', subtitle: 'Muebles, instalaciones, acabados', icon: 'cocina', elements: ['Pisos', 'Muros', 'Plafón / Techo', 'Muebles de cocina', 'Gas'] },
  { id: 'recamara_principal', name: 'Recámara principal', subtitle: 'Pisos, muros, puertas, closet', icon: 'recamara', elements: ['Pisos', 'Muros', 'Plafón / Techo', 'Ventanas', 'Puertas', 'Closet'] },
  { id: 'recamaras', name: 'Recámaras secundarias', subtitle: 'Pisos, muros, puertas, closet', icon: 'recamara', elements: ['Pisos', 'Muros', 'Ventanas', 'Puertas', 'Closet'] },
  { id: 'banos', name: 'Baños', subtitle: 'Pisos, muros, muebles, regadera', icon: 'bano', elements: ['Pisos', 'Muros', 'Muebles sanitarios', 'Regadera'] },
  { id: 'lavado', name: 'Cuarto de lavado', subtitle: 'Lavadero, conexiones, pisos', icon: 'lavado', elements: ['Lavadero', 'Pisos'] },
  { id: 'instalaciones', name: 'Instalaciones', subtitle: 'Eléctrica, hidráulica, sanitaria', icon: 'instalaciones', elements: ['Eléctrica', 'Hidráulica', 'Sanitaria'] },
  { id: 'azotea', name: 'Azotea', subtitle: 'Impermeabilización y pretiles', icon: 'azotea', elements: ['Impermeabilización'] },
]

/**
 * Checklist inicial. Los identificadores de los puntos conservan el formato `área|elemento|punto`
 * de versiones previas para que las inspecciones existentes mantengan sus marcas.
 */
export const DEFAULT_CATALOG: Catalog = {
  areas: AREA_TEMPLATES.map((a) => ({
    ...a,
    elements: a.elements.map((name) => {
      const t = ELEMENT_TEMPLATES[name]
      return {
        name,
        trade: t.trade,
        defects: [...t.defects],
        items: t.items.map((text) => ({ id: `${a.id}|${name}|${text}`, text })),
      }
    }),
  })),
}

export function findArea(catalog: Catalog, id: string): AreaDef | undefined {
  return catalog.areas.find((a) => a.id === id)
}

export function findElement(catalog: Catalog, areaId: string, name: string): ElementDef | undefined {
  return findArea(catalog, areaId)?.elements.find((e) => e.name === name)
}

export function areaName(catalog: Catalog, id: string): string {
  return findArea(catalog, id)?.name ?? id
}

/** Identificadores de todos los puntos revisables de un área. */
export function areaItems(area: AreaDef): string[] {
  return area.elements.flatMap((el) => el.items.map((i) => i.id))
}

/** Días para la fecha compromiso de corrección según la severidad. */
export const PRIORITY_DAYS: Record<Priority, number> = {
  alta: 3,
  media: 7,
  baja: 14,
}
