interface BadgeProps {
  tone: string
  children: React.ReactNode
}

/** Etiqueta de estado; `tone` se mapea a una clase de color en CSS. */
export function Badge({ tone, children }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
