import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity, logFieldChanges } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ projectId: string; columnId: string }>;
};

// PATCH /api/v2/projects/[projectId]/columns/[columnId] - Update a column
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId, columnId } = await context.params;
    const body = await request.json();
    const { name, color, position } = body;
    
    const existing = await prisma.column.findFirst({
      where: {
        id: columnId,
        projectId,
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Column not found" },
        { status: 404 }
      );
    }
    
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Cannot update a deleted column. Restore it first." },
        { status: 400 }
      );
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color || null;
    if (position !== undefined) updateData.position = position;
    
    const column = await prisma.column.update({
      where: { id: columnId },
      data: updateData,
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    // Log activity
    const changes = logFieldChanges(existing, column, ["name", "color", "position"]);
    if (Object.keys(changes).length > 0) {
      await logActivity({
        action: "updated",
        entityType: "column",
        entityId: column.id,
        projectId,
        metadata: {
          columnName: column.name,
          changes,
        },
      });
    }
    
    return NextResponse.json({ data: column });
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/projects/[projectId]/columns/[columnId] - Delete a column
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId, columnId } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";
    const moveTasksTo = searchParams.get("moveTasksTo");
    
    const existing = await prisma.column.findFirst({
      where: {
        id: columnId,
        projectId,
      },
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Column not found" },
        { status: 404 }
      );
    }
    
    // If column has tasks and no destination specified
    if (existing._count.tasks > 0 && !moveTasksTo && !permanent) {
      return NextResponse.json(
        {
          error: "Column has tasks. Specify moveTasksTo parameter or delete tasks first.",
          tasksCount: existing._count.tasks,
        },
        { status: 400 }
      );
    }
    
    if (permanent) {
      if (!existing.deletedAt) {
        return NextResponse.json(
          { error: "Column must be soft deleted before permanent deletion" },
          { status: 400 }
        );
      }
      
      await prisma.column.delete({
        where: { id: columnId },
      });
      
      await logActivity({
        action: "permanently_deleted",
        entityType: "column",
        entityId: columnId,
        projectId,
        metadata: { columnName: existing.name },
      });
      
      return NextResponse.json({ message: "Column permanently deleted" });
    }
    
    // Move tasks to another column if specified
    if (moveTasksTo && existing._count.tasks > 0) {
      const targetColumn = await prisma.column.findFirst({
        where: {
          id: moveTasksTo,
          projectId,
          deletedAt: null,
        },
      });
      
      if (!targetColumn) {
        return NextResponse.json(
          { error: "Target column not found or deleted" },
          { status: 400 }
        );
      }
      
      await prisma.task.updateMany({
        where: { columnId, deletedAt: null },
        data: { columnId: moveTasksTo },
      });
    }
    
    // Soft delete
    await prisma.column.update({
      where: { id: columnId },
      data: { deletedAt: new Date() },
    });
    
    await logActivity({
      action: "deleted",
      entityType: "column",
      entityId: columnId,
      projectId,
      metadata: {
        columnName: existing.name,
        tasksCount: existing._count.tasks,
        tasksMoved: moveTasksTo ? true : false,
      },
    });
    
    return NextResponse.json({
      message: "Column deleted",
      tasksMoved: moveTasksTo ? existing._count.tasks : 0,
    });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
