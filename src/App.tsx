import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { LogsPage } from '@/pages/logs/LogsPage'
import { IssuesPage } from '@/pages/issues/IssuesPage'
import { AttendancePage } from '@/pages/attendance/AttendancePage'
import { MediaPage } from '@/pages/media/MediaPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { RequisitionsPage } from '@/pages/requisitions/RequisitionsPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/requisitions" element={<RequisitionsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#0f172a',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
