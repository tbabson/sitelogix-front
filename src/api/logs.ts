import client from './client'
import type { DailyLog, LogMaterial, ApiResponse, PaginatedResponse } from '@/types'

export const logsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<DailyLog>>('/logs', { params }),

  get: (id: string) =>
    client.get<ApiResponse<DailyLog>>(`/logs/${id}`),

  create: (data: Partial<DailyLog> & { materials?: { material_id: string; quantity_used: number }[] }) =>
    client.post<ApiResponse<DailyLog>>('/logs', data),

  update: (id: string, data: Partial<DailyLog>) =>
    client.put<ApiResponse<DailyLog>>(`/logs/${id}`, data),

  delete: (id: string) =>
    client.delete(`/logs/${id}`),

  submit: (id: string) =>
    client.post(`/logs/${id}/submit`),

  approve: (id: string) =>
    client.post(`/logs/${id}/approve`),

  reject: (id: string, reason?: string) =>
    client.post(`/logs/${id}/reject`, { reason }),

  listMaterials: (logId: string) =>
    client.get<ApiResponse<LogMaterial[]>>(`/logs/${logId}/materials`),

  addMaterial: (logId: string, data: { material_id: string; quantity_used: number }) =>
    client.post<ApiResponse<LogMaterial>>(`/logs/${logId}/materials`, data),

  removeMaterial: (logId: string, materialId: string) =>
    client.delete(`/logs/${logId}/materials/${materialId}`),

  getWeather: (lat: number, lng: number) =>
    client.get<ApiResponse<{ weather: string }>>('/logs/weather', { params: { lat, lng } }),
}
