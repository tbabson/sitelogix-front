import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MapPin, Calendar, Users, BarChart2, Activity,
  Plus, Trash2, ChevronRight, Flag, Clock,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatPercent, timeAgo, toISODate } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Milestone } from '@/types'

const TABS = ['Overview', 'Members', 'Milestones', 'Activity']

const milestoneSchema = z.object({
  title: z.string().min(2),
  due_date: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'done', 'missed']),
  notes: z.string().optional(),
})
type MilestoneForm = z.infer<typeof milestoneSchema>

const MILESTONE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'missed', label: 'Missed' },
]

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('Overview')
  const [addMilestone, setAddMilestone] = useState(false)

  const canManage = user?.role === 'admin' || user?.role === 'supervisor'

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  })

  const { data: stats } = useQuery({
    queryKey: ['project-stats', id],
    queryFn: () => projectsApi.stats(id!).then(r => r.data.data),
    enabled: !!id,
  })

  const { data: members } = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => projectsApi.members.list(id!).then(r => r.data.data),
    enabled: !!id && tab === 'Members',
  })

  const { data: milestones } = useQuery({
    queryKey: ['project-milestones', id],
    queryFn: () => projectsApi.milestones.list(id!).then(r => r.data.data),
    enabled: !!id && tab === 'Milestones',
  })

  const { data: activity } = useQuery({
    queryKey: ['project-activity', id],
    queryFn: () => projectsApi.activity(id!).then(r => r.data.data),
    enabled: !!id && tab === 'Activity',
  })

  const createMilestoneMutation = useMutation({
    mutationFn: (d: MilestoneForm) => projectsApi.milestones.create(id!, { ...d, due_date: toISODate(d.due_date)! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-milestones', id] })
      setAddMilestone(false)
      toast.success('Milestone added')
      resetMilestone()
    },
  })

  const deleteMilestoneMutation = useMutation({
    mutationFn: (mid: string) => projectsApi.milestones.delete(id!, mid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-milestones', id] })
      toast.success('Milestone deleted')
    },
  })

  const { register: registerM, handleSubmit: handleSubmitM, reset: resetMilestone, formState: { errors: mErrors, isSubmitting: mSubmitting } } = useForm<MilestoneForm>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: { status: 'pending' },
  })

  if (isLoading) return <Spinner fullPage />
  if (!project) return <div className="text-center py-20 text-slate-500">Project not found</div>

  const typedMilestones = (milestones ?? []) as Milestone[]

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/projects" className="hover:text-orange-500">Projects</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="text-slate-500 text-sm mt-2">{project.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3">
              {project.location && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin size={13} className="text-orange-400" /> {project.location}
                </span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Calendar size={13} className="text-blue-400" />
                  {formatDate(project.start_date)} → {project.end_date ? formatDate(project.end_date) : 'TBD'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats mini */}
        {stats && (
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 sm:grid-cols-5 gap-4">
            {[
              { label: 'Logs', value: stats.total_logs },
              { label: 'Issues', value: stats.open_issues },
              { label: 'Workers', value: stats.total_workers },
              { label: 'Members', value: stats.total_members },
              { label: 'Media', value: stats.total_media },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Completion</span>
              <span className="text-xs font-semibold text-slate-700">{formatPercent(stats.completion_pct)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                style={{ width: `${stats.completion_pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex border-b border-slate-100 px-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Overview */}
          {tab === 'Overview' && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Approved Logs', value: `${stats.approved_logs}/${stats.total_logs}`, icon: <BarChart2 size={16} />, color: 'text-green-600 bg-green-50' },
                { label: 'Resolved Issues', value: `${stats.resolved_issues}/${stats.open_issues + stats.resolved_issues}`, icon: <Flag size={16} />, color: 'text-blue-600 bg-blue-50' },
                { label: 'On-site Workers', value: `${stats.workers_on_site}/${stats.total_workers}`, icon: <Users size={16} />, color: 'text-orange-600 bg-orange-50' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                  <span className={`p-2 rounded-lg ${color}`}>{icon}</span>
                  <div>
                    <p className="text-base font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Members */}
          {tab === 'Members' && (
            <div className="space-y-3">
              {!members || members.length === 0 ? (
                <EmptyState title="No members yet" description="Add team members to this project" />
              ) : (
                (members as Array<{ id: string; role: string; user?: { name: string; email: string; role: string; avatar_url?: string } }>).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <Avatar name={m.user?.name ?? '?'} src={m.user?.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{m.user?.name}</p>
                      <p className="text-xs text-slate-400">{m.user?.email}</p>
                    </div>
                    <StatusBadge status={m.role} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Milestones */}
          {tab === 'Milestones' && (
            <div className="space-y-3">
              {canManage && (
                <div className="flex justify-end">
                  <Button size="sm" icon={<Plus size={13} />} onClick={() => setAddMilestone(true)}>
                    Add Milestone
                  </Button>
                </div>
              )}
              {typedMilestones.length === 0 ? (
                <EmptyState title="No milestones" description="Track key project milestones" />
              ) : (
                typedMilestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{m.title}</p>
                      {m.notes && <p className="text-xs text-slate-500 mt-0.5">{m.notes}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={10} className="text-slate-400" />
                        <span className="text-xs text-slate-400">Due {formatDate(m.due_date)}</span>
                      </div>
                    </div>
                    <StatusBadge status={m.status} />
                    {canManage && (
                      <button
                        onClick={() => deleteMilestoneMutation.mutate(m.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Activity */}
          {tab === 'Activity' && (
            <div className="space-y-3">
              {!activity || (activity as unknown[]).length === 0 ? (
                <EmptyState title="No recent activity" description="Activity will appear here" />
              ) : (
                (activity as Array<{ id?: string; type?: string; title?: string; description?: string; created_at?: string }>).map((a, i) => (
                  <div key={a.id ?? i} className="flex items-start gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Activity size={14} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{a.title ?? a.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Milestone Modal */}
      <Modal
        open={addMilestone}
        onClose={() => { setAddMilestone(false); resetMilestone() }}
        title="Add Milestone"
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddMilestone(false); resetMilestone() }}>Cancel</Button>
            <Button loading={mSubmitting} onClick={handleSubmitM(d => createMilestoneMutation.mutate(d))}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" {...registerM('title')} error={mErrors.title?.message} />
          <Input label="Due Date" type="date" {...registerM('due_date')} error={mErrors.due_date?.message} />
          <Select label="Status" options={MILESTONE_STATUS_OPTIONS} {...registerM('status')} />
          <Textarea label="Notes" {...registerM('notes')} rows={3} />
        </div>
      </Modal>
    </div>
  )
}
