import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { db } from './db/schema'
import './styles/base.css'
import './styles/screens.css'
import './styles/inspection.css'
import './styles/report.css'

// Solicita almacenamiento persistente para que el navegador no borre IndexedDB.
navigator.storage?.persist?.().catch(() => undefined)
db.open().catch((err) => console.error('No se pudo abrir la base local', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
