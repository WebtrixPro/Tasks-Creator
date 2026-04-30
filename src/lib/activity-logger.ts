import { prisma } from './db'

export type ActivityAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'restored'
  | 'commented'
  | 'assigned'
  | 'unassigned'
  | 'moved'
  | 'synced'
  | 'archived'
  | 'unarchived'

export type EntityType = 'task' | 'project' | 'column' | 'member' | 'comment'

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

export interface LogActivityParams {
  action: ActivityAction
  entityType: EntityType
  entityId: string
  projectId?: string | null
  actorId?: string | null
  metadata?: ActivityMetadata
}

/**
 * Log an activity to the audit trail
 */
export async function logActivity({
  action,
  entityType,
  entityId,
  projectId,
  actorId,
  metadata
}: LogActivityParams) {
  try {
    return await prisma.activity.create({
      data: {
        action,
        entityType,
        entityId,
        projectId: projectId ?? undefined,
        actorId: actorId ?? undefined,
        metadata: metadata as object ?? undefined
      }
    })
  } catch (error) {
    console.error('[ActivityLogger] Failed to log activity:', error)
    // Don't throw - activity logging should not break the main operation
    return null
  }
}

/**
 * Detect changes between old and new objects
 */
export function detectChanges<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: Partial<T>,
  fieldsToTrack?: (keyof T)[]
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  
  const fields = fieldsToTrack ?? Object.keys(newObj) as (keyof T)[]
  
  for (const field of fields) {
    const oldValue = oldObj[field]
    const newValue = newObj[field]
    
    // Skip if field not in newObj
    if (!(field in newObj)) continue
    
    // Compare values (handle dates, nulls, etc.)
    const oldNormalized = normalizeValue(oldValue)
    const newNormalized = normalizeValue(newValue)
    
    if (JSON.stringify(oldNormalized) !== JSON.stringify(newNormalized)) {
      changes[field as string] = {
        old: oldNormalized,
        new: newNormalized
      }
    }
  }
  
  return changes
}

/**
 * Normalize values for comparison
 */
function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.parse(JSON.stringify(value))
  return value
}

/**
 * Log activity with automatic change detection
 */
export async function logActivityWithChanges<T extends Record<string, unknown>>({
  action,
  entityType,
  entityId,
  projectId,
  actorId,
  oldEntity,
  newEntity,
  fieldsToTrack,
  additionalMetadata
}: {
  action: ActivityAction
  entityType: EntityType
  entityId: string
  projectId?: string | null
  actorId?: string | null
  oldEntity?: T
  newEntity?: Partial<T>
  fieldsToTrack?: (keyof T)[]
  additionalMetadata?: Partial<ActivityMetadata>
}) {
  const metadata: ActivityMetadata = { ...additionalMetadata }
  
  if (oldEntity && newEntity) {
    metadata.changes = detectChanges(oldEntity, newEntity, fieldsToTrack)
    
    // Extract old and new values separately for easier querying
    metadata.oldValues = {}
    metadata.newValues = {}
    
    for (const [field, change] of Object.entries(metadata.changes)) {
      metadata.oldValues[field] = change.old
      metadata.newValues[field] = change.new
    }
  }
  
  return logActivity({
    action,
    entityType,
    entityId,
    projectId,
    actorId,
    metadata
  })
}

/**
 * Batch log multiple activities
 */
export async function logActivitiesBatch(activities: LogActivityParams[]) {
  try {
    return await prisma.activity.createMany({
      data: activities.map(a => ({
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        projectId: a.projectId ?? undefined,
        actorId: a.actorId ?? undefined,
        metadata: a.metadata as object ?? undefined
      }))
    })
  } catch (error) {
    console.error('[ActivityLogger] Failed to batch log activities:', error)
    return null
  }
}

/**
 * Query activities for an entity
 */
export async function getEntityActivities({
  entityType,
  entityId,
  limit = 50,
  cursor
}: {
  entityType: EntityType
  entityId: string
  limit?: number
  cursor?: string
}) {
  return prisma.activity.findMany({
    where: {
      entityType,
      entityId
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      }
    }
  })
}

/**
 * Query activities for a project
 */
export async function getProjectActivities({
  projectId,
  limit = 50,
  cursor,
  entityType,
  action
}: {
  projectId: string
  limit?: number
  cursor?: string
  entityType?: EntityType
  action?: ActivityAction
}) {
  return prisma.activity.findMany({
    where: {
      projectId,
      ...(entityType && { entityType }),
      ...(action && { action })
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      }
    }
  })
}
