import { isOverdue } from '../db/actions'
import { areaName, type Catalog } from '../db/catalog'
import { PRIORITY_LABEL, SNAG_STATUS_LABEL, type Contractor, type House, type Project, type Snag } from '../db/schema'

function cell(value: string | number): string {
  const text = String(value)
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Genera un CSV (UTF-8 con BOM para Excel) de los hallazgos indicados. */
export function snagsToCsv(
  snags: Snag[],
  projects: Map<number, Project>,
  houses: Map<number, House>,
  contractors: Map<number, Contractor>,
  catalog: Catalog,
): Blob {
  const header = [
    'Desarrollo', 'Vivienda', 'No.', 'Área', 'Elemento', 'Tipo de defecto', 'Ubicación', 'Descripción',
    'Severidad', 'Especialidad', 'Estado', 'Vencido', 'Contratista', 'Fecha compromiso', 'Registrado', 'Cerrado',
  ]
  const rows = snags.map((s) => [
    projects.get(s.projectId)?.name ?? '',
    houses.get(s.houseId)?.code ?? '',
    s.number,
    s.area ? areaName(catalog, s.area) : '',
    s.element,
    s.defectType,
    s.location,
    s.description,
    PRIORITY_LABEL[s.priority],
    s.trade,
    SNAG_STATUS_LABEL[s.status],
    isOverdue(s) ? 'Sí' : 'No',
    s.contractorId ? (contractors.get(s.contractorId)?.name ?? '') : '',
    s.dueDate,
    new Date(s.createdAt).toLocaleDateString('es-MX'),
    s.closedAt ? new Date(s.closedAt).toLocaleDateString('es-MX') : '',
  ])
  const text = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  return new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })
}
