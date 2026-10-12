import type { jsPDF as JsPdf } from 'jspdf'
import { checklistProgress, formatDate, reviewedKeys } from '../db/actions'
import { areaItems, areaName } from '../db/catalog'
import { PRIORITY_LABEL, SNAG_STATUS_LABEL, WALK_TYPE_LABEL, type Snag } from '../db/schema'
import { brandLogoPng } from './brand'
import type { InspectionData } from './inspectionData'

const M = 15
const PAGE_W = 210
const PAGE_H = 297
const CW = PAGE_W - 2 * M
const BOTTOM = PAGE_H - 18
const MUTED = '#64748b'
const TEXT = '#0f172a'
const BORDER = '#e2e8f0'
const SEVERITY: Record<string, { color: string; bg: string }> = {
  alta: { color: '#e5484d', bg: '#fdecec' },
  media: { color: '#d97706', bg: '#fff4e0' },
  baja: { color: '#16a34a', bg: '#e7f6ec' },
}
const SEVERITY_ORDER = { alta: 0, media: 1, baja: 2 }

interface Img {
  data: string
  w: number
  h: number
}

/** Las fuentes estándar de PDF no incluyen algunos signos tipográficos. */
function clean(text: string): string {
  return text.replace(/[—–]/g, '-').replace(/…/g, '...').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
}

async function toImg(source: Blob | string): Promise<Img> {
  const data =
    typeof source === 'string'
      ? source
      : await new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result as string)
          r.onerror = () => reject(r.error)
          r.readAsDataURL(source)
        })
  const el = new Image()
  el.src = data
  await el.decode()
  return { data, w: el.naturalWidth, h: el.naturalHeight }
}

function format(img: Img): 'PNG' | 'JPEG' {
  return img.data.startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

/** Genera el PDF del reporte de una inspección. */
export async function buildInspectionPdf(d: InspectionData): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc: JsPdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  let y = M

  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage()
      y = M
    }
  }
  const write = (text: string, size: number, opts: { bold?: boolean; color?: string; x?: number; width?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(opts.color ?? TEXT)
    const lines = doc.splitTextToSize(clean(text), opts.width ?? CW) as string[]
    const lh = size * 0.42
    ensure(lines.length * lh)
    doc.text(lines, opts.x ?? M, y + lh * 0.8)
    y += lines.length * lh + 1
  }
  const heading = (text: string) => {
    ensure(14)
    y += 4
    write(text, 12, { bold: true })
    y += 1
  }
  const fit = (img: Img, maxW: number, maxH: number) => {
    const s = Math.min(maxW / img.w, maxH / img.h)
    return { w: img.w * s, h: img.h * s }
  }

  const { walk, house, project, snags, others, contractors, photos, brand, catalog } = d

  // Encabezado con marca
  const logo = await toImg(await brandLogoPng(brand, 256))
  const lf = fit(logo, 20, 20)
  doc.addImage(logo.data, 'PNG', M, y, lf.w, lf.h)
  const x = M + 25
  const top = y
  write(brand.name, 15, { bold: true, color: brand.color, x })
  write('REPORTE DE INSPECCIÓN DE VIVIENDA', 10, { bold: true, x })
  write(`${project?.name ?? ''} · ${house?.code ?? ''}`, 10, { x })
  if (house?.address) write(house.address, 9, { color: MUTED, x })
  y = Math.max(y, top + 22) + 2
  doc.setDrawColor(BORDER)
  doc.line(M, y, PAGE_W - M, y)
  y += 4

  if (house?.photo) {
    const cover = await toImg(house.photo)
    const c = fit(cover, CW, 70)
    ensure(c.h + 4)
    doc.addImage(cover.data, format(cover), M + (CW - c.w) / 2, y, c.w, c.h)
    y += c.h + 4
  }

  const meta: [string, string][] = [
    ['Cliente', house?.ownerName || '-'],
    ['Fecha de inspección', formatDate(walk.date)],
    ['Inspector', walk.inspector || '-'],
    ['Tipo de inspección', WALK_TYPE_LABEL[walk.type]],
    ['Constructor', project?.company || '-'],
    ['Vivienda', `${house?.type === 'departamento' ? 'Departamento' : 'Casa'}${house?.surface ? ` · ${house.surface} m²` : ''}`],
  ]
  const colW = CW / 3
  for (let row = 0; row < 2; row++) {
    ensure(12)
    meta.slice(row * 3, row * 3 + 3).forEach(([label, value], i) => {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED)
      doc.text(clean(label), M + i * colW, y + 3)
      doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(TEXT)
      doc.text(doc.splitTextToSize(clean(value), colW - 3)[0] as string, M + i * colW, y + 8)
    })
    y += 12
  }

  heading('Resumen de hallazgos')
  const boxes = [
    { label: 'Total', value: snags.length, color: brand.color, bg: '#eef2ff' },
    ...(['alta', 'media', 'baja'] as const).map((p) => ({
      label: PRIORITY_LABEL[p],
      value: snags.filter((s) => s.priority === p).length,
      ...SEVERITY[p],
    })),
  ]
  const bw = (CW - 9) / 4
  ensure(18)
  boxes.forEach((b, i) => {
    const bx = M + i * (bw + 3)
    doc.setFillColor(b.bg)
    doc.roundedRect(bx, y, bw, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(b.color)
    doc.text(String(b.value), bx + bw / 2, y + 8, { align: 'center' })
    doc.setFont('helvetica', 'normal').setFontSize(8)
    doc.text(b.label, bx + bw / 2, y + 13, { align: 'center' })
  })
  y += 20

  heading('Hallazgos')
  if (snags.length === 0) write('Sin hallazgos registrados.', 10, { color: MUTED })
  const sorted = [...snags].sort((a, b) => SEVERITY_ORDER[a.priority] - SEVERITY_ORDER[b.priority] || a.number - b.number)
  for (const s of sorted) await writeFinding(s)

  if (others.length) {
    heading('Pendientes de inspecciones anteriores')
    for (const s of others) write(`#${s.number} ${s.description} (${PRIORITY_LABEL[s.priority]}, ${SNAG_STATUS_LABEL[s.status]})`, 9)
  }

  const progress = checklistProgress(walk, snags, catalog)
  const reviewed = reviewedKeys(walk, snags)
  heading(`Checklist (${progress.done}/${progress.total} puntos revisados)`)
  for (const a of catalog.areas) {
    const keys = areaItems(a)
    const n = snags.filter((s) => s.area === a.id).length
    ensure(7)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(TEXT)
    doc.text(clean(a.name), M, y + 4.5)
    doc.text(`${keys.filter((k) => reviewed.has(k)).length}/${keys.length}`, M + CW - 40, y + 4.5, { align: 'right' })
    doc.setTextColor(n ? SEVERITY.alta.color : TEXT)
    doc.text(`${n} hallazgo${n === 1 ? '' : 's'}`, M + CW, y + 4.5, { align: 'right' })
    doc.setDrawColor(BORDER).line(M, y + 7, M + CW, y + 7)
    y += 7
  }

  if (walk.notes) {
    heading('Observaciones finales')
    write(walk.notes, 10)
  }

  // Firmas
  ensure(48)
  y += 10
  const sigW = (CW - 20) / 2
  const signers: [string, string, string][] = [
    [walk.inspectorSignature, walk.inspector || 'Inspector', 'Inspector'],
    [walk.signature, walk.signedBy || 'Nombre y firma', 'Cliente'],
  ]
  for (const [i, [sig, name, role]] of signers.entries()) {
    const sx = M + i * (sigW + 20)
    if (sig) {
      const img = await toImg(sig)
      const f = fit(img, sigW, 22)
      doc.addImage(img.data, 'PNG', sx + (sigW - f.w) / 2, y + 22 - f.h, f.w, f.h)
    }
    doc.setDrawColor(TEXT).line(sx, y + 24, sx + sigW, y + 24)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(TEXT)
    doc.text(clean(name), sx + sigW / 2, y + 29, { align: 'center' })
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED)
    doc.text(role, sx + sigW / 2, y + 33, { align: 'center' })
  }
  y += 38
  if (walk.confirmed) write('El cliente confirma haber recibido el reporte y conocer los hallazgos identificados.', 8, { color: MUTED })

  const pages = doc.getNumberOfPages()
  const issued = new Date().toLocaleDateString('es-MX')
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED)
    doc.text(clean(`${brand.name} · ${project?.name ?? ''} · ${house?.code ?? ''} · Emitido ${issued}`), M, PAGE_H - 8)
    doc.text(`Página ${p} de ${pages}`, PAGE_W - M, PAGE_H - 8, { align: 'right' })
  }
  return doc.output('blob')

  async function writeFinding(s: Snag) {
    ensure(26)
    y += 2
    const sev = SEVERITY[s.priority]
    doc.setFillColor(sev.bg)
    doc.roundedRect(M + CW - 22, y, 22, 6, 3, 3, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(sev.color)
    doc.text(PRIORITY_LABEL[s.priority], M + CW - 11, y + 4.2, { align: 'center' })
    write(`#${s.number} ${s.description}`, 11, { bold: true, width: CW - 26 })
    write([s.area && areaName(catalog, s.area), s.element, s.location].filter(Boolean).join(' · '), 9, { color: MUTED })
    const contractor = s.contractorId ? (contractors.get(s.contractorId)?.name ?? '-') : 'Sin asignar'
    write(`${SNAG_STATUS_LABEL[s.status]} · Responsable: ${contractor} · Compromiso: ${formatDate(s.dueDate)}`, 9)
    const list = photos.get(s.id) ?? []
    const thumbW = (CW - 9) / 4
    let col = 0
    let rowH = 0
    for (const ph of list) {
      const img = await toImg(ph.blob)
      const f = fit(img, thumbW, 42)
      if (col === 0) ensure(48)
      const tx = M + col * (thumbW + 3)
      doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(MUTED)
      doc.text(ph.kind === 'antes' ? 'Antes' : 'Después', tx, y + 3)
      doc.addImage(img.data, format(img), tx, y + 4, f.w, f.h)
      rowH = Math.max(rowH, f.h + 5)
      col += 1
      if (col === 4) {
        y += rowH + 2
        col = 0
        rowH = 0
      }
    }
    if (col) y += rowH + 2
    doc.setDrawColor(BORDER).line(M, y + 1, M + CW, y + 1)
    y += 3
  }
}
