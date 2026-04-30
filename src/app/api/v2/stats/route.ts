import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/v2/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    
    // Build where clauses
    const taskWhere: Record<string, unknown> = { deletedAt: null };
    const activityWhere: Record<string, unknown> = {};
    
    if (projectId) {
      taskWhere.projectId = projectId;
      activityWhere.projectId = projectId;
    }
    
    // Fetch all stats in parallel
    const [
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      totalProjects,
      activeProjects,
      totalMembers,
      recentActivity,
      tasksByAssignee,
      unassignedTasks,
    ] = await Promise.all([
      // Total tasks
      prisma.task.count({ where: taskWhere }),
      
      // Tasks by status
      prisma.task.groupBy({
        by: ["status"],
        where: taskWhere,
        _count: true,
      }),
      
      // Tasks by priority
      prisma.task.groupBy({
        by: ["priority"],
        where: taskWhere,
        _count: true,
      }),
      
      // Overdue tasks
      prisma.task.count({
        where: {
          ...taskWhere,
          dueDate: { lt: new Date() },
          status: { notIn: ["done", "completed"] },
        },
      }),
      
      // Total projects
      prisma.project.count({
        where: { deletedAt: null },
      }),
      
      // Active (non-archived) projects
      prisma.project.count({
        where: { deletedAt: null, isArchived: false },
      }),
      
      // Total team members
      prisma.teamMember.count({
        where: { deletedAt: null },
      }),
      
      // Recent activity (last 7 days)
      prisma.activity.count({
        where: {
          ...activityWhere,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Tasks by assignee (top 10)
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: {
          ...taskWhere,
          assigneeId: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            assigneeId: "desc",
          },
        },
        take: 10,
      }),
      
      // Unassigned tasks
      prisma.task.count({
        where: {
          ...taskWhere,
          assigneeId: null,
        },
      }),
    ]);
    
    // Get assignee names for the top assignees
    const assigneeIds = tasksByAssignee
      .map((t) => t.assigneeId)
      .filter((id): id is string => id !== null);
    
    const assignees = await prisma.teamMember.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, avatarUrl: true },
    });
    
    const assigneeMap = new Map(assignees.map((a) => [a.id, a]));
    
    // Format response
    return NextResponse.json({
      data: {
        tasks: {
          total: totalTasks,
          byStatus: tasksByStatus.reduce(
            (acc, s) => ({ ...acc, [s.status]: s._count }),
            {} as Record<string, number>
          ),
          byPriority: tasksByPriority.reduce(
            (acc, s) => ({ ...acc, [s.priority]: s._count }),
            {} as Record<string, number>
          ),
          overdue: overdueTasks,
          unassigned: unassignedTasks,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          archived: totalProjects - activeProjects,
        },
        members: {
          total: totalMembers,
        },
        activity: {
          lastWeek: recentActivity,
        },
        topAssignees: tasksByAssignee.map((t) => ({
          assignee: assigneeMap.get(t.assigneeId!),
          taskCount: t._count,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
