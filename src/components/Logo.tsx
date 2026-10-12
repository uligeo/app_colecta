import { useBrand } from '../db/settings'

interface LogoProps {
  size?: number
  withText?: boolean
  className?: string
}

/** Logo de la marca configurada: imagen propia o casa en trazo, con el nombre debajo. */
export function Logo({ size = 40, withText = true, className = '' }: LogoProps) {
  const brand = useBrand()
  return (
    <div className={`logo ${className}`}>
      {brand.logo ? (
        <img src={brand.logo} width={size} height={size} alt="" className="logo-img" />
      ) : (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M6 22 24 7l18 15" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 19v21h9V29h8v11h9V19" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
      )}
      {withText && <span className="logo-text">{brand.name}</span>}
    </div>
  )
}
