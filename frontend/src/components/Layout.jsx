import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const LINKS = {
  CANDIDATE: [
    ['/dashboard', 'Dashboard'], ['/', 'Find Jobs'], ['/applications', 'My Applications'],
    ['/interviews', 'Interviews'], ['/profile', 'Profile & Resume'],
  ],
  RECRUITER: [
    ['/dashboard', 'Dashboard'], ['/recruiter/jobs', 'My Jobs'], ['/recruiter/applications', 'Applicants'],
    ['/interviews', 'Interviews'], ['/profile', 'Profile'],
  ],
  ADMIN: [
    ['/dashboard', 'Dashboard'], ['/admin/users', 'Users'], ['/admin/jobs', 'Jobs'],
    ['/recruiter/applications', 'Applications'], ['/interviews', 'Interviews'], ['/admin/activity', 'Activity Log'],
  ],
  GUEST: [['/', 'Find Jobs']],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = LINKS[user?.role || 'GUEST']

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`

  const doLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">H</span>
            <span className="hidden sm:inline">HireTrack</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {links.map(([to, label]) => <NavLink key={to} to={to} end className={linkClass}>{label}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium leading-tight text-slate-900">{user.name}</p>
                  <p className="text-xs leading-tight text-slate-500">{user.role.toLowerCase()}</p>
                </div>
                <button onClick={doLogout} className="btn-secondary btn-sm hidden sm:inline-flex">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary btn-sm">Log in</Link>
                <Link to="/register" className="btn-primary btn-sm">Sign up</Link>
              </>
            )}
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">☰</button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 lg:hidden" onClick={() => setMenuOpen(false)}>
            {links.map(([to, label]) => <NavLink key={to} to={to} end className={linkClass}>{label}</NavLink>)}
            {user && <button onClick={doLogout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">Log out</button>}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
