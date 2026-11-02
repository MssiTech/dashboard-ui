import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { homePath } from './auth/access'
import AppLayout from './components/AppLayout'
import { useAuth } from './context/AuthContext'
import RequireAuth from './middleware/RequireAuth'
import AmbulatoryPage from './pages/ambulatory/AmbulatoryPage'
import AmbulatorDoctorsPage from './pages/dashboard/AmbulatorDoctorsPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import DistrictPatientsPage from './pages/dashboard/DistrictPatientsPage'
import BranchDetailPage from './pages/branches/BranchDetailPage'
import BranchDoctorDetailPage from './pages/branches/BranchDoctorDetailPage'
import BranchDoctorsPage from './pages/branches/BranchDoctorsPage'
import BranchesPage from './pages/branches/BranchesPage'
import LoginPage from './pages/login/LoginPage'
import MonthlyDetailPage from './pages/monthly/MonthlyDetailPage'
import MonthlyPage from './pages/monthly/MonthlyPage'
import DoctorDetailPage from './pages/doctors/DoctorDetailPage'
import DoctorsPage from './pages/doctors/DoctorsPage'
import AppealsPage from './pages/appeals/AppealsPage'
import EmployeesPage from './pages/employees/EmployeesPage'
import InventoryPage from './pages/inventory/InventoryPage'

function LegacyRedirect({ to }) {
  const { doctorId } = useParams()
  const location = useLocation()
  return <Navigate to={`${to}/${doctorId}${location.search}`} replace state={location.state} />
}

export default function App() {
  const { user, ready } = useAuth()
  if (!ready) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={homePath(user)} replace /> : <LoginPage />}
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/patients" element={<DistrictPatientsPage />} />
        <Route path="/dashboard/ambulator-doctors" element={<AmbulatorDoctorsPage />} />
        <Route path="/dashboard/branches" element={<Navigate to="/dashboard/ambulator-doctors" replace />} />
        <Route path="/dashboard/doctors/:doctorId" element={<LegacyRedirect to="/doctors" />} />
        <Route path="/ambulatory" element={<AmbulatoryPage />} />
        <Route path="/ambulatory/doctors/:doctorId" element={<DoctorDetailPage />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/doctors/:doctorId" element={<DoctorDetailPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/inventarizatsiya" element={<InventoryPage />} />
        <Route path="/murojatlar" element={<AppealsPage />} />
        <Route path="/monthly" element={<MonthlyPage />} />
        <Route path="/monthly/:doctorId" element={<MonthlyDetailPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/branches/:doctorId" element={<BranchDetailPage />} />
        <Route path="/branch-doctors" element={<BranchDoctorsPage />} />
        <Route path="/branch-doctors/:doctorId" element={<BranchDoctorDetailPage />} />
        <Route path="/shifokorlar" element={<Navigate to="/doctors" replace />} />
        <Route path="/shifokorlar/:doctorId" element={<LegacyRedirect to="/doctors" />} />
        <Route path="/9-oylik" element={<Navigate to="/monthly" replace />} />
        <Route path="/9-oylik/:doctorId" element={<LegacyRedirect to="/monthly" />} />
        <Route path="/bolimlar" element={<Navigate to="/branches" replace />} />
        <Route path="/bolimlar/:doctorId" element={<LegacyRedirect to="/branches" />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? homePath(user) : '/login'} replace />} />
    </Routes>
  )
}
