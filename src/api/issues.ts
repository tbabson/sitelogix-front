import client from './client'
import type { Issue, ApiResponse, PaginatedResponse } from '@/types'

export const issuesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Issue>>('/issues', { params }),

  get: (id: string) =>
    client.get<ApiResponse<Issue>>(`/issues/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post<ApiResponse<Issue>>('/issues', data),

  update: (id: string, data: Partial<Issue>) =>
    client.put<ApiResponse<Issue>>(`/issues/${id}`, data),

  delete: (id: string) =>
    client.delete(`/issues/${id}`),
}
