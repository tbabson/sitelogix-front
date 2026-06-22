import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { logsApi } from '@/api/logs'
import { materialsApi } from '@/api/materials'
import { inventoryApi } from '@/api/inventory'
import { useAuthStore } from '@/store/auth'
import type { LogMaterial, Material, InventoryItem } from '@/types'

interface Props {
  logId: string
  projectId: string
  logOwnerId: string
  editable?: boolean
}

export function LogMaterialsPanel({ logId, projectId, logOwnerId, editable = false }: Props) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [materialId, setMaterialId] = useState('')
  const [qty, setQty] = useState('')

  const canEdit = editable && (user?.id === logOwnerId || user?.role === 'admin')

  const { data, isLoading } = useQuery({
    queryKey: ['log-materials', logId],
    queryFn: () => logsApi.listMaterials(logId).then(r => r.data.data as LogMaterial[]),
  })

  const { data: matData } = useQuery({
    queryKey: ['materials-list'],
    queryFn: () => materialsApi.list().then(r => r.data.data as Material[]),
    enabled: open && adding,
  })

  const { data: projInv } = useQuery({
    queryKey: ['inventory-project', projectId],
    queryFn: () => inventoryApi.getProject(projectId).then(r => r.data.data as InventoryItem[]),
    enabled: open && adding && !!projectId,
  })

  const projStockMap = new Map<string, number>(
    (projInv ?? []).map(item => [item.material_id, item.quantity])
  )

  const addMutation = useMutation({
    mutationFn: () => logsApi.addMaterial(logId, { material_id: materialId, quantity_used: parseFloat(qty) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['log-materials', logId] })
      qc.invalidateQueries({ queryKey: ['inventory-project', projectId] })
      toast.success('Material recorded and deducted from project inventory')
      setAdding(false)
      setMaterialId('')
      setQty('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Failed to add material')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (matId: string) => logsApi.removeMaterial(logId, matId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['log-materials', logId] })
      qc.invalidateQueries({ queryKey: ['inventory-project', projectId] })
      toast.success('Material removed and inventory restored')
    },
  })

  const items = data ?? []
  const allMaterials = matData ?? []

  // Auto-expand when data loads and materials exist
  useEffect(() => {
    if (items.length > 0 && !open) setOpen(true)
  }, [items.length])
  const selectedMat = allMaterials.find(m => m.id === materialId)
  const availableQty = materialId ? (projStockMap.get(materialId) ?? 0) : undefined

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-500 transition-colors"
      >
        <Package size={11} />
        <span>{open ? 'Hide materials' : 'Materials used'}</span>
        {items.length > 0 && !open && (
          <span className="ml-1 bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {isLoading && <p className="text-xs text-slate-400">Loading...</p>}

          {!isLoading && items.length === 0 && !adding && (
            <p className="text-xs text-slate-400 italic">No materials recorded</p>
          )}

          {items.length > 0 && (
            <div className="space-y-1">
              {items.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50">
                  <Package size={11} className="text-orange-400 shrink-0" />
                  <span className="flex-1 text-xs text-slate-700">{m.material_name}</span>
                  <span className="text-xs text-slate-500">{m.quantity_used} {m.material_unit}</span>
                  {canEdit && (
                    <button
                      onClick={() => { if (confirm('Remove and restore to inventory?')) removeMutation.mutate(m.material_id) }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {adding && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <select
                  value={materialId}
                  onChange={e => { setMaterialId(e.target.value); setQty('') }}
                  className="flex-1 text-xs py-1.5 px-2 rounded-lg border border-slate-200 outline-none focus:border-orange-400"
                >
                  <option value="">Select material...</option>
                  {allMaterials.map(m => {
                    const avail = projStockMap.get(m.id)
                    const label = avail !== undefined
                      ? `${m.name} (${m.unit}) — ${avail} in stock`
                      : `${m.name} (${m.unit})`
                    return <option key={m.id} value={m.id}>{label}</option>
                  })}
                </select>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="Qty"
                  disabled={!materialId}
                  className="w-20 text-xs py-1.5 px-2 rounded-lg border border-slate-200 outline-none focus:border-orange-400 disabled:opacity-50"
                />
                <button
                  onClick={() => { if (materialId && qty) addMutation.mutate() }}
                  disabled={!materialId || !qty || addMutation.isPending}
                  className="text-xs bg-orange-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setAdding(false); setMaterialId(''); setQty('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-1.5"
                >
                  Cancel
                </button>
              </div>
              {/* Stock hint */}
              {selectedMat && availableQty !== undefined && (
                <p className={`text-xs ${availableQty > 0 ? 'text-slate-400' : 'text-amber-500'}`}>
                  {availableQty > 0
                    ? `${availableQty} ${selectedMat.unit} available in project inventory`
                    : `No project stock for ${selectedMat.name} — transfer or raise a requisition first`}
                </p>
              )}
            </div>
          )}

          {canEdit && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500 transition-colors"
            >
              <Plus size={11} /> Add material
            </button>
          )}
        </div>
      )}
    </div>
  )
}
