export type UserRole = 'admin' | 'supervisor' | 'client' | 'worker'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  description?: string
  location?: string
  start_date?: string
  end_date?: string
  status: ProjectStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectStats {
  total_logs: number
  submitted_logs: number
  approved_logs: number
  open_issues: number
  resolved_issues: number
  total_workers: number
  workers_on_site: number
  total_members: number
  total_media: number
  completion_pct: number
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  created_at: string
  user?: User
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'done' | 'missed'

export interface Milestone {
  id: string
  project_id: string
  title: string
  due_date: string
  status: MilestoneStatus
  notes?: string
  created_at: string
  updated_at: string
}

export type LogStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface DailyLog {
  id: string
  project_id: string
  created_by: string
  date: string
  weather?: string
  notes?: string
  gps_lat?: number
  gps_lng?: number
  signature_url?: string
  status: LogStatus
  created_at: string
  updated_at: string
  project_name: string
  creator_name: string
}

export interface Worker {
  id: string
  name: string
  project_id: string
  phone?: string
  trade?: string
  user_id?: string
  created_at: string
}

export interface Attendance {
  id: string
  project_id: string
  worker_id: string
  check_in: string
  check_out?: string
  notes?: string
  created_by: string
  created_at: string
  worker?: Worker
}

export type IssuePriority = 'low' | 'medium' | 'high'
export type IssueStatus = 'open' | 'in_progress' | 'resolved'

export interface Issue {
  id: string
  project_id: string
  title: string
  description?: string
  priority: IssuePriority
  status: IssueStatus
  assigned_to?: string
  reported_by: string
  gps_lat?: number
  gps_lng?: number
  created_at: string
  updated_at: string
  project?: Project
  assignee?: User
  reporter?: User
}

export interface Media {
  id: string
  project_id: string
  uploaded_by: string
  filename: string
  content_type: string
  url: string
  size: number
  log_id?: string
  created_at: string
  project?: Project
  uploader?: User
}

export type NotificationType =
  | 'log_submitted'
  | 'log_approved'
  | 'log_rejected'
  | 'issue_assigned'
  | 'issue_updated'
  | 'approval_needed'

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  reference_id?: string
  reference_type?: string
  is_read: boolean
  created_at: string
}

export interface DashboardStats {
  active_projects: number
  workers_on_site: number
  open_issues: number
  logs_today: number
  pending_approvals: number
  total_members: number
}

export interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  created_at: string
  user?: User
}

export interface LogSummary {
  id: string
  project_name: string
  date: string
  status: string
  created_by_name: string
  created_at: string
}

export interface IssueSummary {
  id: string
  project_name: string
  title: string
  priority: string
  status: string
}

export interface DashboardData {
  stats: DashboardStats
  recent_activity: {
    recent_logs: LogSummary[]
    recent_issues: IssueSummary[]
  }
}

export interface Material {
  id: string
  name: string
  unit: string
  description?: string
  created_at: string
  updated_at: string
}

export type InventoryLocationType = 'head_office' | 'project'

export interface InventoryItem {
  id: string
  material_id: string
  location_type: InventoryLocationType
  project_id?: string
  quantity: number
  unit_cost?: number
  created_at: string
  updated_at: string
  material_name: string
  material_unit: string
}

export interface InventoryTransaction {
  id: string
  material_id: string
  location_type: InventoryLocationType
  project_id?: string
  quantity_change: number
  transaction_type: string
  reference_id?: string
  reference_type?: string
  notes?: string
  created_by: string
  created_at: string
  received: boolean
  received_by?: string
  received_at?: string
  material_name: string
  material_unit: string
  project_name?: string
  creator_name?: string
}

export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled'

export interface RequisitionItem {
  id: string
  requisition_id: string
  material_id: string
  quantity_requested: number
  quantity_approved?: number
  created_at: string
  material_name: string
  material_unit: string
}

export interface Requisition {
  id: string
  project_id: string
  requested_by: string
  status: RequisitionStatus
  notes?: string
  created_at: string
  updated_at: string
  project_name: string
  requester_name: string
  items?: RequisitionItem[]
}

export interface LogMaterial {
  id: string
  log_id: string
  material_id: string
  quantity_used: number
  created_at: string
  material_name: string
  material_unit: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  pages: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: PaginationMeta
}

export interface TokenPair {
  access_token: string
  refresh_token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: UserRole
}
