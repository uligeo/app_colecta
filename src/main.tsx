import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { db } from './db/schema'
import './styles/base.css'
import './styles/screens.css'
import './styles/inspection.css'
import './styles/report.css'

// Solicita almacenamiento persistente para que el navegador no borre IndexedDB.
navigator.storage?.persist?.().catch(() => undefined)
db.open().catch((err) => console.error('No se pudo abrir la base local', err))

const UPDATE_CHECK_MS = 60 * 60 * 1000
const RELOAD_FLAG = 'recarga-por-actualizacion'

// Si una parte de la app ya no existe en el servidor tras publicar una versión nueva,
// se recarga una sola vez para tomar la versión vigente en lugar de mostrar un error.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    /* Sin almacenamiento de sesión se recarga igualmente. */
  }
  event.preventDefault()
  window.location.reload()
})
// Tras una carga estable se permite otra recarga automática en el futuro, sin riesgo de bucle.
window.addEventListener('load', () =>
  setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG)
    } catch {
      /* El indicador es opcional. */
    }
  }, 10_000),
)

// Al publicar una versión nueva, el service worker la instala y la página se recarga sola.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update().catch(() => undefined), UPDATE_CHECK_MS)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
