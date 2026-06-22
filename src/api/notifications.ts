import client from './client'
import type { Notification, ApiResponse, PaginatedResponse } from '@/types'

export const notificationsApi = {
  list: () =>
    client.get<PaginatedResponse<Notification>>('/notifications'),

  unreadCount: () =>
    client.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    client.put(`/notifications/${id}/read`),

  markAllRead: () =>
    client.put('/notifications/read-all'),
}
