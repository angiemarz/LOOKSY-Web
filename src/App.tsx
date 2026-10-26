import { Route, Routes } from 'react-router-dom'
import { Layout } from './ui/Layout'
import { HomePage } from './pages/HomePage'
import { WardrobePage } from './pages/WardrobePage'
import { GarmentEditorPage } from './pages/GarmentEditorPage'
import { GarmentDetailPage } from './pages/GarmentDetailPage'
import { StylistPage } from './pages/StylistPage'
import { InspirationPage } from './pages/InspirationPage'
import { ReferenceFormPage } from './pages/ReferenceFormPage'
import { ReferenceDetailPage } from './pages/ReferenceDetailPage'
import { RecreatePage } from './pages/RecreatePage'
import { ComparePage } from './pages/ComparePage'
import { LooksPage } from './pages/LooksPage'
import { LookDetailPage } from './pages/LookDetailPage'
import { CollectionPage } from './pages/CollectionPage'
import { ManualLookPage } from './pages/ManualLookPage'
import { SettingsPage } from './pages/SettingsPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { BackupPage } from './pages/BackupPage'
import { InstallPage } from './pages/InstallPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="armario" element={<WardrobePage />} />
        <Route path="armario/nueva" element={<GarmentEditorPage />} />
        <Route path="armario/:id" element={<GarmentDetailPage />} />
        <Route path="armario/:id/editar" element={<GarmentEditorPage />} />
        <Route path="crear" element={<StylistPage />} />
        <Route path="inspiracion" element={<InspirationPage />} />
        <Route path="inspiracion/nueva" element={<ReferenceFormPage />} />
        <Route path="inspiracion/:id" element={<ReferenceDetailPage />} />
        <Route path="inspiracion/:id/recrear" element={<RecreatePage />} />
        <Route path="comparar" element={<ComparePage />} />
        <Route path="looks" element={<LooksPage />} />
        <Route path="looks/nuevo" element={<ManualLookPage />} />
        <Route path="looks/colecciones/:id" element={<CollectionPage />} />
        <Route path="looks/:id" element={<LookDetailPage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="ajustes/preferencias" element={<PreferencesPage />} />
        <Route path="ajustes/respaldo" element={<BackupPage />} />
        <Route path="ajustes/instalar" element={<InstallPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
