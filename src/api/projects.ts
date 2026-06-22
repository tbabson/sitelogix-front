import client from './client'
import type { Project, ProjectStats, ProjectMember, Milestone, ApiResponse, PaginatedResponse } from '@/types'

export const projectsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Project>>('/projects', { params }),

  get: (id: string) =>
    client.get<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: Partial<Project>) =>
    client.post<ApiResponse<Project>>('/projects', data),

  update: (id: string, data: Partial<Project>) =>
    client.put<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) =>
    client.delete(`/projects/${id}`),

  archive: (id: string) =>
    client.post(`/projects/${id}/archive`),

  restore: (id: string) =>
    client.post(`/projects/${id}/restore`),

  duplicate: (id: string, name: string) =>
    client.post<ApiResponse<Project>>(`/projects/${id}/duplicate`, { name }),

  stats: (id: string) =>
    client.get<ApiResponse<ProjectStats>>(`/projects/${id}/stats`),

  activity: (id: string) =>
    client.get<ApiResponse<unknown[]>>(`/projects/${id}/activity`),

  members: {
    list: (projectId: string) =>
      client.get<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`),

    add: (projectId: string, data: { user_id: string; role: string }) =>
      client.post<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, data),

    remove: (projectId: string, userId: string) =>
      client.delete(`/projects/${projectId}/members/${userId}`),

    changeRole: (projectId: string, userId: string, role: string) =>
      client.patch(`/projects/${projectId}/members/${userId}/role`, { role }),
  },

  milestones: {
    list: (projectId: string) =>
      client.get<ApiResponse<Milestone[]>>(`/projects/${projectId}/milestones`),

    create: (projectId: string, data: Partial<Milestone>) =>
      client.post<ApiResponse<Milestone>>(`/projects/${projectId}/milestones`, data),

    update: (projectId: string, milestoneId: string, data: Partial<Milestone>) =>
      client.put<ApiResponse<Milestone>>(`/projects/${projectId}/milestones/${milestoneId}`, data),

    delete: (projectId: string, milestoneId: string) =>
      client.delete(`/projects/${projectId}/milestones/${milestoneId}`),
  },
}
