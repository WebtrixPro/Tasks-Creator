import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity, logFieldChanges } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

// GET /api/v2/projects/[projectId] - Get a single project with full details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    
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
                role: true,
              },
            },
          },
        },
        columns: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          include: {
            _count: {
              select: {
                tasks: { where: { deletedAt: null } },
              },
            },
          },
        },
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
            activities: true,
          },
        },
      },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    // Include task statistics if requested
    let stats = null;
    if (includeStats) {
      const taskStats = await prisma.task.groupBy({
        by: ["status"],
        where: {
          projectId,
          deletedAt: null,
        },
        _count: true,
      });
      
      const priorityStats = await prisma.task.groupBy({
        by: ["priority"],
        where: {
          projectId,
          deletedAt: null,
        },
        _count: true,
      });
      
      const overdueTasks = await prisma.task.count({
        where: {
          projectId,
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { notIn: ["done", "completed"] },
        },
      });
      
      stats = {
        byStatus: taskStats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
        byPriority: priorityStats.reduce((acc, s) => ({ ...acc, [s.priority]: s._count }), {}),
        overdueTasks,
      };
    }
    
    return NextResponse.json({
      data: project,
      stats,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PATCH /api/v2/projects/[projectId] - Update a project
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const { name, description, color, isArchived, basecampProjectId } = body;
    
    // Get existing project
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Cannot update a deleted project. Restore it first." },
        { status: 400 }
      );
    }
    
    // Check for duplicate basecampProjectId
    if (basecampProjectId && basecampProjectId !== existing.basecampProjectId) {
      const duplicate = await prisma.project.findUnique({
        where: { basecampProjectId },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A project with this Basecamp ID already exists" },
          { status: 409 }
        );
      }
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (basecampProjectId !== undefined) updateData.basecampProjectId = basecampProjectId || null;
    
    // Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
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
      },
    });
    
    // Log activity with field changes
    const changes = logFieldChanges(existing, project, ["name", "description", "color", "isArchived"]);
    if (Object.keys(changes).length > 0) {
      await logActivity({
        action: "updated",
        entityType: "project",
        entityId: project.id,
        projectId: project.id,
        metadata: {
          changes,
          name: project.name,
        },
      });
    }
    
    // Special activity for archive/unarchive
    if (isArchived !== undefined && isArchived !== existing.isArchived) {
      await logActivity({
        action: isArchived ? "archived" : "unarchived",
        entityType: "project",
        entityId: project.id,
        projectId: project.id,
        metadata: { name: project.name },
      });
    }
    
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/projects/[projectId] - Soft delete a project
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";
    
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
            members: true,
          },
        },
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    if (permanent) {
      // Permanent delete - only if already soft deleted
      if (!existing.deletedAt) {
        return NextResponse.json(
          { error: "Project must be soft deleted before permanent deletion" },
          { status: 400 }
        );
      }
      
      // Cascade delete will handle related records
      await prisma.project.delete({
        where: { id: projectId },
      });
      
      await logActivity({
        action: "permanently_deleted",
        entityType: "project",
        entityId: projectId,
        metadata: { name: existing.name },
      });
      
      return NextResponse.json({ message: "Project permanently deleted" });
    } else {
      // Soft delete
      if (existing.deletedAt) {
        return NextResponse.json(
          { error: "Project is already deleted" },
          { status: 400 }
        );
      }
      
      // Soft delete project and its tasks
      await prisma.$transaction([
        prisma.project.update({
          where: { id: projectId },
          data: { deletedAt: new Date() },
        }),
        prisma.task.updateMany({
          where: { projectId, deletedAt: null },
          data: { deletedAt: new Date() },
        }),
        prisma.column.updateMany({
          where: { projectId, deletedAt: null },
          data: { deletedAt: new Date() },
        }),
      ]);
      
      await logActivity({
        action: "deleted",
        entityType: "project",
        entityId: projectId,
        projectId,
        metadata: {
          name: existing.name,
          tasksCount: existing._count.tasks,
          membersCount: existing._count.members,
        },
      });
      
      return NextResponse.json({
        message: "Project deleted",
        affectedTasks: existing._count.tasks,
      });
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
