import { useQuery } from '@tanstack/react-query'
import {
  FolderKanban, Users, AlertTriangle, ClipboardList, Clock, CheckCircle,
  TrendingUp, ArrowRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi } from '@/api/dashboard'
import { useAuthStore } from '@/store/auth'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, timeAgo } from '@/utils/format'
import { Link } from 'react-router-dom'
import type { LogSummary, IssueSummary } from '@/types'

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#f59e0b']

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data.data),
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (isLoading) return <Spinner fullPage />

  const stats = data?.stats
  const recentLogs = (data?.recent_activity?.recent_logs ?? []) as LogSummary[]
  const recentIssues = (data?.recent_activity?.recent_issues ?? []) as IssueSummary[]

  const barData = [
    { name: 'Mon', logs: 4 },
    { name: 'Tue', logs: 7 },
    { name: 'Wed', logs: 5 },
    { name: 'Thu', logs: 8 },
    { name: 'Fri', logs: 6 },
    { name: 'Sat', logs: 3 },
    { name: 'Sun', logs: 1 },
  ]

  const pieData = [
    { name: 'Active', value: stats?.active_projects ?? 0 },
    { name: 'On Hold', value: 2 },
    { name: 'Completed', value: 3 },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-orange-100 text-sm">{greeting()},</p>
            <h2 className="text-2xl font-bold mt-0.5">{user?.name} 👋</h2>
            <p className="text-orange-100 text-sm mt-2">
              Here's what's happening on your sites today.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="bg-white/10 rounded-xl p-3">
              <TrendingUp size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Active Projects"
          value={stats?.active_projects ?? 0}
          icon={<FolderKanban size={18} />}
          color="orange"
          className="xl:col-span-1 col-span-1"
        />
        <StatCard
          label="Workers on Site"
          value={stats?.workers_on_site ?? 0}
          icon={<Users size={18} />}
          color="blue"
        />
        <StatCard
          label="Open Issues"
          value={stats?.open_issues ?? 0}
          icon={<AlertTriangle size={18} />}
          color="red"
        />
        <StatCard
          label="Logs Today"
          value={stats?.logs_today ?? 0}
          icon={<ClipboardList size={18} />}
          color="green"
        />
        <StatCard
          label="Pending Approvals"
          value={stats?.pending_approvals ?? 0}
          icon={<Clock size={18} />}
          color="amber"
        />
        <StatCard
          label="Total Members"
          value={stats?.total_members ?? 0}
          icon={<CheckCircle size={18} />}
          color="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Logs This Week</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={28}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="logs" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Project Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent logs */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Recent Logs</h3>
            <Link to="/logs" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentLogs.length === 0 ? (
              <EmptyState
                title="No logs yet"
                description="Daily logs will appear here"
                className="py-8"
              />
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <Link
                  key={log.id}
                  to={`/logs/${log.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {log.project_name} — {formatDate(log.date)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {log.created_by_name} · {timeAgo(log.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent issues */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Recent Issues</h3>
            <Link to="/issues" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentIssues.length === 0 ? (
              <EmptyState
                title="No issues found"
                description="Issues will appear here"
                className="py-8"
              />
            ) : (
              recentIssues.slice(0, 5).map((issue) => (
                <Link
                  key={issue.id}
                  to={`/issues/${issue.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={14} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{issue.title}</p>
                    <p className="text-xs text-slate-400 truncate">{issue.project_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={issue.priority} />
                    <StatusBadge status={issue.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
