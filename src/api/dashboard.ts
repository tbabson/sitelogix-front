import client from './client'
import type { DashboardData, ApiResponse } from '@/types'

export const dashboardApi = {
  get: () => client.get<ApiResponse<DashboardData>>('/dashboard'),
}
