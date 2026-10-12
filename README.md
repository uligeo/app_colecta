# NIVELA · Inspección y seguimiento de viviendas

PWA y aplicación de escritorio para constructoras e inmobiliarias: inspección guiada de viviendas
(checklist por áreas, hallazgos con fotografía anotada, reporte y firma) y **seguimiento de cada
hallazgo hasta su cierre** (snagging). Funciona **sin conexión**; los datos viven en IndexedDB y se
respaldan en Google Drive y en una copia local.

## Funcionalidades

- **Inspección en 4 pasos**: Vivienda → Checklist → Hallazgos → Revisar y firma, con botón **Guardar**
  en cada paso y regreso a **Inicio**.
- **Checklist editable**: agrega, renombra, ordena o elimina áreas, elementos y puntos a revisar, y
  define los tipos de defecto frecuentes. Se guarda en IndexedDB, viaja en el respaldo JSON y se refleja
  en el reporte y el PDF. Cada punto tiene un identificador estable, así que renombrarlo conserva sus
  marcas y hallazgos. Se puede restablecer el predeterminado en **Más → Configuración**.
- **Hallazgos**: área, elemento, tipo de defecto, severidad (Alta / Media / Baja), descripción,
  ubicación y fotografías con **editor de anotaciones** (lápiz, rectángulo, flecha, texto, deshacer).
- **Firmas** del inspector (guardable en el perfil y reutilizable) y del cliente.
- **Seguimiento**: contratista sugerido por especialidad, fecha compromiso según severidad, estados
  Abierto → En corrección → Por verificar → Cerrado, fotos de después, historial, vencidos y WhatsApp.
- **Reporte y PDF real** con marca, fachada, resumen por severidad, hallazgos con fotos, checklist y firmas.
- **Carpeta compartida de Google Drive**: cada inspección se sube a su propia subcarpeta (PDF, fachada,
  fotos de hallazgos y firmas) desde el reporte o desde la tarjeta de la inspección; las subidas
  posteriores actualizan los mismos archivos.
- **Marca configurable**: nombre de la app, logo y color principal (interfaz, reportes y PDF).
- **Pendientes** globales con filtros y CSV; reportes por contratista; desarrollos con planos y alta masiva.
- **Respaldo** JSON en Google Drive y en una carpeta local; restauración desde ambos.

## Stack

React 19 + TypeScript, Vite, Dexie (IndexedDB), React Router (HashRouter), vite-plugin-pwa y Tauri v2.

## Requisitos

- Node.js 20+ y pnpm 9+
- Para la app de escritorio: Rust 1.90+ y los [prerrequisitos de Tauri](https://tauri.app/start/prerequisites/)

## Instalación

```bash
pnpm install
```

## Cómo ejecutar

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo web en http://localhost:5173 |
| `pnpm build` | Compilación de producción en `dist/` (incluye service worker) |
| `pnpm preview` | Sirve `dist/` localmente para probar la PWA y el modo sin conexión |
| `pnpm tauri:dev` | App de escritorio en modo desarrollo |
| `pnpm tauri:build` | Instaladores de escritorio en `src-tauri/target/release/bundle` |

Para usarla desde un teléfono en la misma red: `pnpm build && pnpm preview --host`. La instalación como PWA
requiere HTTPS o `localhost`; en red local por HTTP la app funciona, pero el navegador no ofrecerá instalarla.

## Variables de entorno

Copia `.env.example` a `.env.local` (ignorado por git) y completa:

| Variable | Descripción |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Cliente OAuth de Google para subir y restaurar respaldos en Drive. Opcional. |
| `VITE_DRIVE_FOLDER_URL` | Carpeta de Drive predeterminada; también se puede cambiar en **Más → Respaldo**. |
| `TAURI_DEV_HOST` | Opcional, solo para desarrollar Tauri en dispositivos móviles. |

## Respaldo en Google Drive

Con solo el enlace de la carpeta no es posible escribir en ella: Google exige que la cuenta autorice la app.

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto y habilita **Google Drive API**.
2. En **Pantalla de consentimiento de OAuth** elige tipo *Externo*, deja la app en modo *Prueba* y agrega
   como usuarios de prueba las cuentas que respaldarán.
3. En **Credenciales → Crear ID de cliente OAuth → Aplicación web**, agrega como *Orígenes de JavaScript
   autorizados* `http://localhost:5173`, `http://localhost:4173` y el dominio donde publiques la PWA.
4. Copia el ID en `VITE_GOOGLE_CLIENT_ID` y vuelve a compilar.

La cuenta que autorice debe tener permiso de edición sobre la carpeta. Se usa el alcance
`https://www.googleapis.com/auth/drive` para poder escribir en una carpeta existente.

Sin Client ID la app sigue funcionando: **Subir a Drive** comparte el PDF y las fotos (en el teléfono eliges Drive) o descarga el PDF y abre la carpeta compartida; para los respaldos, **Compartir respaldo** y **Abrir carpeta** funcionan igual. En la app de escritorio (Tauri) el inicio de
sesión de Google en ventana emergente no está garantizado; ahí usa la copia local.

**Copia local**: en Chrome y Edge se elige una carpeta del equipo una sola vez y cada respaldo se guarda
ahí con fecha; en otros navegadores el archivo se descarga. Al finalizar una inspección se hace un respaldo
automático a los destinos ya autorizados.

## Estructura

```
src/
  db/          esquema Dexie y migraciones, catálogo de áreas, acciones, ajustes y respaldo
  lib/         Google Drive, copia local, imágenes, CSV, WhatsApp y utilidades
  components/  encabezado, pestañas, pasos, hallazgos, editor de fotos, plano y firma
  pages/       inicio, inspecciones, pendientes, reportes, más, desarrollos y contratistas
  pages/inspection/  pasos del asistente de inspección
  styles/      tokens, pantallas, inspección y reporte
src-tauri/     proyecto Tauri v2
```

## Datos

La información vive solo en el navegador o en la app de escritorio del dispositivo. Borrar los datos del sitio
elimina la base local, por lo que se recomienda exportar respaldos periódicamente desde la sección **Respaldo**.

## Marca e icono instalado

El nombre, logo y color se cambian en **Más → Configuración** y se aplican de inmediato en la app,
los reportes y el PDF. El nombre y el icono que muestra el sistema al **instalar** la PWA o la app de
escritorio se toman al compilar: edita `name`/`short_name` en `vite.config.ts`, reemplaza
`public/icon.svg`, `public/icon-192.png` y `public/icon-512.png`, y regenera los iconos de escritorio con
`pnpm tauri icon <imagen-1024.png>`.
