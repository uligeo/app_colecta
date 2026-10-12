import { useLiveQuery } from 'dexie-react-hooks'
import { uid } from '../lib/uid'
import { DEFAULT_CATALOG, type AreaDef, type AreaIcon, type Catalog, type ElementDef } from './catalog'
import { getSetting, setSetting } from './settings'

const KEY = 'catalog'

/** Checklist vigente guardado en IndexedDB; si no se ha editado, el predeterminado. */
export async function getCatalog(): Promise<Catalog> {
  return getSetting<Catalog>(KEY, DEFAULT_CATALOG)
}

export function useCatalog(): Catalog {
  return useLiveQuery(() => getCatalog(), [], DEFAULT_CATALOG)
}

/** Aplica un cambio sobre una copia del checklist guardado y lo persiste. */
async function mutate(fn: (c: Catalog) => void): Promise<void> {
  const copy = structuredClone(await getCatalog())
  fn(copy)
  await setSetting(KEY, copy)
}

function area(c: Catalog, areaId: string): AreaDef {
  const a = c.areas.find((x) => x.id === areaId)
  if (!a) throw new Error('El área ya no existe.')
  return a
}

function element(c: Catalog, areaId: string, name: string): ElementDef {
  const e = area(c, areaId).elements.find((x) => x.name === name)
  if (!e) throw new Error('El elemento ya no existe.')
  return e
}

function assertUniqueElement(a: AreaDef, name: string, except?: string) {
  if (a.elements.some((e) => e.name.toLowerCase() === name.toLowerCase() && e.name !== except)) {
    throw new Error(`Ya existe el elemento "${name}" en ${a.name}.`)
  }
}

export async function addArea(input: { name: string; subtitle: string; icon: AreaIcon }): Promise<string> {
  const id = `area-${uid()}`
  await mutate((c) => c.areas.push({ id, ...input, elements: [] }))
  return id
}

export const updateArea = (areaId: string, patch: Partial<Pick<AreaDef, 'name' | 'subtitle' | 'icon'>>) =>
  mutate((c) => Object.assign(area(c, areaId), patch))

export const deleteArea = (areaId: string) => mutate((c) => (c.areas = c.areas.filter((a) => a.id !== areaId)))

export const moveArea = (areaId: string, delta: -1 | 1) =>
  mutate((c) => {
    const i = c.areas.findIndex((a) => a.id === areaId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= c.areas.length) return
    ;[c.areas[i], c.areas[j]] = [c.areas[j], c.areas[i]]
  })

export const addElement = (areaId: string, name: string, trade: string) =>
  mutate((c) => {
    const a = area(c, areaId)
    assertUniqueElement(a, name)
    a.elements.push({ name, trade, items: [], defects: [] })
  })

export const updateElement = (areaId: string, name: string, patch: Partial<Pick<ElementDef, 'name' | 'trade' | 'defects'>>) =>
  mutate((c) => {
    if (patch.name) assertUniqueElement(area(c, areaId), patch.name, name)
    Object.assign(element(c, areaId, name), patch)
  })

export const deleteElement = (areaId: string, name: string) =>
  mutate((c) => {
    const a = area(c, areaId)
    a.elements = a.elements.filter((e) => e.name !== name)
  })

export const addItem = (areaId: string, elementName: string, text: string) =>
  mutate((c) => element(c, areaId, elementName).items.push({ id: `item-${uid()}`, text }))

export const updateItem = (areaId: string, elementName: string, itemId: string, text: string) =>
  mutate((c) => {
    const item = element(c, areaId, elementName).items.find((i) => i.id === itemId)
    if (item) item.text = text
  })

export const deleteItem = (areaId: string, elementName: string, itemId: string) =>
  mutate((c) => {
    const e = element(c, areaId, elementName)
    e.items = e.items.filter((i) => i.id !== itemId)
  })

export const resetCatalog = () => setSetting(KEY, DEFAULT_CATALOG)
