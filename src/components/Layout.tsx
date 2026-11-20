import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, BookOpen, CalendarCheck, ChevronDown, ClipboardList, DoorOpen, GraduationCap, LayoutDashboard, LogOut, Menu, Moon, Settings, Shield, Sun, Users, X } from 'lucide-react'
import { useAuth, roles } from '../context/AuthContext'
import { Avatar, Notifications } from './Shared'

const navItems = [
  { label: 'Overview', path: '/', icon: LayoutDashboard, roles: roles },
  { label: 'Students', path: '/students', icon: Users, roles: ['Principal', 'Office Staff', 'Teacher', 'Parent', 'Student'] },
  { label: 'Staff directory', path: '/staff', icon: GraduationCap, roles: ['Principal', 'Office Staff', 'Teacher'] },
  { label: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['Principal', 'Office Staff', 'Teacher', 'Parent', 'Student'] },
  { label: 'Gate register', path: '/gate-register', icon: DoorOpen, roles: ['Principal', 'Office Staff', 'Security Guard'] },
  { label: 'Gradebook', path: '/gradebook', icon: BookOpen, roles: ['Principal', 'Teacher', 'Student'] },
  { label: 'Reports', path: '/reports', icon: ClipboardList, roles: ['Principal', 'Office Staff', 'Teacher', 'Parent', 'Student'] },
]

export function AppLayout() {
  const { role, setRole, signIn } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sms-theme') === 'dark')
  const location = useLocation()
  const pageTitle = navItems.find((item) => item.path === location.pathname)?.label || 'Overview'
  const initials = role === 'Principal' ? 'SC' : role === 'Security Guard' ? 'MR' : role === 'Parent' ? 'JW' : role === 'Student' ? 'AW' : role === 'Teacher' ? 'OB' : 'JT'

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('sms-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return <div className="app-shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <Link to="/" className="brand"><div className="brand-mark"><GraduationCap size={21} /></div><div><strong>northstar</strong><span>LEARNING SYSTEM</span></div><button className="sidebar-close" aria-label="Close menu" onClick={(event) => { event.preventDefault(); setMobileOpen(false) }}><X size={18} /></button></Link>
      <div className="school-switch"><div className="school-avatar">N</div><div><strong>Northstar Academy</strong><span>Springfield, IL</span></div><ChevronDown size={15} /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="main-nav">{navItems.filter((item) => item.roles.includes(role)).map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Gradebook' && <span className="nav-count">3</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Shield size={17} /></div><strong>Need a hand?</strong><span>Visit our help center for guides and support.</span><button>Get support <span>↗</span></button></div><button className="nav-item settings-link"><Settings size={18} /><span>Settings</span></button><div className="sidebar-foot"><Activity size={14} /><span>All systems operational</span></div></div>
    </aside>
    <div className="main-panel">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Northstar</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div><div className="topbar-right">
        <label className="role-switcher"><span>Viewing as</span><select aria-label="Switch demo role" value={role} onChange={(event) => { setRole(event.target.value as typeof role); signIn(event.target.value as typeof role) }}>{roles.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
        <button className="icon-button theme-toggle" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode((current) => !current)}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
        <Notifications /><div className="topbar-divider" /><button className="profile-button"><Avatar initials={initials} size="small" /><span className="profile-info"><strong>{role === 'Principal' ? 'Sarah Chen' : role === 'Teacher' ? 'Olivia Bennett' : role === 'Security Guard' ? 'Marcus Reed' : role === 'Parent' ? 'James Wilson' : role === 'Student' ? 'Ava Wilson' : 'Jordan Taylor'}</strong><small>{role}</small></span><ChevronDown size={14} /></button>
        <button className="top-logout" title="Return to login" onClick={() => { localStorage.removeItem('sms-signed-in'); window.location.href = '/login' }}><LogOut size={16} /></button>
      </div></header>
      <main className="content"><Outlet /></main>
      <footer className="app-footer"><span>© 2025 Northstar Academy</span><span>School Management System <span className="footer-dot">·</span> v1.0</span></footer>
    </div>
  </div>
}
