const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })

/** Texto relativo en español, por ejemplo "hace 2 días". */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const diff = timestamp - now
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit)
  }
  return 'hace un momento'
}
