import client from './client'
import type { Attendance, Worker, ApiResponse, PaginatedResponse } from '@/types'

export const attendanceApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Attendance>>('/attendance', { params }),

  checkIn: (data: { project_id: string; worker_id: string; notes?: string }) =>
    client.post<ApiResponse<Attendance>>('/attendance/checkin', data),

  checkOut: (id: string, notes?: string) =>
    client.put<ApiResponse<Attendance>>(`/attendance/${id}/checkout`, { notes }),

  myAttendance: () =>
    client.get<PaginatedResponse<Attendance>>('/attendance/me'),

  selfCheckIn: (data: { project_id: string; notes?: string }) =>
    client.post<ApiResponse<Attendance>>('/attendance/me/checkin', data),

  selfCheckOut: () =>
    client.put<ApiResponse<Attendance>>('/attendance/me/checkout'),

  workers: {
    list: (params?: Record<string, unknown>) =>
      client.get<PaginatedResponse<Worker>>('/workers', { params }),

    create: (data: Partial<Worker>) =>
      client.post<ApiResponse<Worker>>('/workers', data),

    linkUser: (workerId: string, userId: string) =>
      client.patch(`/workers/${workerId}/link-user`, { user_id: userId }),
  },
}
