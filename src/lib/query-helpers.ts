import { Prisma } from '@prisma/client'
import type { TaskQueryParams, ProjectQueryParams, MemberQueryParams } from '@/types/task'

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationOptions {
  page?: number
  limit?: number
  maxLimit?: number
}

export function getPaginationParams(options: PaginationOptions) {
  const page = Math.max(1, options.page ?? 1)
  const maxLimit = options.maxLimit ?? 100
  const limit = Math.min(Math.max(1, options.limit ?? 50), maxLimit)
  const skip = (page - 1) * limit
  
  return { page, limit, skip }
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  nextCursor?: string
) {
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      ...(nextCursor && { nextCursor })
    }
  }
}

// ============================================
// TASK QUERY BUILDER
// ============================================

export function buildTaskWhereClause(params: TaskQueryParams): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {}
  
  // Soft delete filter (exclude deleted by default)
  if (!params.includeDeleted) {
    where.deletedAt = null
  }
  
  // Direct filters
  if (params.projectId) {
    where.projectId = params.projectId
  }
  
  if (params.columnId) {
    where.columnId = params.columnId
  }
  
  if (params.assigneeId) {
    where.assigneeId = params.assigneeId
  }
  
  // Status filter (single or multiple)
  if (params.status) {
    if (Array.isArray(params.status)) {
      where.status = { in: params.status }
    } else {
      where.status = params.status
    }
  }
  
  // Priority filter (single or multiple)
  if (params.priority) {
    if (Array.isArray(params.priority)) {
      where.priority = { in: params.priority }
    } else {
      where.priority = params.priority
    }
  }
  
  // Date range filters
  if (params.dueDateFrom || params.dueDateTo) {
    where.dueDate = {}
    if (params.dueDateFrom) {
      where.dueDate.gte = new Date(params.dueDateFrom)
    }
    if (params.dueDateTo) {
      where.dueDate.lte = new Date(params.dueDateTo)
    }
  }
  
  // Full-text search on title and description
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { userStory: { contains: params.search, mode: 'insensitive' } }
    ]
  }
  
  return where
}

export function buildTaskOrderBy(
  sortBy?: TaskQueryParams['sortBy'],
  sortOrder?: TaskQueryParams['sortOrder']
): Prisma.TaskOrderByWithRelationInput {
  const order = sortOrder ?? 'desc'
  
  switch (sortBy) {
    case 'dueDate':
      return { dueDate: { sort: order, nulls: 'last' } }
    case 'priority':
      return { priority: order }
    case 'position':
      return { position: order }
    case 'ticketNumber':
      return { ticketNumber: order }
    case 'updatedAt':
      return { updatedAt: order }
    case 'createdAt':
    default:
      return { createdAt: order }
  }
}

export function buildTaskInclude(include?: TaskQueryParams['include']): Prisma.TaskInclude {
  const taskInclude: Prisma.TaskInclude = {}
  
  if (!include || include.length === 0) {
    return taskInclude
  }
  
  if (include.includes('project')) {
    taskInclude.project = {
      select: {
        id: true,
        name: true,
        color: true
      }
    }
  }
  
  if (include.includes('column')) {
    taskInclude.column = {
      select: {
        id: true,
        name: true,
        color: true,
        position: true
      }
    }
  }
  
  if (include.includes('assignee')) {
    taskInclude.assignee = {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      }
    }
  }
  
  if (include.includes('creator')) {
    taskInclude.creator = {
      select: {
        id: true,
        name: true,
        avatarUrl: true
      }
    }
  }
  
  if (include.includes('comments')) {
    taskInclude.comments = {
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    }
  }
  
  return taskInclude
}

// ============================================
// PROJECT QUERY BUILDER
// ============================================

export function buildProjectWhereClause(params: ProjectQueryParams): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {}
  
  // Soft delete filter
  if (!params.includeDeleted) {
    where.deletedAt = null
  }
  
  // Archive filter
  if (!params.includeArchived) {
    where.isArchived = false
  }
  
  // Search
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } }
    ]
  }
  
  return where
}

export function buildProjectInclude(include?: ProjectQueryParams['include']): Prisma.ProjectInclude {
  const projectInclude: Prisma.ProjectInclude = {}
  
  if (!include || include.length === 0) {
    return projectInclude
  }
  
  if (include.includes('tasks')) {
    projectInclude.tasks = {
      where: { deletedAt: null },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { position: 'asc' },
      take: 100
    }
  }
  
  if (include.includes('members')) {
    projectInclude.members = {
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true
          }
        }
      }
    }
  }
  
  if (include.includes('columns')) {
    projectInclude.columns = {
      where: { deletedAt: null },
      orderBy: { position: 'asc' }
    }
  }
  
  if (include.includes('_count')) {
    projectInclude._count = {
      select: {
        tasks: { where: { deletedAt: null } },
        members: true,
        columns: { where: { deletedAt: null } }
      }
    }
  }
  
  return projectInclude
}

// ============================================
// MEMBER QUERY BUILDER
// ============================================

export function buildMemberWhereClause(params: MemberQueryParams): Prisma.TeamMemberWhereInput {
  const where: Prisma.TeamMemberWhereInput = {}
  
  // Soft delete filter
  if (!params.includeDeleted) {
    where.deletedAt = null
  }
  
  // Role filter
  if (params.role) {
    where.role = params.role
  }
  
  // Search
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } }
    ]
  }
  
  return where
}

// ============================================
// SOFT DELETE HELPERS
// ============================================

export function softDeleteData() {
  return {
    deletedAt: new Date()
  }
}

export function restoreData() {
  return {
    deletedAt: null
  }
}

// ============================================
// TICKET NUMBER GENERATOR
// ============================================

export async function getNextTicketNumber(
  prisma: Prisma.TransactionClient | typeof import('@prisma/client').PrismaClient,
  importBatchId?: string | null
): Promise<number> {
  // If part of an import batch, get next number within batch
  if (importBatchId) {
    const maxTicket = await (prisma as typeof import('@prisma/client').PrismaClient).task.findFirst({
      where: { importBatchId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true }
    })
    return (maxTicket?.ticketNumber ?? 0) + 1
  }
  
  // Otherwise, get global next number
  const maxTicket = await (prisma as typeof import('@prisma/client').PrismaClient).task.findFirst({
    orderBy: { ticketNumber: 'desc' },
    select: { ticketNumber: true }
  })
  return (maxTicket?.ticketNumber ?? 0) + 1
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function parseArrayParam(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return value
  return value.split(',').map(v => v.trim()).filter(Boolean)
}

export function parseBooleanParam(value: string | undefined): boolean {
  return value === 'true' || value === '1'
}

export function parseIncludeParam(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  return value.split(',').map(v => v.trim()).filter(Boolean)
}
