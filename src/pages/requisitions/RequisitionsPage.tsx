import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ShoppingCart, CheckCircle, XCircle, Truck, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { requisitionsApi } from '@/api/requisitions'
import { materialsApi } from '@/api/materials'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/auth'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Requisition, Material, Project, RequisitionItem } from '@/types'
import { timeAgo } from '@/utils/format'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'fulfilled', label: 'Fulfilled' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-l-amber-400',
  approved: 'border-l-blue-400',
  rejected: 'border-l-red-400',
  fulfilled: 'border-l-green-400',
}

const createSchema = z.object({
  project_id: z.string().min(1, 'Select a project'),
  notes: z.string().optional(),
  items: z.array(z.object({
    material_id: z.string().min(1, 'Select a material'),
    quantity_requested: z.number().gt(0, 'Must be > 0'),
  })).min(1, 'Add at least one item'),
})
type CreateForm = z.infer<typeof createSchema>

export function RequisitionsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [approveReq, setApproveReq] = useState<Requisition | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // For approving: track quantity_approved per item
  const [approveQtys, setApproveQtys] = useState<Record<string, number>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', statusFilter, projectFilter],
    queryFn: () => requisitionsApi.list({
      status: statusFilter || undefined,
      project_id: projectFilter || undefined,
    }).then(r => r.data.data as Requisition[]),
  })

  const { data: matData } = useQuery({
    queryKey: ['materials-list'],
    queryFn: () => materialsApi.list().then(r => r.data.data as Material[]),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list().then(r => r.data.data as Project[]),
  })

  const { data: detailData } = useQuery({
    queryKey: ['requisition-detail', expandedId],
    queryFn: () => requisitionsApi.get(expandedId!).then(r => r.data.data as Requisition),
    enabled: !!expandedId,
  })

  const {
    register, handleSubmit, reset, control,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { items: [{ material_id: '', quantity_requested: 1 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => requisitionsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success('Requisition submitted')
      setCreateOpen(false)
      reset()
    },
    onError: () => toast.error('Failed to create requisition'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: { item_id: string; quantity_approved: number }[] }) =>
      requisitionsApi.approve(id, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] })
      qc.invalidateQueries({ queryKey: ['requisition-detail', approveReq?.id] })
      toast.success('Requisition approved')
      setApproveReq(null)
      setApproveQtys({})
    },
    onError: () => toast.error('Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => requisitionsApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success('Requisition rejected')
    },
  })

  const fulfillMutation = useMutation({
    mutationFn: (id: string) => requisitionsApi.fulfill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] })
      qc.invalidateQueries({ queryKey: ['inventory-ho'] })
      qc.invalidateQueries({ queryKey: ['inventory-project'] })
      toast.success('Requisition fulfilled — inventory transferred')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Fulfillment failed')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => requisitionsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success('Requisition cancelled')
    },
  })

  const materialOptions = (matData ?? []).map(m => ({ value: m.id, label: `${m.name} (${m.unit})` }))
  const projectOptions = (projectsData ?? []).map(p => ({ value: p.id, label: p.name }))

  const reqs = data ?? []

  function openApprove(req: Requisition) {
    setApproveReq(req)
    // Pre-load detail for item IDs if not already expanded
    setExpandedId(req.id)
  }

  function submitApproval() {
    if (!approveReq) return
    const detail = detailData
    if (!detail?.items?.length) return
    const items = detail.items.map(item => ({
      item_id: item.id,
      quantity_approved: approveQtys[item.id] ?? item.quantity_requested,
    }))
    approveMutation.mutate({ id: approveReq.id, items })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-slate-900">Requisitions</h1>
        <Button icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>New Requisition</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400"
        >
          {STATUS_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400"
        >
          <option value="">All Projects</option>
          {(projectsData ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner fullPage /> : reqs.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={22} />}
          title="No requisitions"
          description="Request materials needed for your project"
          action={<Button icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>New Requisition</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {reqs.map(req => {
              const isExpanded = expandedId === req.id
              const detail = isExpanded ? detailData : null

              return (
                <div key={req.id} className={`border-l-4 ${STATUS_COLORS[req.status] ?? 'border-l-slate-200'}`}>
                  <div
                    className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                      <ShoppingCart size={15} className="text-orange-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{req.project_name}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        By <span className="font-medium">{req.requester_name}</span> · {timeAgo(req.created_at)}
                      </p>
                      {req.notes && <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{req.notes}</p>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && req.status === 'pending' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); openApprove(req) }}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-500 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); if (confirm('Reject this requisition?')) rejectMutation.mutate(req.id) }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Reject"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {isAdmin && req.status === 'approved' && (
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm('Fulfill and transfer inventory?')) fulfillMutation.mutate(req.id) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Fulfill"
                        >
                          <Truck size={14} />
                        </button>
                      )}
                      {req.status === 'pending' && (user?.id === req.requested_by || isAdmin) && (
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm('Cancel this requisition?')) cancelMutation.mutate(req.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Cancel"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && detail?.items && (
                    <div className="px-5 pb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left py-1 font-medium">Material</th>
                            <th className="text-right py-1 font-medium">Requested</th>
                            <th className="text-right py-1 font-medium">Approved</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {detail.items.map((item: RequisitionItem) => (
                            <tr key={item.id}>
                              <td className="py-1.5 text-slate-700">{item.material_name}</td>
                              <td className="py-1.5 text-right text-slate-700">{item.quantity_requested} {item.material_unit}</td>
                              <td className="py-1.5 text-right text-slate-500">
                                {item.quantity_approved != null ? `${item.quantity_approved} ${item.material_unit}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset() }}
        title="New Requisition"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCreateOpen(false); reset() }}>Cancel</Button>
            <Button loading={isSubmitting} onClick={handleSubmit(d => createMutation.mutate(d))}>Submit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Project" options={projectOptions} placeholder="Select project..." {...register('project_id')} error={errors.project_id?.message} />
          <Textarea label="Notes" {...register('notes')} rows={2} placeholder="Reason for requisition..." />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Materials</label>
              <button
                type="button"
                onClick={() => append({ material_id: '', quantity_requested: 1 })}
                className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                <Plus size={11} /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      options={materialOptions}
                      placeholder="Select material..."
                      {...register(`items.${idx}.material_id`)}
                      error={errors.items?.[idx]?.material_id?.message}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Qty"
                      {...register(`items.${idx}.quantity_requested`, { valueAsNumber: true })}
                      error={errors.items?.[idx]?.quantity_requested?.message}
                    />
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.items?.message && (
              <p className="mt-1 text-xs text-red-500">{errors.items.message}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal
        open={!!approveReq}
        onClose={() => { setApproveReq(null); setApproveQtys({}) }}
        title="Approve Requisition"
        footer={
          <>
            <Button variant="outline" onClick={() => { setApproveReq(null); setApproveQtys({}) }}>Cancel</Button>
            <Button loading={approveMutation.isPending} onClick={submitApproval}>Approve</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Set the approved quantity for each item (can be less than requested):</p>
          {detailData?.items?.map((item: RequisitionItem) => (
            <div key={item.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-slate-700">{item.material_name} ({item.material_unit})</span>
              <span className="text-xs text-slate-400">Req: {item.quantity_requested}</span>
              <input
                type="number"
                step="0.001"
                min="0"
                defaultValue={item.quantity_requested}
                onChange={e => setApproveQtys(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                className="w-24 text-sm py-1.5 px-2 rounded-lg border border-slate-200 outline-none focus:border-orange-400 text-right"
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
