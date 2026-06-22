import client from './client'
import type { User, TokenPair, LoginRequest, RegisterRequest, ApiResponse } from '@/types'

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<ApiResponse<{ user: User } & TokenPair>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<ApiResponse<{ user: User } & TokenPair>>('/auth/register', data),

  refresh: (refresh_token: string) =>
    client.post<ApiResponse<TokenPair>>('/auth/refresh', { refresh_token }),

  logout: (refresh_token: string) =>
    client.post('/auth/logout', { refresh_token }),
}
