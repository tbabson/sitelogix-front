import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, ArrowRightLeft, TrendingDown, TrendingUp, Pencil, Trash2, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { inventoryApi } from '@/api/inventory'
import { materialsApi } from '@/api/materials'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Material, Project, InventoryItem, InventoryTransaction } from '@/types'
import { formatDate } from '@/utils/format'

type Tab = 'materials' | 'head_office' | 'project' | 'transactions'

const materialSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
})
type MaterialForm = z.infer<typeof materialSchema>

const stockSchema = z.object({
  material_id: z.string().min(1, 'Select a material'),
  quantity: z.number().gt(0, 'Must be > 0'),
  unit_cost: z.number().optional(),
  notes: z.string().optional(),
})
type StockForm = z.infer<typeof stockSchema>

const transferSchema = z.object({
  material_id: z.string().min(1, 'Select a material'),
  project_id: z.string().min(1, 'Select a project'),
  quantity: z.number().gt(0, 'Must be > 0'),
  notes: z.string().optional(),
})
type TransferForm = z.infer<typeof transferSchema>

function txIcon(type: string) {
  if (type.includes('out') || type === 'usage') return <TrendingDown size={14} className="text-red-400" />
  return <TrendingUp size={14} className="text-green-400" />
}

function txColor(type: string) {
  if (type.includes('out') || type === 'usage') return 'text-red-600'
  return 'text-green-600'
}

export function InventoryPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const canConfirm = user?.role === 'admin' || user?.role === 'supervisor'
  const [tab, setTab] = useState<Tab>('materials')
  const [projectFilter, setProjectFilter] = useState('')
  const [confirmingId, setConfirmingId] = useState('')
  const [addStockOpen, setAddStockOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [editMaterial, setEditMaterial] = useState<Material | null>(null)

  // ── Queries ──────────────────────────────────────────────────────
  const { data: materialsData, isLoading: matsLoading } = useQuery({
    queryKey: ['materials-list'],
    queryFn: () => materialsApi.list().then(r => r.data.data as Material[]),
  })

  const { data: hoData, isLoading: hoLoading } = useQuery({
    queryKey: ['inventory-ho'],
    queryFn: () => inventoryApi.getHeadOffice().then(r => r.data.data as InventoryItem[]),
    enabled: tab === 'head_office',
  })

  const { data: projData, isLoading: projLoading } = useQuery({
    queryKey: ['inventory-project', projectFilter],
    queryFn: () => inventoryApi.getProject(projectFilter).then(r => r.data.data as InventoryItem[]),
    enabled: tab === 'project' && !!projectFilter,
  })

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => inventoryApi.getTransactions().then(r => r.data.data as InventoryTransaction[]),
    enabled: tab === 'transactions',
  })

  const { data: pendingData } = useQuery({
    queryKey: ['inventory-pending', projectFilter],
    queryFn: () => inventoryApi.getPendingTransfers(projectFilter).then(r => r.data.data as InventoryTransaction[]),
    enabled: tab === 'project' && !!projectFilter,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list().then(r => r.data.data as Project[]),
  })

  // ── Material forms ────────────────────────────────────────────────
  const {
    register: regMat, handleSubmit: handleMat, reset: resetMat, setValue: setMatVal,
    formState: { errors: matErrors, isSubmitting: matSubmitting },
  } = useForm<MaterialForm>({ resolver: zodResolver(materialSchema) })

  const createMaterialMutation = useMutation({
    mutationFn: (d: MaterialForm) => materialsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials-list'] })
      toast.success('Material added to catalog')
      setMaterialOpen(false)
      resetMat()
    },
    onError: () => toast.error('Failed to create material'),
  })

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: MaterialForm }) => materialsApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials-list'] })
      toast.success('Material updated')
      setEditMaterial(null)
      resetMat()
    },
    onError: () => toast.error('Failed to update material'),
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) => materialsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials-list'] })
      toast.success('Material deleted')
    },
    onError: () => toast.error('Failed to delete material'),
  })

  function openEdit(m: Material) {
    setEditMaterial(m)
    setMatVal('name', m.name)
    setMatVal('unit', m.unit)
    setMatVal('description', m.description ?? '')
  }

  // ── Stock / Transfer forms ────────────────────────────────────────
  const {
    register: regStock, handleSubmit: handleStock, reset: resetStock,
    formState: { errors: stockErrors, isSubmitting: stockSubmitting },
  } = useForm<StockForm>({ resolver: zodResolver(stockSchema) })

  const {
    register: regTransfer, handleSubmit: handleTransfer, reset: resetTransfer,
    formState: { errors: transferErrors, isSubmitting: transferSubmitting },
  } = useForm<TransferForm>({ resolver: zodResolver(transferSchema) })

  const addStockMutation = useMutation({
    mutationFn: (d: StockForm) => inventoryApi.addStock(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-ho'] })
      qc.invalidateQueries({ queryKey: ['inventory-transactions'] })
      toast.success('Stock added')
      setAddStockOpen(false)
      resetStock()
    },
    onError: () => toast.error('Failed to add stock'),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.confirmReceipt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-pending', projectFilter] })
      qc.invalidateQueries({ queryKey: ['inventory-project', projectFilter] })
      toast.success('Receipt confirmed — project inventory updated')
      setConfirmingId('')
    },
    onError: () => { toast.error('Failed to confirm receipt'); setConfirmingId('') },
  })

  const transferMutation = useMutation({
    mutationFn: (d: TransferForm) => inventoryApi.transfer(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-ho'] })
      qc.invalidateQueries({ queryKey: ['inventory-pending'] })
      qc.invalidateQueries({ queryKey: ['inventory-transactions'] })
      toast.success('Transfer sent — supervisor must confirm receipt')
      setTransferOpen(false)
      resetTransfer()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Transfer failed')
    },
  })

  const materialOptions = (materialsData ?? []).map(m => ({ value: m.id, label: `${m.name} (${m.unit})` }))
  const projectOptions = (projectsData ?? []).map(p => ({ value: p.id, label: p.name }))

  const TABS: { id: Tab; label: string }[] = [
    { id: 'materials', label: 'Materials Catalog' },
    { id: 'head_office', label: 'Head Office Stock' },
    { id: 'project', label: 'Project Inventory' },
    { id: 'transactions', label: 'Transactions' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-slate-900">Inventory</h1>
        <div className="flex items-center gap-2">
          {isAdmin && tab === 'materials' && (
            <Button icon={<Plus size={13} />} onClick={() => { resetMat(); setMaterialOpen(true) }}>
              Add Material
            </Button>
          )}
          {isAdmin && tab === 'head_office' && (
            <>
              <Button variant="outline" icon={<ArrowRightLeft size={13} />} onClick={() => setTransferOpen(true)}>
                Transfer to Project
              </Button>
              <Button icon={<Plus size={13} />} onClick={() => setAddStockOpen(true)}>
                Add Stock
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Materials Catalog */}
      {tab === 'materials' && (
        matsLoading ? <Spinner fullPage /> : (materialsData ?? []).length === 0 ? (
          <EmptyState
            icon={<Package size={22} />}
            title="No materials yet"
            description="Add materials to the catalog first — they will be available when adding stock or placing requisitions"
            action={isAdmin ? <Button icon={<Plus size={13} />} onClick={() => { resetMat(); setMaterialOpen(true) }}>Add Material</Button> : undefined}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  {isAdmin && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(materialsData ?? []).map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{m.name}</td>
                    <td className="px-5 py-3 text-slate-500">{m.unit}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{m.description ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete "${m.name}"?`)) deleteMaterialMutation.mutate(m.id) }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Head Office Stock */}
      {tab === 'head_office' && (
        hoLoading ? <Spinner fullPage /> : (hoData ?? []).length === 0 ? (
          <EmptyState
            icon={<Package size={22} />}
            title="No stock yet"
            description="Add stock to head office inventory"
            action={isAdmin ? <Button icon={<Plus size={13} />} onClick={() => setAddStockOpen(true)}>Add Stock</Button> : undefined}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Material</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(hoData ?? []).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{item.material_name}</td>
                    <td className="px-5 py-3 text-slate-500">{item.material_unit}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{item.quantity.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      {item.unit_cost != null ? `₦${item.unit_cost.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Project Inventory */}
      {tab === 'project' && (
        <div className="space-y-4">
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400"
          >
            <option value="">Select a project...</option>
            {(projectsData ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Pending deliveries awaiting supervisor confirmation */}
          {!!projectFilter && (pendingData ?? []).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2">
                <Clock size={13} className="text-amber-500" />
                <p className="text-sm font-semibold text-amber-800">
                  Pending Deliveries — Awaiting Receipt Confirmation
                </p>
                <span className="ml-auto text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {(pendingData ?? []).length}
                </span>
              </div>
              <div className="divide-y divide-amber-100">
                {(pendingData ?? []).map(tx => (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {tx.quantity_change} {tx.material_unit} of {tx.material_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sent by {tx.creator_name ?? 'admin'} · {formatDate(tx.created_at)}
                        {tx.notes && ` · ${tx.notes}`}
                      </p>
                    </div>
                    {canConfirm && (
                      <button
                        onClick={() => { setConfirmingId(tx.id); confirmMutation.mutate(tx.id) }}
                        disabled={confirmMutation.isPending && confirmingId === tx.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Confirm Receipt
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!projectFilter ? (
            <p className="text-sm text-slate-400">Select a project to view its inventory.</p>
          ) : projLoading ? <Spinner fullPage /> : (projData ?? []).length === 0 ? (
            <EmptyState icon={<Package size={22} />} title="No materials" description="No materials have been transferred to this project yet" />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Material</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(projData ?? []).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">{item.material_name}</td>
                      <td className="px-5 py-3 text-slate-500">{item.material_unit}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">{item.quantity.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        txLoading ? <Spinner fullPage /> : (txData ?? []).length === 0 ? (
          <EmptyState icon={<ArrowRightLeft size={22} />} title="No transactions" description="Inventory movements will appear here" />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {(txData ?? []).map(tx => (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                    {txIcon(tx.transaction_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{tx.material_name}</p>
                    <p className="text-xs text-slate-500">
                      {tx.transaction_type.replace(/_/g, ' ')}
                      {tx.project_name ? ` · ${tx.project_name}` : ' · Head Office'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${txColor(tx.transaction_type)}`}>
                      {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change} {tx.material_unit}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Add / Edit Material Modal */}
      <Modal
        open={materialOpen || !!editMaterial}
        onClose={() => { setMaterialOpen(false); setEditMaterial(null); resetMat() }}
        title={editMaterial ? 'Edit Material' : 'Add Material to Catalog'}
        footer={
          <>
            <Button variant="outline" onClick={() => { setMaterialOpen(false); setEditMaterial(null); resetMat() }}>Cancel</Button>
            <Button
              loading={matSubmitting}
              onClick={handleMat(d =>
                editMaterial
                  ? updateMaterialMutation.mutate({ id: editMaterial.id, d })
                  : createMaterialMutation.mutate(d)
              )}
            >
              {editMaterial ? 'Save Changes' : 'Add Material'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Material Name" placeholder="e.g. Cement, Steel Rods, Sand" {...regMat('name')} error={matErrors.name?.message} />
          <Input label="Unit of Measurement" placeholder="e.g. bags, tonnes, pieces, m³" {...regMat('unit')} error={matErrors.unit?.message} />
          <Textarea label="Description (optional)" placeholder="Brief description..." {...regMat('description')} rows={2} />
        </div>
      </Modal>

      {/* Add Stock Modal */}
      <Modal
        open={addStockOpen}
        onClose={() => { setAddStockOpen(false); resetStock() }}
        title="Add Head Office Stock"
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddStockOpen(false); resetStock() }}>Cancel</Button>
            <Button loading={stockSubmitting} onClick={handleStock(d => addStockMutation.mutate(d))}>Add Stock</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Material" options={materialOptions} placeholder="Select material..." {...regStock('material_id')} error={stockErrors.material_id?.message} />
          <Input label="Quantity" type="number" step="0.001" {...regStock('quantity', { valueAsNumber: true })} error={stockErrors.quantity?.message} />
          <Input label="Unit Cost (₦)" type="number" step="0.01" {...regStock('unit_cost', { valueAsNumber: true })} />
          <Textarea label="Notes" {...regStock('notes')} rows={2} />
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={transferOpen}
        onClose={() => { setTransferOpen(false); resetTransfer() }}
        title="Transfer to Project"
        footer={
          <>
            <Button variant="outline" onClick={() => { setTransferOpen(false); resetTransfer() }}>Cancel</Button>
            <Button loading={transferSubmitting} onClick={handleTransfer(d => transferMutation.mutate(d))}>Transfer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Material" options={materialOptions} placeholder="Select material..." {...regTransfer('material_id')} error={transferErrors.material_id?.message} />
          <Select label="Project" options={projectOptions} placeholder="Select project..." {...regTransfer('project_id')} error={transferErrors.project_id?.message} />
          <Input label="Quantity" type="number" step="0.001" {...regTransfer('quantity', { valueAsNumber: true })} error={transferErrors.quantity?.message} />
          <Textarea label="Notes" {...regTransfer('notes')} rows={2} />
        </div>
      </Modal>
    </div>
  )
}
