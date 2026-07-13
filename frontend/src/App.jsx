import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OnboardingFormPage from './pages/OnboardingFormPage'
import VendorReferenceMasterPage from './pages/VendorReferenceMasterPage'
import ProfilePage from './pages/ProfilePage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (!['ADMIN', 'BOSS', 'EMPLOYEE'].includes(user.role)) return <Navigate to="/login" replace />
  return children
}

function FullAdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding/:token" element={<OnboardingFormPage />} />
            <Route
              path="/profile"
              element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
            />
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <DashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/vendor-reference-master"
              element={
                <FullAdminRoute>
                  <VendorReferenceMasterPage />
                </FullAdminRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
