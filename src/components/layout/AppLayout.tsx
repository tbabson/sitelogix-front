import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { usersApi } from '@/api/users'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/logs': 'Daily Logs',
  '/issues': 'Issues',
  '/attendance': 'Attendance',
  '/media': 'Media',
  '/users': 'Users',
  '/profile': 'Profile',
}

export function AppLayout() {
  const { isAuthenticated, user, updateUser } = useAuthStore()
  const location = useLocation()

  // Re-hydrate user profile on mount so role-based UI is always accurate
  useEffect(() => {
    if (!isAuthenticated) return
    usersApi.me()
      .then(r => updateUser(r.data.data))
      .catch(() => { /* token may be expired — interceptor handles redirect */ })
  }, [isAuthenticated, updateUser])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const title = PAGE_TITLES[location.pathname] ?? PAGE_TITLES[`/${location.pathname.split('/')[1]}`]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-h-screen overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {user && <Outlet />}
        </main>
      </div>
    </div>
  )
}
