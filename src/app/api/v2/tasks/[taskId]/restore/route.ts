import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

// POST /api/v2/tasks/[taskId]/restore - Restore a soft-deleted task
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { actorId } = body;
    
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }
    
    if (!existing.deletedAt) {
      return NextResponse.json(
        { error: "Task is not deleted" },
        { status: 400 }
      );
    }
    
    // Check if project is deleted
    if (existing.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: existing.projectId },
      });
      if (project?.deletedAt) {
        return NextResponse.json(
          { error: "Cannot restore task because its project is deleted. Restore the project first." },
          { status: 400 }
        );
      }
    }
    
    // Check if column is deleted
    if (existing.columnId) {
      const column = await prisma.column.findUnique({
        where: { id: existing.columnId },
      });
      if (column?.deletedAt) {
        // Clear column assignment when restoring
        await prisma.task.update({
          where: { id: taskId },
          data: { columnId: null },
        });
      }
    }
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: null },
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
    
    await logActivity({
      action: "restored",
      entityType: "task",
      entityId: task.id,
      projectId: task.projectId || undefined,
      actorId,
      metadata: {
        ticketNumber: task.ticketNumber,
        title: task.title,
      },
    });
    
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("Error restoring task:", error);
    return NextResponse.json(
      { error: "Failed to restore task" },
      { status: 500 }
    );
  }
}
