import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity, logFieldChanges } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

// GET /api/v2/tasks/[taskId] - Get a single task with full details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeComments = searchParams.get("includeComments") === "true";
    const includeActivity = searchParams.get("includeActivity") === "true";
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            isArchived: true,
          },
        },
        column: {
          select: {
            id: true,
            name: true,
            color: true,
            position: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        importBatch: {
          select: {
            id: true,
            fileName: true,
            createdAt: true,
          },
        },
        comments: includeComments
          ? {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            }
          : false,
        _count: {
          select: {
            comments: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }
    
    // Include activity if requested
    let activity = null;
    if (includeActivity) {
      activity = await prisma.activity.findMany({
        where: {
          entityType: "task",
          entityId: taskId,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
    }
    
    return NextResponse.json({
      data: task,
      activity,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH /api/v2/tasks/[taskId] - Update a task
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId } = await context.params;
    const body = await request.json();
    const {
      title,
      userStory,
      description,
      acceptanceCriteria,
      estimate,
      priority,
      status,
      position,
      startDate,
      endDate,
      dueDate,
      projectId,
      columnId,
      assigneeId,
      actorId,
    } = body;
    
    // Get existing task
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { name: true } },
        project: { select: { name: true } },
        column: { select: { name: true } },
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }
    
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Cannot update a deleted task. Restore it first." },
        { status: 400 }
      );
    }
    
    // Validate new values
    if (projectId !== undefined && projectId !== null) {
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
    
    if (columnId !== undefined && columnId !== null) {
      const targetProjectId = projectId !== undefined ? projectId : existing.projectId;
      if (targetProjectId) {
        const column = await prisma.column.findFirst({
          where: {
            id: columnId,
            projectId: targetProjectId,
            deletedAt: null,
          },
        });
        if (!column) {
          return NextResponse.json(
            { error: "Column not found in the specified project" },
            { status: 400 }
          );
        }
      }
    }
    
    if (assigneeId !== undefined && assigneeId !== null) {
      const assignee = await prisma.teamMember.findUnique({
        where: { id: assigneeId },
      });
      if (!assignee || assignee.deletedAt) {
        return NextResponse.json(
          { error: "Assignee not found or deleted" },
          { status: 400 }
        );
      }
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (userStory !== undefined) updateData.userStory = userStory?.trim() || "";
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = acceptanceCriteria?.trim() || "";
    if (estimate !== undefined) updateData.estimate = estimate || "";
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (position !== undefined) updateData.position = position;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (columnId !== undefined) updateData.columnId = columnId || null;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    
    // Update task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
        column: {
          select: { id: true, name: true, color: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, name: true },
        },
        _count: {
          select: { comments: { where: { deletedAt: null } } },
        },
      },
    });
    
    // Log activity with field changes
    const trackedFields = [
      "title", "status", "priority", "assigneeId", "projectId",
      "columnId", "dueDate", "estimate"
    ];
    const changes = logFieldChanges(existing, task, trackedFields);
    
    // Add readable names for relation changes
    if (changes.assigneeId) {
      changes.assignee = {
        from: existing.assignee?.name || null,
        to: task.assignee?.name || null,
      };
      delete changes.assigneeId;
    }
    if (changes.projectId) {
      changes.project = {
        from: existing.project?.name || null,
        to: task.project?.name || null,
      };
      delete changes.projectId;
    }
    if (changes.columnId) {
      changes.column = {
        from: existing.column?.name || null,
        to: task.column?.name || null,
      };
      delete changes.columnId;
    }
    
    if (Object.keys(changes).length > 0) {
      await logActivity({
        action: "updated",
        entityType: "task",
        entityId: task.id,
        projectId: task.projectId || undefined,
        actorId,
        metadata: {
          ticketNumber: task.ticketNumber,
          title: task.title,
          changes,
        },
      });
    }
    
    // Special activity for status change
    if (status !== undefined && status !== existing.status) {
      await logActivity({
        action: "status_changed",
        entityType: "task",
        entityId: task.id,
        projectId: task.projectId || undefined,
        actorId,
        metadata: {
          ticketNumber: task.ticketNumber,
          title: task.title,
          from: existing.status,
          to: status,
        },
      });
    }
    
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/tasks/[taskId] - Soft delete a task
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";
    const actorId = searchParams.get("actorId");
    
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { name: true } },
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }
    
    if (permanent) {
      if (!existing.deletedAt) {
        return NextResponse.json(
          { error: "Task must be soft deleted before permanent deletion" },
          { status: 400 }
        );
      }
      
      await prisma.task.delete({
        where: { id: taskId },
      });
      
      await logActivity({
        action: "permanently_deleted",
        entityType: "task",
        entityId: taskId,
        projectId: existing.projectId || undefined,
        actorId: actorId || undefined,
        metadata: {
          ticketNumber: existing.ticketNumber,
          title: existing.title,
        },
      });
      
      return NextResponse.json({ message: "Task permanently deleted" });
    }
    
    // Soft delete
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Task is already deleted" },
        { status: 400 }
      );
    }
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
    
    await logActivity({
      action: "deleted",
      entityType: "task",
      entityId: task.id,
      projectId: task.projectId || undefined,
      actorId: actorId || undefined,
      metadata: {
        ticketNumber: existing.ticketNumber,
        title: existing.title,
        projectName: existing.project?.name,
      },
    });
    
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
