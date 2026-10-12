import { ImageUp, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Logo } from '../components/Logo'
import { SignaturePad } from '../components/SignaturePad'
import { DEFAULT_BRAND, setSetting, updateBrand, updateProfile, useBrand, useProfile } from '../db/settings'
import { areaItems } from '../db/catalog'
import { resetCatalog, useCatalog } from '../db/checklistStore'
import { logoFromFile } from '../lib/brand'

const PRESETS = ['#1d4ed8', '#0f766e', '#15803d', '#b45309', '#b91c1c', '#7c3aed', '#0f172a']

/** Configuración del inspector (firma) y de la marca (nombre, logo y color). */
export function Settings() {
  const profile = useProfile()
  const brand = useBrand()
  const catalog = useCatalog()
  const [name, setName] = useState<string | null>(null)
  const [message, setMessage] = useState('')


  async function uploadLogo(file: File | undefined) {
    if (!file) return
    try {
      await updateBrand({ logo: await logoFromFile(file) })
      setMessage('Logo actualizado.')
    } catch {
      setMessage('No se pudo leer la imagen. Usa PNG, JPG o SVG.')
    }
  }

  return (
    <>
      <AppHeader title="Configuración" back="/mas" />
      <div className="content form-stack">
        <section className="card form-stack">
          <h3>Mi firma de inspector</h3>
          <p className="muted small">Se guarda en este dispositivo y puedes aplicarla en cada inspección con un toque.</p>
          <SignaturePad value={profile?.signature ?? ''} onChange={(signature) => updateProfile({ signature })} />
        </section>

        <section className="card form-stack">
          <h3>Checklist</h3>
          <p className="muted small">
            {catalog.areas.length} áreas · {catalog.areas.reduce((n, a) => n + a.elements.length, 0)} elementos ·{' '}
            {catalog.areas.reduce((n, a) => n + areaItems(a).length, 0)} puntos. Edítalo desde cualquier inspección con
            <b> Editar áreas</b> o <b>Editar checklist</b>; los cambios aplican a todas las inspecciones.
          </p>
          <button
            type="button"
            className="btn ghost sm"
            onClick={async () => {
              if (!confirm('¿Restablecer el checklist predeterminado? Se perderán las áreas, elementos y puntos personalizados.')) return
              await resetCatalog()
              setMessage('Checklist restablecido.')
            }}
          >
            <RotateCcw size={16} /> Restablecer checklist predeterminado
          </button>
        </section>

        <section className="card form-stack">
          <h3>Marca de la app</h3>
          <div className="brand-preview">
            <Logo size={48} />
            <button type="button" className="btn primary sm">Botón de ejemplo</button>
          </div>
          <label>
            Nombre de la app
            <input
              value={name ?? brand.name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onBlur={async () => {
                if (name === null) return
                await updateBrand({ name: name.trim() || DEFAULT_BRAND.name })
                setName(null)
              }}
            />
          </label>

          <div className="field">
            <span className="field-label">Logo</span>
            <div className="actions tight">
              <label className="btn sm">
                <ImageUp size={16} /> Subir logo
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
              </label>
              {brand.logo && (
                <button type="button" className="btn ghost sm" onClick={() => updateBrand({ logo: '' })}>
                  <RotateCcw size={16} /> Usar logo predeterminado
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Color principal</span>
            <div className="color-row">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch ${brand.color.toLowerCase() === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                  onClick={() => updateBrand({ color: c })}
                />
              ))}
              <label className="swatch custom" aria-label="Color personalizado">
                <input type="color" value={brand.color} onChange={(e) => updateBrand({ color: e.target.value })} />
              </label>
            </div>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={async () => {
              await setSetting('brand', DEFAULT_BRAND)
              setMessage('Marca restablecida.')
            }}
          >
            <RotateCcw size={16} /> Restablecer marca
          </button>
          {message && <p className="toast" role="status">{message}</p>}
          <p className="muted small">
            El nombre, logo y color se aplican en la app, los reportes y el PDF. El icono de la app instalada
            se define al compilar (ver README).
          </p>
        </section>
      </div>
    </>
  )
}
