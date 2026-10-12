import { useMemo } from 'react'
import { useObjectUrls } from '../lib/useObjectUrls'

export interface PinMark {
  id: number | string
  x: number
  y: number
  label: string
  tone: string
}

interface PlanViewProps {
  blob: Blob
  pins: PinMark[]
  onPick?: (x: number, y: number) => void
  onPinClick?: (id: PinMark['id']) => void
}

/** Plano con marcas posicionadas en porcentaje; opcionalmente permite colocar una marca. */
export function PlanView({ blob, pins, onPick, onPinClick }: PlanViewProps) {
  const items = useMemo(() => [{ id: 0, blob }], [blob])
  const url = useObjectUrls(items)[0]?.url

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onPick) return
    const rect = e.currentTarget.getBoundingClientRect()
    onPick(
      Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
      Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
    )
  }

  return (
    <div className={`plan ${onPick ? 'plan-pick' : ''}`} onClick={handleClick}>
      {url && <img src={url} alt="Plano" draggable={false} />}
      {pins.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`pin pin-${p.tone}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          onClick={(e) => {
            if (!onPinClick) return
            e.stopPropagation()
            onPinClick(p.id)
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
