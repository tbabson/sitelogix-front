import client from './client'
import type { User, ApiResponse, PaginatedResponse } from '@/types'

export const usersApi = {
  me: () =>
    client.get<ApiResponse<User>>('/users/me'),

  updateMe: (data: { name?: string; avatar_url?: string }) =>
    client.put<ApiResponse<User>>('/users/me', data),

  list: () =>
    client.get<PaginatedResponse<User>>('/users'),

  deactivate: (id: string) =>
    client.delete(`/users/${id}`),
}
