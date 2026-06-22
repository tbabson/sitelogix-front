import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, UserX, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { User } from '@/types'
import { cn } from '@/utils/cn'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-orange-100 text-orange-700',
  client: 'bg-blue-100 text-blue-700',
  worker: 'bg-green-100 text-green-700',
}

export function UsersPage() {
  const { user: me } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated') },
    onError: () => toast.error('Failed to deactivate'),
  })

  const users = (data?.data ?? []) as User[]
  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    supervisor: users.filter(u => u.role === 'supervisor').length,
    client: users.filter(u => u.role === 'client').length,
    worker: users.filter(u => u.role === 'worker').length,
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { role: 'admin', count: stats.admin, label: 'Admins', color: 'text-purple-600 bg-purple-50' },
          { role: 'supervisor', count: stats.supervisor, label: 'Supervisors', color: 'text-orange-600 bg-orange-50' },
          { role: 'client', count: stats.client, label: 'Clients', color: 'text-blue-600 bg-blue-50' },
          { role: 'worker', count: stats.worker, label: 'Workers', color: 'text-green-600 bg-green-50' },
        ].map(({ role, count, label, color }) => (
          <button
            key={role}
            onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              roleFilter === role
                ? 'border-orange-300 bg-orange-50/50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <p className="text-2xl font-bold text-slate-900">{count}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400 w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-slate-400" />
          <span className="text-sm text-slate-500">{filtered.length} users</span>
        </div>
      </div>

      {isLoading ? (
        <Spinner fullPage />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="No users found" description="Users will appear here" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Joined</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatar_url} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', ROLE_COLORS[u.role])}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-slate-500">{formatDate(u.created_at)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={u.is_active ? 'green' : 'gray'} dot>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {me?.role === 'admin' && u.id !== me.id && u.is_active && (
                      <button
                        onClick={() => { if (confirm(`Deactivate ${u.name}?`)) deactivateMutation.mutate(u.id) }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                        title="Deactivate"
                      >
                        <UserX size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
