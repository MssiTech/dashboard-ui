import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { canAccess, homePath, sectionForPath } from '../auth/access'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const first = useRef(true)
  const [phase, setPhase] = useState('idle')

  useEffect(() => {
    if (first.current) {
      first.current = false
      return undefined
    }
    setPhase('load')
    const enter = window.setTimeout(() => setPhase('in'), 280)
    const done = window.setTimeout(() => setPhase('idle'), 980)
    return () => {
      window.clearTimeout(enter)
      window.clearTimeout(done)
    }
  }, [location.key])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        userName={[user.first_name, user.last_name].filter(Boolean).join(' ')}
        onLogout={handleLogout}
      />
      <div className="page-stage">
        <div className={`page-progress ${phase === 'load' ? 'active' : phase === 'in' ? 'done' : ''}`} />
        <div className={`page-veil ${phase === 'load' ? 'on' : ''}`}>
          <p className="page-loading">
            <span className="page-spinner" aria-hidden="true" />
            Yuklanmoqda...
          </p>
        </div>
        <div className={`page-view ${phase === 'load' ? 'out' : 'in'}`}>
          {canAccess(user, sectionForPath(location.pathname)) ? (
            <Outlet />
          ) : (
            <Navigate to={homePath(user)} replace />
          )}
        </div>
      </div>
    </div>
  )
}
