import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { buildPagination } from "@/lib/query-helpers";

// GET /api/v2/trash - List all soft-deleted items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const { skip, take } = buildPagination(page, limit);
    
    // Entity type filter
    const entityType = searchParams.get("type"); // task, project, member, column, comment
    
    // Fetch deleted items based on type
    const results: {
      tasks?: unknown[];
      projects?: unknown[];
      members?: unknown[];
      columns?: unknown[];
      comments?: unknown[];
    } = {};
    
    const counts: {
      tasks?: number;
      projects?: number;
      members?: number;
      columns?: number;
      comments?: number;
    } = {};
    
    if (!entityType || entityType === "task") {
      const [tasks, taskCount] = await Promise.all([
        prisma.task.findMany({
          where: { deletedAt: { not: null } },
          skip: entityType === "task" ? skip : 0,
          take: entityType === "task" ? take : 10,
          orderBy: { deletedAt: "desc" },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            deletedAt: true,
            project: {
              select: { id: true, name: true },
            },
          },
        }),
        prisma.task.count({ where: { deletedAt: { not: null } } }),
      ]);
      results.tasks = tasks;
      counts.tasks = taskCount;
    }
    
    if (!entityType || entityType === "project") {
      const [projects, projectCount] = await Promise.all([
        prisma.project.findMany({
          where: { deletedAt: { not: null } },
          skip: entityType === "project" ? skip : 0,
          take: entityType === "project" ? take : 10,
          orderBy: { deletedAt: "desc" },
          select: {
            id: true,
            name: true,
            color: true,
            deletedAt: true,
            _count: {
              select: {
                tasks: true,
                members: true,
              },
            },
          },
        }),
        prisma.project.count({ where: { deletedAt: { not: null } } }),
      ]);
      results.projects = projects;
      counts.projects = projectCount;
    }
    
    if (!entityType || entityType === "member") {
      const [members, memberCount] = await Promise.all([
        prisma.teamMember.findMany({
          where: { deletedAt: { not: null } },
          skip: entityType === "member" ? skip : 0,
          take: entityType === "member" ? take : 10,
          orderBy: { deletedAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            deletedAt: true,
          },
        }),
        prisma.teamMember.count({ where: { deletedAt: { not: null } } }),
      ]);
      results.members = members;
      counts.members = memberCount;
    }
    
    if (!entityType || entityType === "column") {
      const [columns, columnCount] = await Promise.all([
        prisma.column.findMany({
          where: { deletedAt: { not: null } },
          skip: entityType === "column" ? skip : 0,
          take: entityType === "column" ? take : 10,
          orderBy: { deletedAt: "desc" },
          select: {
            id: true,
            name: true,
            color: true,
            deletedAt: true,
            project: {
              select: { id: true, name: true },
            },
          },
        }),
        prisma.column.count({ where: { deletedAt: { not: null } } }),
      ]);
      results.columns = columns;
      counts.columns = columnCount;
    }
    
    if (!entityType || entityType === "comment") {
      const [comments, commentCount] = await Promise.all([
        prisma.taskComment.findMany({
          where: { deletedAt: { not: null } },
          skip: entityType === "comment" ? skip : 0,
          take: entityType === "comment" ? take : 10,
          orderBy: { deletedAt: "desc" },
          select: {
            id: true,
            content: true,
            deletedAt: true,
            task: {
              select: { id: true, ticketNumber: true, title: true },
            },
            author: {
              select: { id: true, name: true },
            },
          },
        }),
        prisma.taskComment.count({ where: { deletedAt: { not: null } } }),
      ]);
      results.comments = comments;
      counts.comments = commentCount;
    }
    
    return NextResponse.json({
      data: results,
      counts,
      pagination: entityType
        ? {
            page,
            limit,
            total: counts[entityType as keyof typeof counts] || 0,
            totalPages: Math.ceil((counts[entityType as keyof typeof counts] || 0) / limit),
          }
        : undefined,
    });
  } catch (error) {
    console.error("Error fetching trash:", error);
    return NextResponse.json(
      { error: "Failed to fetch trash" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/trash - Empty trash (permanent delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("type");
    const olderThanDays = parseInt(searchParams.get("olderThanDays") || "30");
    const actorId = searchParams.get("actorId");
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const results = {
      tasks: 0,
      projects: 0,
      members: 0,
      columns: 0,
      comments: 0,
    };
    
    // Delete items older than cutoff date
    if (!entityType || entityType === "comment") {
      const deleteResult = await prisma.taskComment.deleteMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });
      results.comments = deleteResult.count;
    }
    
    if (!entityType || entityType === "task") {
      const deleteResult = await prisma.task.deleteMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });
      results.tasks = deleteResult.count;
    }
    
    if (!entityType || entityType === "column") {
      const deleteResult = await prisma.column.deleteMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });
      results.columns = deleteResult.count;
    }
    
    if (!entityType || entityType === "member") {
      const deleteResult = await prisma.teamMember.deleteMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });
      results.members = deleteResult.count;
    }
    
    if (!entityType || entityType === "project") {
      const deleteResult = await prisma.project.deleteMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });
      results.projects = deleteResult.count;
    }
    
    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    if (totalDeleted > 0) {
      await logActivity({
        action: "trash_emptied",
        entityType: "system",
        entityId: "trash",
        actorId: actorId || undefined,
        metadata: {
          deletedCounts: results,
          olderThanDays,
          entityTypeFilter: entityType || "all",
        },
      });
    }
    
    return NextResponse.json({
      message: `Permanently deleted ${totalDeleted} items`,
      results,
    });
  } catch (error) {
    console.error("Error emptying trash:", error);
    return NextResponse.json(
      { error: "Failed to empty trash" },
      { status: 500 }
    );
  }
}
