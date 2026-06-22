import client from './client'
import type { InventoryItem, InventoryTransaction, ApiResponse } from '@/types'

export const inventoryApi = {
  getHeadOffice: () =>
    client.get<ApiResponse<InventoryItem[]>>('/inventory/head-office'),

  getProject: (projectId: string) =>
    client.get<ApiResponse<InventoryItem[]>>(`/inventory/projects/${projectId}`),

  addStock: (data: { material_id: string; quantity: number; unit_cost?: number; notes?: string }) =>
    client.post<ApiResponse<null>>('/inventory/head-office/stock', data),

  transfer: (data: { material_id: string; project_id: string; quantity: number; notes?: string }) =>
    client.post<ApiResponse<null>>('/inventory/transfer', data),

  getTransactions: (params?: { material_id?: string; project_id?: string; limit?: number }) =>
    client.get<ApiResponse<InventoryTransaction[]>>('/inventory/transactions', { params }),

  getPendingTransfers: (projectId: string) =>
    client.get<ApiResponse<InventoryTransaction[]>>(`/inventory/projects/${projectId}/pending-transfers`),

  confirmReceipt: (transactionId: string) =>
    client.patch(`/inventory/transactions/${transactionId}/receive`),
}
