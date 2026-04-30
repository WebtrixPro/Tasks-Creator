// ============================================
// ENUMS AND CONSTANTS
// ============================================

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled'
} as const

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const

export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  LOCAL_ONLY: 'local_only'
} as const

export const MEMBER_ROLE = {
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
} as const

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS]
export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY]
export type SyncStatusType = typeof SYNC_STATUS[keyof typeof SYNC_STATUS]
export type MemberRole = typeof MEMBER_ROLE[keyof typeof MEMBER_ROLE]

// ============================================
// BASE ENTITY INTERFACES
// ============================================

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// ============================================
// TEAM MEMBER
// ============================================

export interface TeamMember extends Omit<BaseEntity, 'updatedAt'> {
  name: string
  email: string | null
  avatarUrl: string | null
  basecampPersonId: string | null
  role: MemberRole
  updatedAt: Date
}

export interface TeamMemberCreate {
  name: string
  email?: string | null
  avatarUrl?: string | null
  basecampPersonId?: string | null
  role?: MemberRole
}

export interface TeamMemberUpdate {
  name?: string
  email?: string | null
  avatarUrl?: string | null
  role?: MemberRole
}

// ============================================
// PROJECT
// ============================================

export interface Project extends BaseEntity {
  name: string
  description: string | null
  color: string | null
  basecampProjectId: string | null
  isArchived: boolean
}

export interface ProjectWithRelations extends Project {
  tasks?: TaskSummary[]
  members?: ProjectMemberWithMember[]
  columns?: Column[]
  _count?: {
    tasks: number
    members: number
    columns: number
  }
}

export interface ProjectCreate {
  name: string
  description?: string | null
  color?: string | null
  basecampProjectId?: string | null
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
  color?: string | null
  isArchived?: boolean
}

// ============================================
// PROJECT MEMBER (join table)
// ============================================

export interface ProjectMember {
  id: string
  projectId: string
  memberId: string
  role: MemberRole
  joinedAt: Date
}

export interface ProjectMemberWithMember extends ProjectMember {
  member: TeamMember
}

// ============================================
// COLUMN
// ============================================

export interface Column {
  id: string
  name: string
  projectId: string
  position: number
  color: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ColumnCreate {
  name: string
  projectId: string
  position?: number
  color?: string | null
}

export interface ColumnUpdate {
  name?: string
  position?: number
  color?: string | null
}

// ============================================
// TASK
// ============================================

export interface Task extends BaseEntity {
  ticketNumber: number
  title: string
  userStory: string
  description: string
  acceptanceCriteria: string
  estimate: string
  priority: TaskPriority
  status: TaskStatus
  position: number
  startDate: Date | null
  endDate: Date | null
  dueDate: Date | null
  importBatchId: string | null
  projectId: string | null
  columnId: string | null
  assigneeId: string | null
  creatorId: string | null
  basecampCardId: string | null
  basecampColumnListId: string | null
  syncStatus: SyncStatusType
  lastSyncedAt: Date | null
  lastSyncError: string | null
}

export interface TaskWithRelations extends Task {
  project?: Project | null
  column?: Column | null
  assignee?: TeamMember | null
  creator?: TeamMember | null
  comments?: TaskComment[]
  _count?: {
    comments: number
  }
}

export interface TaskSummary {
  id: string
  ticketNumber: number
  title: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: Date | null
  assigneeId: string | null
  assignee?: Pick<TeamMember, 'id' | 'name' | 'avatarUrl'> | null
}

export interface TaskCreate {
  title: string
  ticketNumber?: number
  userStory?: string
  description?: string
  acceptanceCriteria?: string
  estimate?: string
  priority?: TaskPriority
  status?: TaskStatus
  position?: number
  startDate?: Date | null
  endDate?: Date | null
  dueDate?: Date | null
  projectId?: string | null
  columnId?: string | null
  assigneeId?: string | null
  creatorId?: string | null
}

export interface TaskUpdate {
  title?: string
  userStory?: string
  description?: string
  acceptanceCriteria?: string
  estimate?: string
  priority?: TaskPriority
  status?: TaskStatus
  position?: number
  startDate?: Date | null
  endDate?: Date | null
  dueDate?: Date | null
  projectId?: string | null
  columnId?: string | null
  assigneeId?: string | null
}

// ============================================
// TASK COMMENT
// ============================================

export interface TaskComment {
  id: string
  content: string
  taskId: string
  authorId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TaskCommentWithAuthor extends TaskComment {
  author: Pick<TeamMember, 'id' | 'name' | 'avatarUrl'> | null
}

export interface TaskCommentCreate {
  content: string
  taskId: string
  authorId?: string | null
}

// ============================================
// ACTIVITY
// ============================================

export interface Activity {
  id: string
  action: string
  entityType: string
  entityId: string
  projectId: string | null
  actorId: string | null
  metadata: ActivityMetadata | null
  createdAt: Date
}

export interface ActivityWithActor extends Activity {
  actor: Pick<TeamMember, 'id' | 'name' | 'avatarUrl'> | null
}

export interface ActivityMetadata {
  changes?: Record<string, { old: unknown; new: unknown }>
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  context?: string
  relatedEntityId?: string
  relatedEntityType?: string
  syncSource?: 'local' | 'basecamp'
  error?: string
}

// ============================================
// API QUERY PARAMETERS
// ============================================

export interface TaskQueryParams {
  // Filtering
  projectId?: string
  columnId?: string
  assigneeId?: string
  status?: TaskStatus | TaskStatus[]
  priority?: TaskPriority | TaskPriority[]
  dueDateFrom?: string
  dueDateTo?: string
  search?: string
  includeDeleted?: boolean
  
  // Pagination
  page?: number
  limit?: number
  cursor?: string
  
  // Sorting
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'position' | 'ticketNumber'
  sortOrder?: 'asc' | 'desc'
  
  // Include relations
  include?: ('project' | 'assignee' | 'column' | 'comments' | 'creator')[]
}

export interface ProjectQueryParams {
  search?: string
  includeArchived?: boolean
  includeDeleted?: boolean
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'name'
  sortOrder?: 'asc' | 'desc'
  include?: ('tasks' | 'members' | 'columns' | '_count')[]
}

export interface MemberQueryParams {
  search?: string
  role?: MemberRole
  includeDeleted?: boolean
  page?: number
  limit?: number
}

export interface ActivityQueryParams {
  entityType?: string
  entityId?: string
  projectId?: string
  actorId?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  cursor?: string
}

// ============================================
// API RESPONSES
// ============================================

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
    nextCursor?: string
  }
}

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  results: {
    id: string
    success: boolean
    error?: string
  }[]
}

export interface ApiError {
  error: string
  code?: string
  details?: Record<string, string[]>
}

// ============================================
// BULK OPERATIONS
// ============================================

export interface BulkTaskUpdate {
  ids: string[]
  data: TaskUpdate
}

export interface BulkTaskDelete {
  ids: string[]
  permanent?: boolean
}

export interface BulkTaskRestore {
  ids: string[]
}

export interface BulkTaskMove {
  ids: string[]
  projectId?: string | null
  columnId?: string | null
}

export interface BulkTaskAssign {
  ids: string[]
  assigneeId: string | null
}

// ============================================
// TRASH
// ============================================

export type TrashEntityType = 'task' | 'project' | 'column' | 'member' | 'comment'

export interface TrashItem {
  id: string
  entityType: TrashEntityType
  name: string
  deletedAt: Date
  projectId?: string | null
  projectName?: string | null
}
