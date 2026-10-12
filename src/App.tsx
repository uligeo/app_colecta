import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { FlowLayout, TabLayout } from './components/TabLayout'
import { useBrand, useProfile } from './db/settings'
import { applyBrand } from './lib/brand'
import { BackupPage } from './pages/BackupPage'
import { Contractors } from './pages/Contractors'
import { Home } from './pages/Home'
import { HouseDetail } from './pages/HouseDetail'
import { AreaChecklist } from './pages/inspection/AreaChecklist'
import { ChecklistStep } from './pages/inspection/ChecklistStep'
import { FindingNew } from './pages/inspection/FindingNew'
import { FindingsStep } from './pages/inspection/FindingsStep'
import { HouseStep } from './pages/inspection/HouseStep'
import { ReviewStep } from './pages/inspection/ReviewStep'
import { Inspections } from './pages/Inspections'
import { More } from './pages/More'
import { Pending } from './pages/Pending'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { ContractorReport, HouseReport, InspectionReport } from './pages/ReportPages'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { SnagPage } from './pages/SnagPage'
import { Welcome } from './pages/Welcome'

export default function App() {
  const profile = useProfile()
  const brand = useBrand()

  useEffect(() => applyBrand(brand), [brand])

  if (profile === undefined) return null
  if (profile === null) return <Welcome />

  return (
    <HashRouter>
      <Routes>
        <Route element={<TabLayout />}>
          <Route index element={<Home />} />
          <Route path="inspecciones" element={<Inspections />} />
          <Route path="pendientes" element={<Pending />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="mas" element={<More />} />
        </Route>
        <Route element={<FlowLayout />}>
          <Route path="inspecciones/nueva" element={<HouseStep />} />
          <Route path="inspecciones/:id/vivienda" element={<HouseStep />} />
          <Route path="inspecciones/:id/checklist" element={<ChecklistStep />} />
          <Route path="inspecciones/:id/checklist/:area" element={<AreaChecklist />} />
          <Route path="inspecciones/:id/hallazgo" element={<FindingNew />} />
          <Route path="inspecciones/:id/hallazgos" element={<FindingsStep />} />
          <Route path="inspecciones/:id/revisar" element={<ReviewStep />} />
          <Route path="inspecciones/:id/reporte" element={<InspectionReport />} />
          <Route path="hallazgos/:id" element={<SnagPage />} />
          <Route path="desarrollos" element={<Projects />} />
          <Route path="desarrollos/:id" element={<ProjectDetail />} />
          <Route path="viviendas/:id" element={<HouseDetail />} />
          <Route path="viviendas/:id/hallazgo" element={<FindingNew />} />
          <Route path="viviendas/:id/reporte" element={<HouseReport />} />
          <Route path="contratistas" element={<Contractors />} />
          <Route path="contratistas/:id/reporte" element={<ContractorReport />} />
          <Route path="respaldo" element={<BackupPage />} />
          <Route path="configuracion" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
