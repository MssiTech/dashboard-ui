import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { canAccess, SECTION } from '../auth/access'
import logo from '../assets/logo1.png'

const dashboardMenu = [
  {
    id: 'districts',
    label: 'Tuman bo‘yicha',
    to: '/dashboard',
    icon: 'map',
    match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/patients'),
  },
  { id: 'units', label: 'Ambulator shifokor', to: '/dashboard/ambulator-doctors', icon: 'doctor' },
]

const dailyMenu = [
  { id: 'ambulatory', label: 'Ambulator', to: '/ambulatory', icon: 'clinic' },
  { id: 'doctors', label: 'Shifokor bo‘yicha', to: '/doctors', icon: 'doctor' },
]

const monthlyMenu = [
  { id: 'nine-month', label: 'Ambulator', to: '/monthly', icon: 'chart' },
  { id: 'branches', label: 'Stasionlar monitoring', to: '/branches', icon: 'branch' },
  { id: 'branch-doctors', label: 'Bo‘lim shifokorlari', to: '/branch-doctors', icon: 'doctor' },
]

const extraItems = [
  {
    id: 'employees',
    label: 'Shifokorlar',
    to: '/employees',
    icon: 'doctor',
  },
  {
    id: 'inventory',
    label: 'Inventarizatsiya',
    to: '/inventarizatsiya',
    icon: 'inventory',
  },
  {
    id: 'appeals',
    label: 'Murojatlar',
    to: '/murojatlar',
    icon: 'appeals',
  },
]

function matchesPath(pathname, to) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

function matchesItem(pathname, item) {
  if (item.match) return item.match(pathname)
  return matchesPath(pathname, item.to)
}

function NavIcon({ name }) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20">
        {name === 'day' ? (
          <>
            <circle cx="10" cy="10" r="3.1" {...stroke} />
            <path d="M10 2.4v1.7M10 15.9v1.7M2.4 10h1.7M15.9 10h1.7M4.6 4.6l1.2 1.2M14.2 14.2l1.2 1.2M15.4 4.6l-1.2 1.2M5.8 14.2 4.6 15.4" {...stroke} />
          </>
        ) : null}
        {name === 'month' ? (
          <>
            <rect x="3.2" y="4.6" width="13.6" height="12" rx="2" {...stroke} />
            <path d="M3.2 8.2h13.6M7 3.2v2.8M13 3.2v2.8" {...stroke} />
          </>
        ) : null}
        {name === 'clinic' ? (
          <>
            <rect x="4.5" y="3.2" width="11" height="13.6" rx="2" {...stroke} />
            <path d="M8 3.2h4v2.2H8zM10 8.2v4.2M7.9 10.3h4.2" {...stroke} />
          </>
        ) : null}
        {name === 'doctor' ? (
          <>
            <circle cx="10" cy="6.6" r="2.4" {...stroke} />
            <path d="M4.6 16.4c.9-2.5 2.8-3.7 5.4-3.7s4.5 1.2 5.4 3.7" {...stroke} />
          </>
        ) : null}
        {name === 'chart' ? (
          <path d="M4 16V9.5M8.2 16V5.2M12.4 16v-4.2M16.2 16V7.4" {...stroke} />
        ) : null}
        {name === 'map' ? (
          <>
            <path d="M3.5 5.4 7.8 3.6 12.2 5.4 16.5 3.8v11.4l-4.3 1.6-4.4-1.8-4.3 1.6z" {...stroke} />
            <path d="M7.8 3.6v11.4M12.2 5.4v11.4" {...stroke} />
          </>
        ) : null}
        {name === 'branch' ? (
          <>
            <path d="M3.5 16.4h13M5.4 16.4V8.2L10 5.2l4.6 3v8.2" {...stroke} />
            <path d="M8.4 16.4v-3.2h3.2v3.2" {...stroke} />
          </>
        ) : null}
        {name === 'inventory' ? (
          <>
            <rect x="4.2" y="5" width="11.6" height="11.4" rx="2" {...stroke} />
            <path d="M7.2 3.6h5.6v2.6H7.2zM7.4 10h5.2M7.4 13h3.6" {...stroke} />
          </>
        ) : null}
        {name === 'appeals' ? (
          <>
            <path d="M4.4 4.6h11.2v9H8.4L4.4 16.4V4.6z" {...stroke} />
            <path d="M7.4 8h5.2M7.4 10.8h3.6" {...stroke} />
          </>
        ) : null}
      </svg>
    </span>
  )
}

function NavCaret({ open }) {
  return (
    <svg className={open ? 'nav-caret open' : 'nav-caret'} viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavGroup({ label, icon, items, open, onToggle, pathname }) {
  return (
    <div className="nav-group">
      <button type="button" className="nav-item nav-toggle" aria-expanded={open} onClick={onToggle}>
        <NavIcon name={icon} />
        <span className="nav-label">{label}</span>
        <NavCaret open={open} />
      </button>
      {open ? (
        <div className="nav-sub">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={Boolean(item.match)}
              className={() => (matchesItem(pathname, item) ? 'nav-item active' : 'nav-item')}
            >
              <NavIcon name={item.icon} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function Sidebar({ user, userName, onLogout }) {
  const { pathname } = useLocation()
  const showDashboard = canAccess(user, SECTION.dashboard)
  const showDaily = canAccess(user, SECTION.daily)
  const showMonthly = canAccess(user, SECTION.monthly)
  const visibleExtras = extraItems.filter((item) => canAccess(user, item.id))
  const dashboardActive = dashboardMenu.some((item) => matchesItem(pathname, item))
  const dailyActive = dailyMenu.some((item) => matchesPath(pathname, item.to))
  const monthlyActive = monthlyMenu.some((item) => matchesPath(pathname, item.to))
  const [dashboardOpen, setDashboardOpen] = useState(dashboardActive)
  const [dailyOpen, setDailyOpen] = useState(dailyActive)
  const [monthlyOpen, setMonthlyOpen] = useState(monthlyActive)

  useEffect(() => {
    if (dashboardActive) setDashboardOpen(true)
  }, [dashboardActive])

  useEffect(() => {
    if (dailyActive) setDailyOpen(true)
  }, [dailyActive])

  useEffect(() => {
    if (monthlyActive) setMonthlyOpen(true)
  }, [monthlyActive])

  return (
    <aside className="sidebar">
      <div className="brand-mark">
        <span className="brand-logo">
          <img src={logo} alt="Buxoro viloyati ko'p tarmoqli tibbiyot markazi" />
        </span>
        <span className="brand-name">
          <span>Buxoro viloyati</span>
          <span>ko'p tarmoqli tibbiyot markazi</span>
        </span>
      </div>
      <nav className="sidebar-nav" aria-label="Asosiy menyu">
        {showDashboard ? (
          <NavGroup
            label="Dashboard"
            icon="map"
            items={dashboardMenu}
            open={dashboardOpen}
            onToggle={() => setDashboardOpen((open) => !open)}
            pathname={pathname}
          />
        ) : null}
        {showDaily ? (
          <NavGroup
            label="Kunlik monitoring"
            icon="day"
            items={dailyMenu}
            open={dailyOpen}
            onToggle={() => setDailyOpen((open) => !open)}
            pathname={pathname}
          />
        ) : null}
        {showMonthly ? (
          <NavGroup
            label="Oylik monitoring"
            icon="month"
            items={monthlyMenu}
            open={monthlyOpen}
            onToggle={() => setMonthlyOpen((open) => !open)}
            pathname={pathname}
          />
        ) : null}
        {visibleExtras.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={() => (matchesPath(pathname, item.to) ? 'nav-item active' : 'nav-item')}
          >
            <NavIcon name={item.icon} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="user-chip">
          <span className="user-avatar" aria-hidden="true">
            {userName.trim().charAt(0)}
          </span>
          <span className="user-name">{userName}</span>
        </span>
        <button type="button" className="logout-button" onClick={onLogout}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M9 10h7M13.5 6.5 17 10l-3.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Chiqish
        </button>
      </div>
    </aside>
  )
}
