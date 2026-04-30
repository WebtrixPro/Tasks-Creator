import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

const MAX_BULK_ITEMS = 100;

// POST /api/v2/tasks/bulk - Bulk operations on tasks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskIds, actorId } = body;
    
    // Validation
    const validActions = [
      "delete",
      "restore",
      "updateStatus",
      "updatePriority",
      "assign",
      "unassign",
      "moveToProject",
      "moveToColumn",
    ];
    
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds must be a non-empty array" },
        { status: 400 }
      );
    }
    
    if (taskIds.length > MAX_BULK_ITEMS) {
      return NextResponse.json(
        { error: `Cannot process more than ${MAX_BULK_ITEMS} items at once` },
        { status: 400 }
      );
    }
    
    let result;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    switch (action) {
      case "delete": {
        result = await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "deleted",
              entityType: "task",
              entityId: id,
              actorId,
              metadata: { bulkOperation: true },
            })
          )
        );
        break;
      }
      
      case "restore": {
        result = await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            deletedAt: { not: null },
          },
          data: { deletedAt: null },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "restored",
              entityType: "task",
              entityId: id,
              actorId,
              metadata: { bulkOperation: true },
            })
          )
        );
        break;
      }
      
      case "updateStatus": {
        const { status } = body;
        if (!status) {
          return NextResponse.json(
            { error: "status is required for updateStatus action" },
            { status: 400 }
          );
        }
        
        result = await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            deletedAt: null,
          },
          data: { status },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "status_changed",
              entityType: "task",
              entityId: id,
              actorId,
              metadata: { bulkOperation: true, to: status },
            })
          )
        );
        break;
      }
      
      case "updatePriority": {
        const { priority } = body;
        if (!priority) {
          return NextResponse.json(
            { error: "priority is required for updatePriority action" },
            { status: 400 }
          );
        }
        
        result = await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            deletedAt: null,
          },
          data: { priority },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "updated",
              entityType: "task",
              entityId: id,
              actorId,
              metadata: { bulkOperation: true, changes: { priority: { to: priority } } },
            })
          )
        );
        break;
      }
      
      case "assign": {
        const { assigneeId } = body;
        if (!assigneeId) {
          return NextResponse.json(
            { error: "assigneeId is required for assign action" },
            { status: 400 }
          );
        }
        
        // Verify assignee exists
        const assignee = await prisma.teamMember.findUnique({
          where: { id: assigneeId },
        });
        if (!assignee || assignee.deletedAt) {
          return NextResponse.json(
            { error: "Assignee not found or deleted" },
            { status: 400 }
          );
        }
        
        result = await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            deletedAt: null,
          },
          data: { assigneeId },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "assigned",
              entityType: "task",
              entityId: id,
              actorId,
              metadata: { bulkOperation: true, assigneeName: assignee.name },
            })
          )
        );
        break;
      }
      
      case "unassign": {
        result = await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            deletedAt: null,
          },
          data: { assigneeId: null },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "unassigned",
              entityType: "task",
              entityId: id,
              actorId,
              metadata: { bulkOperation: true },
            })
          )
        );
        break;
      }
      
      case "moveToProject": {
        const { projectId } = body;
        
        if (projectId) {
          const project = await prisma.project.findUnique({
            where: { id: projectId },
          });
          if (!project || project.deletedAt) {
            return NextResponse.json(
              { error: "Project not found or deleted" },
              { status: 400 }
            );
          }
        }
        
        result = await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            deletedAt: null,
          },
          data: {
            projectId: projectId || null,
            columnId: null, // Clear column when moving to different project
          },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "moved",
              entityType: "task",
              entityId: id,
              projectId: projectId || undefined,
              actorId,
              metadata: { bulkOperation: true },
            })
          )
        );
        break;
      }
      
      case "moveToColumn": {
        const { columnId, projectId } = body;
        
        if (!columnId) {
          return NextResponse.json(
            { error: "columnId is required for moveToColumn action" },
            { status: 400 }
          );
        }
        
        const column = await prisma.column.findUnique({
          where: { id: columnId },
        });
        if (!column || column.deletedAt) {
          return NextResponse.json(
            { error: "Column not found or deleted" },
            { status: 400 }
          );
        }
        
        // If projectId is provided, ensure tasks belong to that project
        const updateWhere: Record<string, unknown> = {
          id: { in: taskIds },
          deletedAt: null,
        };
        
        if (projectId) {
          updateWhere.projectId = projectId;
        }
        
        result = await prisma.task.updateMany({
          where: updateWhere,
          data: {
            columnId,
            projectId: column.projectId, // Ensure task is in column's project
          },
        });
        
        results.success = result.count;
        results.failed = taskIds.length - result.count;
        
        await Promise.all(
          taskIds.map((id) =>
            logActivity({
              action: "column_changed",
              entityType: "task",
              entityId: id,
              projectId: column.projectId,
              actorId,
              metadata: { bulkOperation: true, columnName: column.name },
            })
          )
        );
        break;
      }
    }
    
    return NextResponse.json({
      message: `Bulk ${action} completed`,
      results,
    });
  } catch (error) {
    console.error("Error in bulk task operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}
