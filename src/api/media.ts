import client from './client'
import type { Media, ApiResponse, PaginatedResponse } from '@/types'

export const mediaApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Media>>('/media', { params }),

  get: (id: string) =>
    client.get<ApiResponse<Media>>(`/media/${id}`),

  upload: (file: File, projectId: string, logId?: string, issueId?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('project_id', projectId)
    if (logId) fd.append('log_id', logId)
    if (issueId) fd.append('issue_id', issueId)
    return client.post<ApiResponse<Media>>('/media/upload', fd)
  },

  delete: (id: string) =>
    client.delete(`/media/${id}`),
}
