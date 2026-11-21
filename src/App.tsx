import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AppLayout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { StudentsPage } from './pages/Students'
import { StaffPage } from './pages/Staff'
import { AttendancePage, GatePage } from './pages/Operations'
import { GradebookPage, ReportsPage } from './pages/Academics'
import { LoginPage } from './pages/Login'

export default function App() {
  const { signedIn, loading } = useAuth()
  if (loading) return <main className="login-page"><p>Checking your account...</p></main>
  return <Routes>
    <Route path="/login" element={signedIn ? <Navigate to="/" replace /> : <LoginPage />} />
    <Route element={signedIn ? <AppLayout /> : <Navigate to="/login" replace />}>
      <Route index element={<Dashboard />} />
      <Route path="/students" element={<StudentsPage />} />
      <Route path="/staff" element={<StaffPage />} />
      <Route path="/attendance" element={<AttendancePage />} />
      <Route path="/gate-register" element={<GatePage />} />
      <Route path="/gradebook" element={<GradebookPage />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Route>
    <Route path="*" element={<Navigate to={signedIn ? '/' : '/login'} replace />} />
  </Routes>
}
