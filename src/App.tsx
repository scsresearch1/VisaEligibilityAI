import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AssessmentLayout from './components/assessment/AssessmentLayout'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import UploadPage from './pages/assessment/UploadPage'
import CategoriesPage from './pages/assessment/CategoriesPage'
import AnalysisPage from './pages/assessment/AnalysisPage'
import InsightsPage from './pages/assessment/InsightsPage'
import EvidencePage from './pages/assessment/EvidencePage'
import ChecklistPage from './pages/assessment/ChecklistPage'
import GapsPage from './pages/assessment/GapsPage'
import RecommendationsPage from './pages/assessment/RecommendationsPage'
import ReportPage from './pages/assessment/ReportPage'
import RoadmapPage from './pages/assessment/RoadmapPage'
import DossierPage from './pages/assessment/DossierPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessment"
        element={
          <ProtectedRoute>
            <AssessmentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="upload" replace />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="evidence" element={<EvidencePage />} />
        <Route path="checklist" element={<ChecklistPage />} />
        <Route path="gaps" element={<GapsPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="dossier" element={<DossierPage />} />
      </Route>
    </Routes>
  )
}
