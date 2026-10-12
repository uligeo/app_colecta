import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'

/** Carga una inspección con su vivienda, desarrollo y los hallazgos de la vivienda. */
export function useInspection(walkId: number) {
  return useLiveQuery(async () => {
    const walk = await db.walks.get(walkId)
    if (!walk) return null
    const house = await db.houses.get(walk.houseId)
    const [project, houseSnags] = await Promise.all([
      house ? db.projects.get(house.projectId) : undefined,
      db.snags.where('houseId').equals(walk.houseId).sortBy('number'),
    ])
    return { walk, house, project, houseSnags, snags: houseSnags.filter((s) => s.walkId === walkId) }
  }, [walkId])
}

/** Alterna un punto del checklist de forma atómica para evitar escrituras perdidas. */
export function toggleCheck(walkId: number, key: string, value?: boolean) {
  return db.walks
    .where('id')
    .equals(walkId)
    .modify((w) => {
      w.checks = { ...w.checks, [key]: value ?? !w.checks[key] }
    })
}
