import client from './client'
import type { Requisition, ApiResponse } from '@/types'

export const requisitionsApi = {
  list: (params?: { project_id?: string; status?: string }) =>
    client.get<ApiResponse<Requisition[]>>('/requisitions', { params }),

  get: (id: string) =>
    client.get<ApiResponse<Requisition>>(`/requisitions/${id}`),

  create: (data: {
    project_id: string
    notes?: string
    items: { material_id: string; quantity_requested: number }[]
  }) =>
    client.post<ApiResponse<Requisition>>('/requisitions', data),

  approve: (id: string, data: {
    notes?: string
    items: { item_id: string; quantity_approved: number }[]
  }) =>
    client.post<ApiResponse<null>>(`/requisitions/${id}/approve`, data),

  reject: (id: string, notes?: string) =>
    client.post<ApiResponse<null>>(`/requisitions/${id}/reject`, { notes }),

  fulfill: (id: string) =>
    client.post<ApiResponse<null>>(`/requisitions/${id}/fulfill`),

  cancel: (id: string) =>
    client.delete(`/requisitions/${id}`),
}
