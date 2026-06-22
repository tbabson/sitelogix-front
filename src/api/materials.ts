import client from './client'
import type { Material, ApiResponse } from '@/types'

export const materialsApi = {
  list: () =>
    client.get<ApiResponse<Material[]>>('/materials'),

  get: (id: string) =>
    client.get<ApiResponse<Material>>(`/materials/${id}`),

  create: (data: { name: string; unit: string; description?: string }) =>
    client.post<ApiResponse<Material>>('/materials', data),

  update: (id: string, data: Partial<Material>) =>
    client.put<ApiResponse<Material>>(`/materials/${id}`, data),

  delete: (id: string) =>
    client.delete(`/materials/${id}`),
}
