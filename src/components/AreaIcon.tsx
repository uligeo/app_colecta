import { Bath, BedDouble, CloudRain, CookingPot, House, PlugZap, Sofa, WashingMachine } from 'lucide-react'
import type { AreaIcon as AreaIconName } from '../db/catalog'

const ICONS: Record<AreaIconName, typeof House> = {
  exterior: House,
  sala: Sofa,
  cocina: CookingPot,
  recamara: BedDouble,
  bano: Bath,
  lavado: WashingMachine,
  instalaciones: PlugZap,
  azotea: CloudRain,
}

export function AreaIcon({ name, size = 24 }: { name: AreaIconName; size?: number }) {
  const Icon = ICONS[name]
  return (
    <span className="area-icon">
      <Icon size={size} strokeWidth={1.7} />
    </span>
  )
}
