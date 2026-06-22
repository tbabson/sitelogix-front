import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertTriangle, Search, Trash2, User, Paperclip, X as XIcon, Pencil } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { issuesApi } from '@/api/issues'
import { projectsApi } from '@/api/projects'
import { usersApi } from '@/api/users'
import { mediaApi } from '@/api/media'
import { Button } from '@/components/ui/Button'
import { StatusBadge, Badge, statusColor } from '@/components/ui/Badge'
import { AttachmentsPanel } from '@/components/ui/AttachmentsPanel'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Issue, Project } from '@/types'
import { cn } from '@/utils/cn'

const schema = z.object({
  project_id: z.string().min(1, 'Select a project'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assigned_to: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const editSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['open', 'in_progress', 'resolved']),
  assigned_to: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
]

const ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.xls,.xlsx'

type GroupMode = 'status' | 'priority'

export function IssuesPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editIssue, setEditIssue] = useState<Issue | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GroupMode>('status')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const canManage = user?.role === 'admin' || user?.role === 'supervisor'

  const { data, isLoading } = useQuery({
    queryKey: ['issues', statusFilter, priorityFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      return issuesApi.list(params).then(r => r.data)
    },
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list().then(r => r.data.data as Project[]),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list().then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: FormData) => {
      const body: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(d)) {
        if (v !== '' && v !== undefined) body[k] = v
      }
      return issuesApi.create(body)
    },
    onSuccess: async (res, variables) => {
      const issueId = (res.data as { data: { id: string } }).data.id
      if (selectedFiles.length > 0) {
        setUploading(true)
        let failed = 0
        await Promise.allSettled(
          selectedFiles.map(f => mediaApi.upload(f, variables.project_id, undefined, issueId).catch(() => { failed++ }))
        )
        setUploading(false)
        if (failed === 0) {
          toast.success(`Issue created with ${selectedFiles.length} attachment${selectedFiles.length > 1 ? 's' : ''}`)
        } else {
          toast.success('Issue created')
          toast.error(`${failed} file${failed > 1 ? 's' : ''} failed to upload`)
        }
      } else {
        toast.success('Issue created')
      }
      qc.invalidateQueries({ queryKey: ['issues'] })
      setCreateOpen(false)
      reset()
      setSelectedFiles([])
    },
    onError: () => toast.error('Failed to create issue'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Issue> }) => {
      const body: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(data)) {
        if (v !== '' && v !== undefined) body[k] = v
      }
      return issuesApi.update(id, body as Partial<Issue>)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] })
      toast.success('Issue updated')
      setEditIssue(null)
      editReset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Failed to update issue')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => issuesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['issues'] }); toast.success('Deleted') },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  const { register: editRegister, handleSubmit: editHandleSubmit, reset: editReset, formState: { errors: editErrors, isSubmitting: editSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  const openEdit = (issue: Issue) => {
    setEditIssue(issue)
    editReset({
      title: issue.title,
      description: issue.description ?? '',
      priority: issue.priority,
      status: issue.status,
      assigned_to: issue.assigned_to ?? '',
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setSelectedFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...files.filter(f => !existing.has(f.name + f.size))]
    })
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleClose = () => {
    setCreateOpen(false)
    reset()
    setSelectedFiles([])
  }

  const issues = (data?.data ?? []) as Issue[]
  const filtered = issues.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase())
  )

  const projectOptions = (projectsData ?? []).map(p => ({ value: p.id, label: p.name }))
  const userOptions = ((usersData ?? []) as Array<{id: string; name: string}>).map(u => ({ value: u.id, label: u.name }))

  const groups: Record<string, Issue[]> = {}
  if (group === 'status') {
    ['open', 'in_progress', 'resolved'].forEach(s => {
      groups[s] = filtered.filter(i => i.status === s)
    })
  } else {
    ['high', 'medium', 'low'].forEach(p => {
      groups[p] = filtered.filter(i => i.priority === p)
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search issues..."
              className="pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400 w-52"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none"
          >
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
            {(['status', 'priority'] as GroupMode[]).map(g => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors capitalize',
                  group === g ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                By {g}
              </button>
            ))}
          </div>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          New Issue
        </Button>
      </div>

      {isLoading ? (
        <Spinner fullPage />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={22} />}
          title="No issues found"
          description="Track and resolve site issues efficiently"
          action={<Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New Issue</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.entries(groups).map(([key, items]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={key} />
                <span className="text-xs text-slate-400">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    No {key.replace('_', ' ')} issues
                  </div>
                ) : (
                  items.map((issue) => (
                    <div
                      key={issue.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 line-clamp-2">{issue.title}</p>
                          {issue.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{issue.description}</p>
                          )}
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => openEdit(issue)}
                              className="p-1 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-500"
                              title="Edit issue"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => { if (confirm('Delete issue?')) deleteMutation.mutate(issue.id) }}
                              className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge color={statusColor(issue.priority)} dot>
                          {issue.priority}
                        </Badge>
                        {group === 'priority' && <StatusBadge status={issue.status} />}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400">{timeAgo(issue.created_at)}</span>
                        <div className="flex items-center gap-1">
                          {issue.assignee ? (
                            <Avatar name={(issue.assignee as unknown as {name: string}).name} size="xs" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                              <User size={9} className="text-slate-400" />
                            </div>
                          )}
                          {canManage && issue.status !== 'resolved' && (
                            <button
                              onClick={() => updateMutation.mutate({
                                id: issue.id,
                                data: { status: issue.status === 'open' ? 'in_progress' : 'resolved' },
                              })}
                              className="ml-1 text-xs text-orange-500 hover:text-orange-600 font-medium disabled:opacity-50"
                              disabled={updateMutation.isPending}
                            >
                              {issue.status === 'open' ? 'Start' : 'Resolve'}
                            </button>
                          )}
                        </div>
                      </div>
                      <AttachmentsPanel issueId={issue.id} />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={!!editIssue}
        onClose={() => { setEditIssue(null); editReset() }}
        title="Edit Issue"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setEditIssue(null); editReset() }}>Cancel</Button>
            <Button
              loading={editSubmitting || updateMutation.isPending}
              onClick={editHandleSubmit(d => {
                const body: Record<string, unknown> = {}
                for (const [k, v] of Object.entries(d)) {
                  if (v !== '' && v !== undefined) body[k] = v
                }
                updateMutation.mutate({ id: editIssue!.id, data: body as Partial<Issue> })
              })}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" {...editRegister('title')} error={editErrors.title?.message} />
          <Textarea label="Description" {...editRegister('description')} rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              {...editRegister('priority')}
              error={editErrors.priority?.message}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              {...editRegister('status')}
              error={editErrors.status?.message}
            />
          </div>
          {userOptions.length > 0 && (
            <Select label="Assign To" options={userOptions} placeholder="Unassigned" {...editRegister('assigned_to')} />
          )}
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={handleClose}
        title="New Issue"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              loading={isSubmitting || uploading}
              onClick={handleSubmit(d => createMutation.mutate(d))}
            >
              {uploading ? 'Uploading...' : 'Create Issue'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Project" options={projectOptions} placeholder="Select project..." {...register('project_id')} error={errors.project_id?.message} />
          <Input label="Title" {...register('title')} error={errors.title?.message} placeholder="Brief description of the issue" />
          <Textarea label="Description" {...register('description')} placeholder="Detailed description..." rows={3} />
          <Select label="Priority" options={PRIORITY_OPTIONS} {...register('priority')} />
          {userOptions.length > 0 && (
            <Select label="Assign To" options={userOptions} placeholder="Unassigned" {...register('assigned_to')} />
          )}

          {/* File attachment */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Attachments</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <Paperclip size={14} />
              Click to attach images, videos or documents
            </button>
            {selectedFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-lg text-xs text-slate-700">
                    <Paperclip size={11} className="text-slate-400 shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                      <XIcon size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
