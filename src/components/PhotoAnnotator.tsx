import { ArrowUpRight, Pencil, RotateCcw, Square, Trash2, Type } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Tool = 'pen' | 'rect' | 'arrow' | 'text'
type Point = { x: number; y: number }
type Shape =
  | { tool: 'pen'; points: Point[] }
  | { tool: 'rect' | 'arrow'; from: Point; to: Point }
  | { tool: 'text'; at: Point; text: string }

interface PhotoAnnotatorProps {
  blob: Blob
  onDone: (blob: Blob) => void
  onRetake: () => void
}

const COLOR = '#e5484d'
const TOOLS: { id: Tool; label: string; icon: typeof Pencil }[] = [
  { id: 'pen', label: 'Lápiz', icon: Pencil },
  { id: 'rect', label: 'Rectángulo', icon: Square },
  { id: 'arrow', label: 'Flecha', icon: ArrowUpRight },
  { id: 'text', label: 'Texto', icon: Type },
]

function drawShape(ctx: CanvasRenderingContext2D, s: Shape, unit: number) {
  ctx.strokeStyle = COLOR
  ctx.fillStyle = COLOR
  ctx.lineWidth = unit
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (s.tool === 'pen') {
    ctx.beginPath()
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
  } else if (s.tool === 'rect') {
    ctx.strokeRect(s.from.x, s.from.y, s.to.x - s.from.x, s.to.y - s.from.y)
  } else if (s.tool === 'arrow') {
    const angle = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x)
    const head = unit * 5
    ctx.beginPath()
    ctx.moveTo(s.from.x, s.from.y)
    ctx.lineTo(s.to.x, s.to.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(s.to.x, s.to.y)
    ctx.lineTo(s.to.x - head * Math.cos(angle - 0.45), s.to.y - head * Math.sin(angle - 0.45))
    ctx.lineTo(s.to.x - head * Math.cos(angle + 0.45), s.to.y - head * Math.sin(angle + 0.45))
    ctx.closePath()
    ctx.fill()
  } else if (s.tool === 'text') {
    ctx.font = `bold ${unit * 7}px system-ui, sans-serif`
    ctx.lineWidth = unit * 1.6
    ctx.strokeStyle = '#fff'
    ctx.strokeText(s.text, s.at.x, s.at.y)
    ctx.fillText(s.text, s.at.x, s.at.y)
  }
}

/** Editor para señalar el defecto sobre la fotografía antes de guardarla. */
export function PhotoAnnotator({ blob, onDone, onRetake }: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<ImageBitmap | null>(null)
  const [tool, setTool] = useState<Tool>('arrow')
  const [shapes, setShapes] = useState<Shape[]>([])
  const draft = useRef<Shape | null>(null)

  useEffect(() => {
    let alive = true
    createImageBitmap(blob).then((bmp) => alive && setImage(bmp))
    return () => {
      alive = false
    }
  }, [blob])

  const unit = image ? Math.max(3, Math.round(Math.max(image.width, image.height) / 220)) : 3

  function redraw(extra?: Shape | null) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !image) return
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const s of [...shapes, ...(extra ? [extra] : [])]) drawShape(ctx, s, unit)
  }

  useEffect(redraw)

  function point(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * e.currentTarget.width) / rect.width,
      y: ((e.clientY - rect.top) * e.currentTarget.height) / rect.height,
    }
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = point(e)
    if (tool === 'text') {
      const text = prompt('Texto a colocar:')?.trim()
      if (text) setShapes((prev) => [...prev, { tool: 'text', at: p, text }])
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    draft.current = tool === 'pen' ? { tool, points: [p] } : { tool, from: p, to: p }
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = draft.current
    if (!d) return
    const p = point(e)
    if (d.tool === 'pen') d.points.push(p)
    else if (d.tool !== 'text') d.to = p
    redraw(d)
  }

  function up() {
    const d = draft.current
    draft.current = null
    if (d) setShapes((prev) => [...prev, d])
  }

  function finish() {
    canvasRef.current?.toBlob((b) => b && onDone(b), 'image/jpeg', 0.85)
  }

  return (
    <div className="annotator">
      <div className="annotator-body">
        <div className="annotator-canvas">
          {image && (
            <canvas
              ref={canvasRef}
              width={image.width}
              height={image.height}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            />
          )}
        </div>
        <div className="annotator-tools" role="toolbar" aria-label="Herramientas">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-label={label} title={label} className={tool === id ? 'active' : ''} onClick={() => setTool(id)}>
              <Icon size={22} />
            </button>
          ))}
          <button type="button" aria-label="Deshacer" title="Deshacer" onClick={() => setShapes((prev) => prev.slice(0, -1))}>
            <RotateCcw size={22} />
          </button>
          <button type="button" aria-label="Borrar marcas" title="Borrar marcas" className="danger" onClick={() => setShapes([])}>
            <Trash2 size={22} />
          </button>
        </div>
      </div>
      <div className="bottom-actions">
        <button type="button" className="btn" onClick={onRetake}>
          Retomar
        </button>
        <button type="button" className="btn primary" onClick={finish} disabled={!image}>
          Usar foto
        </button>
      </div>
    </div>
  )
}
