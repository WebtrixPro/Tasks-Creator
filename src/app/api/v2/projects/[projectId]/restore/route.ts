import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

// POST /api/v2/projects/[projectId]/restore - Restore a soft-deleted project
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const restoreTasks = searchParams.get("restoreTasks") !== "false";
    const restoreColumns = searchParams.get("restoreColumns") !== "false";
    
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    if (!existing.deletedAt) {
      return NextResponse.json(
        { error: "Project is not deleted" },
        { status: 400 }
      );
    }
    
    // Get counts before restore
    const taskCount = await prisma.task.count({
      where: { projectId, deletedAt: { not: null } },
    });
    const columnCount = await prisma.column.count({
      where: { projectId, deletedAt: { not: null } },
    });
    
    // Restore in transaction
    const operations = [
      prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: null },
      }),
    ];
    
    if (restoreColumns) {
      operations.push(
        prisma.column.updateMany({
          where: { projectId, deletedAt: { not: null } },
          data: { deletedAt: null },
        })
      );
    }
    
    if (restoreTasks) {
      operations.push(
        prisma.task.updateMany({
          where: { projectId, deletedAt: { not: null } },
          data: { deletedAt: null },
        })
      );
    }
    
    await prisma.$transaction(operations);
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        columns: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    await logActivity({
      action: "restored",
      entityType: "project",
      entityId: projectId,
      projectId,
      metadata: {
        name: existing.name,
        tasksRestored: restoreTasks ? taskCount : 0,
        columnsRestored: restoreColumns ? columnCount : 0,
      },
    });
    
    return NextResponse.json({
      data: project,
      restored: {
        tasks: restoreTasks ? taskCount : 0,
        columns: restoreColumns ? columnCount : 0,
      },
    });
  } catch (error) {
    console.error("Error restoring project:", error);
    return NextResponse.json(
      { error: "Failed to restore project" },
      { status: 500 }
    );
  }
}
