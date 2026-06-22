import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck, Search, LogIn, LogOut, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { attendanceApi } from '@/api/attendance'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime, formatDate, timeAgo } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Attendance, Project, Worker } from '@/types'
import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/Badge'

const checkInSchema = z.object({
  project_id: z.string().min(1, 'Select project'),
  worker_id: z.string().min(1, 'Select worker'),
  notes: z.string().optional(),
})
type CheckInForm = z.infer<typeof checkInSchema>

const workerSchema = z.object({
  name: z.string().min(2, 'Name required'),
  project_id: z.string().min(1, 'Select project'),
  trade: z.string().optional(),
  phone: z.string().optional(),
})
type WorkerForm = z.infer<typeof workerSchema>

export function AttendancePage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [addWorkerOpen, setAddWorkerOpen] = useState(false)
  const [tab, setTab] = useState<'attendance' | 'workers'>('attendance')
  const [search, setSearch] = useState('')

  const canManage = user?.role === 'admin' || user?.role === 'supervisor'
  const isWorker = user?.role === 'worker'

  const { data, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => {
      if (isWorker) return attendanceApi.myAttendance().then(r => r.data)
      return attendanceApi.list().then(r => r.data)
    },
  })

  const { data: workersData, isLoading: workersLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: () => attendanceApi.workers.list().then(r => r.data),
    enabled: tab === 'workers' || checkInOpen,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list().then(r => r.data.data as Project[]),
  })

  const checkInMutation = useMutation({
    mutationFn: (d: CheckInForm) => attendanceApi.checkIn(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); setCheckInOpen(false); toast.success('Checked in'); resetCI() },
    onError: () => toast.error('Check-in failed'),
  })

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => attendanceApi.checkOut(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Checked out') },
  })

  const selfCheckInMutation = useMutation({
    mutationFn: () => attendanceApi.selfCheckIn({ project_id: '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Checked in') },
  })

  const selfCheckOutMutation = useMutation({
    mutationFn: () => attendanceApi.selfCheckOut(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Checked out') },
  })

  const addWorkerMutation = useMutation({
    mutationFn: (d: WorkerForm) => attendanceApi.workers.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workers'] }); setAddWorkerOpen(false); toast.success('Worker added'); resetW() },
    onError: () => toast.error('Failed to add worker'),
  })

  const { register: registerCI, handleSubmit: handleCI, reset: resetCI, formState: { errors: ciErrors, isSubmitting: ciSubmitting } } = useForm<CheckInForm>({
    resolver: zodResolver(checkInSchema),
  })

  const { register: registerW, handleSubmit: handleW, reset: resetW, formState: { errors: wErrors, isSubmitting: wSubmitting } } = useForm<WorkerForm>({
    resolver: zodResolver(workerSchema),
  })

  const attendance = (data?.data ?? []) as Attendance[]
  const workers = (workersData?.data ?? []) as Worker[]
  const projects = (projectsData ?? []) as Project[]

  const filtered = attendance.filter(a => {
    const workerName = (a.worker as unknown as {name?: string})?.name ?? ''
    return !search || workerName.toLowerCase().includes(search.toLowerCase())
  })

  const filteredWorkers = workers.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.trade?.toLowerCase().includes(search.toLowerCase())
  )

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }))
  const workerOptions = workers.map(w => ({ value: w.id, label: w.name }))

  return (
    <div className="space-y-5">
      {/* Tab + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
          {(['attendance', 'workers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2.5 text-sm font-medium transition-colors capitalize',
                tab === t ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {t === 'attendance' ? 'Attendance' : 'Workers'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400 w-48"
            />
          </div>
          {isWorker ? (
            <div className="flex gap-2">
              <Button size="sm" icon={<LogIn size={13} />} onClick={() => selfCheckInMutation.mutate()}>Check In</Button>
              <Button size="sm" variant="secondary" icon={<LogOut size={13} />} onClick={() => selfCheckOutMutation.mutate()}>Check Out</Button>
            </div>
          ) : canManage && (
            <div className="flex gap-2">
              {tab === 'attendance' && (
                <Button icon={<Plus size={14} />} onClick={() => setCheckInOpen(true)}>Check In</Button>
              )}
              {tab === 'workers' && (
                <Button icon={<Plus size={14} />} onClick={() => setAddWorkerOpen(true)}>Add Worker</Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attendance tab */}
      {tab === 'attendance' && (
        isLoading ? <Spinner fullPage /> :
        filtered.length === 0 ? (
          <EmptyState icon={<UserCheck size={22} />} title="No attendance records" description="Check-in records will appear here" />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filtered.map((a) => {
                const worker = a.worker as unknown as { name?: string; trade?: string }
                const isOnSite = !a.check_out
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isOnSite ? 'bg-green-400' : 'bg-slate-300')} />
                    <Avatar name={worker?.name ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{worker?.name ?? 'Unknown Worker'}</p>
                      {worker?.trade && <p className="text-xs text-slate-400">{worker.trade}</p>}
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <LogIn size={10} /> {formatDateTime(a.check_in)}
                      </div>
                      {a.check_out && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <LogOut size={10} /> {formatDateTime(a.check_out)}
                        </div>
                      )}
                    </div>
                    <Badge color={isOnSite ? 'green' : 'gray'} dot>
                      {isOnSite ? 'On Site' : 'Left'}
                    </Badge>
                    {isOnSite && canManage && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<LogOut size={12} />}
                        onClick={() => checkOutMutation.mutate(a.id)}
                      >
                        Out
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Workers tab */}
      {tab === 'workers' && (
        workersLoading ? <Spinner fullPage /> :
        filteredWorkers.length === 0 ? (
          <EmptyState
            icon={<UserCheck size={22} />}
            title="No workers found"
            description="Add workers to track their attendance"
            action={canManage ? <Button icon={<Plus size={14} />} onClick={() => setAddWorkerOpen(true)}>Add Worker</Button> : undefined}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredWorkers.map((w) => (
                <div key={w.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <Avatar name={w.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{w.name}</p>
                    {w.trade && <p className="text-xs text-slate-400">{w.trade}</p>}
                  </div>
                  {w.phone && (
                    <span className="text-xs text-slate-500 hidden sm:block">{w.phone}</span>
                  )}
                  <Badge color="blue">{w.user_id ? 'Linked' : 'Unlinked'}</Badge>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Check In Modal */}
      <Modal
        open={checkInOpen}
        onClose={() => { setCheckInOpen(false); resetCI() }}
        title="Check In Worker"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCheckInOpen(false); resetCI() }}>Cancel</Button>
            <Button loading={ciSubmitting} onClick={handleCI(d => checkInMutation.mutate(d))}>
              Check In
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Project" options={projectOptions} placeholder="Select project..." {...registerCI('project_id')} error={ciErrors.project_id?.message} />
          <Select label="Worker" options={workerOptions} placeholder="Select worker..." {...registerCI('worker_id')} error={ciErrors.worker_id?.message} />
          <Textarea label="Notes" {...registerCI('notes')} rows={2} />
        </div>
      </Modal>

      {/* Add Worker Modal */}
      <Modal
        open={addWorkerOpen}
        onClose={() => { setAddWorkerOpen(false); resetW() }}
        title="Add Worker"
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddWorkerOpen(false); resetW() }}>Cancel</Button>
            <Button loading={wSubmitting} onClick={handleW(d => addWorkerMutation.mutate(d))}>
              Add Worker
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" {...registerW('name')} error={wErrors.name?.message} />
          <Select label="Project" options={projectOptions} placeholder="Select project..." {...registerW('project_id')} error={wErrors.project_id?.message} />
          <Input label="Trade / Role" {...registerW('trade')} placeholder="e.g. Electrician, Mason" />
          <Input label="Phone" {...registerW('phone')} type="tel" />
        </div>
      </Modal>
    </div>
  )
}
