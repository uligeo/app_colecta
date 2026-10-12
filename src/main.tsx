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
