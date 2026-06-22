import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, ClipboardList, Users, AlertTriangle,
  UserCheck, Image, LogOut, HardHat, ChevronRight, Package, ShoppingCart,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: null },
  { to: '/projects', icon: FolderKanban, label: 'Projects', roles: null },
  { to: '/logs', icon: ClipboardList, label: 'Daily Logs', roles: ['admin', 'supervisor', 'client'] },
  { to: '/issues', icon: AlertTriangle, label: 'Issues', roles: null },
  { to: '/attendance', icon: UserCheck, label: 'Attendance', roles: null },
  { to: '/media', icon: Image, label: 'Media', roles: null },
  { to: '/inventory', icon: Package, label: 'Inventory', roles: null },
  { to: '/requisitions', icon: ShoppingCart, label: 'Requisitions', roles: null },
]

const ADMIN_NAV = [
  { to: '/users', icon: Users, label: 'Users' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    const rt = localStorage.getItem('refresh_token')
    if (rt) {
      try { await authApi.logout(rt) } catch { /* ignore */ }
    }
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-full fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
            <HardHat size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">SiteLogix</p>
            <p className="text-slate-400 text-xs mt-0.5">Site Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Main</p>
        {NAV.filter(({ roles }) => !roles || roles.includes(user?.role ?? '')).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {(user?.role === 'admin') && (
          <>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mt-4 mb-2">Admin</p>
            {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <NavLink
          to="/profile"
          className={({ isActive }) => cn(
            'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors w-full group',
            isActive ? 'bg-slate-800' : 'hover:bg-slate-800'
          )}
        >
          {user && <Avatar name={user.name} src={user.avatar_url} size="sm" />}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate capitalize">{user?.role}</p>
          </div>
          <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-400" />
        </NavLink>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full mt-1 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
