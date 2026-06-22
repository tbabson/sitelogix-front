import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, MapPin, Calendar, Users, MoreVertical, Archive, Copy, Trash2, Pencil, RotateCcw, UserPlus, X as XIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { projectsApi } from '@/api/projects'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/format'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Project, User } from '@/types'
import { cn } from '@/utils/cn'

const projectSchema = z.object({
  name: z.string().min(2, 'Name required'),
  description: z.string().optional(),
  location: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']),
})
type ProjectForm = z.infer<typeof projectSchema>

const dupSchema = z.object({ name: z.string().min(2, 'Name required') })
type DupForm = z.infer<typeof dupSchema>

function sanitize(d: ProjectForm): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(d)) {
    if (v === '' || v === undefined) continue
    if ((k === 'start_date' || k === 'end_date') && typeof v === 'string') {
      out[k] = new Date(v).toISOString()
    } else {
      out[k] = v
    }
  }
  return out
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const STATUS_FILTER = [{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]

const statusColors: Record<string, string> = {
  active: 'border-t-green-400',
  on_hold: 'border-t-amber-400',
  completed: 'border-t-blue-400',
  archived: 'border-t-slate-400',
}

export function ProjectsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])
  const [memberPickId, setMemberPickId] = useState('')
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [dupTarget, setDupTarget] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const canManage = user?.role === 'admin' || user?.role === 'supervisor'
  const isAdmin = user?.role === 'admin'

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => projectsApi.list(statusFilter ? { status: statusFilter } : undefined).then(r => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list().then(r => r.data),
    enabled: createOpen,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (d: ProjectForm) => projectsApi.create(sanitize(d)),
    onSuccess: async (res) => {
      const projectId = res.data.data.id
      if (selectedMembers.length > 0) {
        await Promise.allSettled(
          selectedMembers.map(m =>
            projectsApi.members.add(projectId, { user_id: m.id, role: m.role === 'worker' ? 'supervisor' : m.role })
          )
        )
      }
      qc.invalidateQueries({ queryKey: ['projects'] })
      setCreateOpen(false)
      createForm.reset()
      setSelectedMembers([])
      setMemberPickId('')
      toast.success('Project created')
    },
    onError: () => toast.error('Failed to create project'),
  })

  const updateMutation = useMutation({
    mutationFn: (d: ProjectForm) => projectsApi.update(editTarget!.id, sanitize(d)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setEditTarget(null)
      toast.success('Project updated')
    },
    onError: () => toast.error('Failed to update project'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => projectsApi.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project archived') },
    onError: () => toast.error('Failed to archive project'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => projectsApi.restore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project restored') },
    onError: () => toast.error('Failed to restore project'),
  })

  const dupMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => projectsApi.duplicate(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setDupTarget(null)
      dupForm.reset()
      toast.success('Project duplicated')
    },
    onError: () => toast.error('Failed to duplicate project'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setDeleteTarget(null)
      toast.success('Project deleted')
    },
    onError: () => toast.error('Failed to delete project'),
  })

  // ── Forms ──────────────────────────────────────────────────────────────────

  const createForm = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', status: 'active' },
  })

  const editForm = useForm<ProjectForm>({ resolver: zodResolver(projectSchema) })
  const dupForm = useForm<DupForm>({ resolver: zodResolver(dupSchema) })

  const openEdit = (p: Project) => {
    setEditTarget(p)
    editForm.reset({
      name: p.name,
      description: p.description ?? '',
      location: p.location ?? '',
      start_date: p.start_date ? p.start_date.slice(0, 10) : '',
      end_date: p.end_date ? p.end_date.slice(0, 10) : '',
      status: p.status,
    })
  }

  const openDup = (p: Project) => {
    setDupTarget(p)
    dupForm.reset({ name: `${p.name} (Copy)` })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const projects = (data?.data ?? []) as Project[]
  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400"
          >
            {STATUS_FILTER.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {canManage && (
          <Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            New Project
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <Spinner fullPage />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderIcon />}
          title="No projects found"
          description="Create your first project to get started"
          action={canManage ? <Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New Project</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <div
              key={project.id}
              className={cn(
                'bg-white rounded-xl border border-slate-200 border-t-4 p-5 hover:shadow-md transition-all group',
                statusColors[project.status]
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-base font-semibold text-slate-900 hover:text-orange-600 transition-colors line-clamp-1"
                  >
                    {project.name}
                  </Link>
                  {project.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.description}</p>
                  )}
                </div>

                {canManage && (
                  <div className="relative ml-2">
                    <button
                      onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {openMenu === project.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 w-44 overflow-hidden">
                        <MenuItem icon={<Pencil size={13} />} onClick={() => { openEdit(project); setOpenMenu(null) }}>
                          Edit
                        </MenuItem>
                        <MenuItem icon={<Copy size={13} />} onClick={() => { openDup(project); setOpenMenu(null) }}>
                          Duplicate
                        </MenuItem>
                        {project.status !== 'archived' ? (
                          <MenuItem icon={<Archive size={13} />} onClick={() => { archiveMutation.mutate(project.id); setOpenMenu(null) }}>
                            Archive
                          </MenuItem>
                        ) : (
                          <MenuItem icon={<RotateCcw size={13} />} onClick={() => { restoreMutation.mutate(project.id); setOpenMenu(null) }}>
                            Restore
                          </MenuItem>
                        )}
                        {isAdmin && (
                          <MenuItem icon={<Trash2 size={13} />} danger onClick={() => { setDeleteTarget(project); setOpenMenu(null) }}>
                            Delete
                          </MenuItem>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <StatusBadge status={project.status} />
                {project.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={10} /> {project.location}
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                {project.start_date && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={11} /> {formatDate(project.start_date)}
                  </div>
                )}
                {project.end_date && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={11} /> → {formatDate(project.end_date)}
                  </div>
                )}
              </div>

              <Link
                to={`/projects/${project.id}`}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-orange-300 hover:text-orange-600 transition-all"
              >
                <Users size={12} /> View Project
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.reset(); setSelectedMembers([]); setMemberPickId('') }}
        title="New Project"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCreateOpen(false); createForm.reset(); setSelectedMembers([]); setMemberPickId('') }}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={createForm.handleSubmit(d => createMutation.mutate(d))}
            >
              Create Project
            </Button>
          </>
        }
      >
        <ProjectFormFields form={createForm} />

        {/* Member picker */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-2">
            <Users size={13} className="text-slate-400" />
            Add Members
          </p>
          <div className="flex gap-2">
            <select
              value={memberPickId}
              onChange={e => setMemberPickId(e.target.value)}
              className="flex-1 text-sm py-2 px-3 rounded-lg border border-slate-200 outline-none focus:border-orange-400 bg-white"
            >
              <option value="">Select supervisor or client...</option>
              {(usersData?.data ?? [])
                .filter(u => (u.role === 'supervisor' || u.role === 'client') && !selectedMembers.some(m => m.id === u.id))
                .map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                ))
              }
            </select>
            <button
              type="button"
              disabled={!memberPickId}
              onClick={() => {
                const picked = (usersData?.data ?? []).find(u => u.id === memberPickId)
                if (!picked) return
                setSelectedMembers(prev => [...prev, picked])
                setMemberPickId('')
              }}
              className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
              title="Add member"
            >
              <UserPlus size={14} />
            </button>
          </div>

          {selectedMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedMembers.map(m => (
                <span key={m.id} className="inline-flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">
                  {m.name}
                  <span className="text-orange-300">·</span>
                  {m.role}
                  <button
                    type="button"
                    onClick={() => setSelectedMembers(prev => prev.filter(sm => sm.id !== m.id))}
                    className="text-orange-400 hover:text-orange-600 transition-colors"
                  >
                    <XIcon size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Project"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              loading={updateMutation.isPending}
              onClick={editForm.handleSubmit(d => updateMutation.mutate(d))}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <ProjectFormFields form={editForm} />
      </Modal>

      {/* ── Duplicate Modal ────────────────────────────────────────────────── */}
      <Modal
        open={!!dupTarget}
        onClose={() => { setDupTarget(null); dupForm.reset() }}
        title="Duplicate Project"
        footer={
          <>
            <Button variant="outline" onClick={() => { setDupTarget(null); dupForm.reset() }}>Cancel</Button>
            <Button
              loading={dupMutation.isPending}
              onClick={dupForm.handleSubmit(d => dupMutation.mutate({ id: dupTarget!.id, name: d.name }))}
            >
              Duplicate
            </Button>
          </>
        }
      >
        <Input
          label="New Project Name"
          {...dupForm.register('name')}
          error={dupForm.formState.errors.name?.message}
          placeholder="e.g. Tower Block A (Copy)"
        />
      </Modal>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Project"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget!.id)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
          This permanently removes all logs, issues, media and members and cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

// ── Shared form fields ────────────────────────────────────────────────────────

function ProjectFormFields({ form }: { form: ReturnType<typeof useForm<ProjectForm>> }) {
  const { register, formState: { errors } } = form
  return (
    <div className="space-y-4">
      <Input label="Project Name" {...register('name')} error={errors.name?.message} placeholder="e.g. Tower Block A - Foundation" />
      <Textarea label="Description" {...register('description')} placeholder="Brief description..." rows={3} />
      <Input label="Location" {...register('location')} placeholder="e.g. Lagos, Nigeria" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Start Date" type="date" {...register('start_date')} />
        <Input label="End Date" type="date" {...register('end_date')} />
      </div>
      <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
    </div>
  )
}

// ── Context menu item ─────────────────────────────────────────────────────────

function MenuItem({ icon, children, onClick, danger }: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50',
        danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600'
      )}
    >
      {icon} {children}
    </button>
  )
}

function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
