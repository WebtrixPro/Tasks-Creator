import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { buildPagination, buildOrderBy } from "@/lib/query-helpers";

// GET /api/v2/tasks - List tasks with advanced filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const { skip, take } = buildPagination(page, limit);
    
    // Filtering
    const search = searchParams.get("search");
    const projectId = searchParams.get("projectId");
    const columnId = searchParams.get("columnId");
    const assigneeId = searchParams.get("assigneeId");
    const creatorId = searchParams.get("creatorId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const syncStatus = searchParams.get("syncStatus");
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    
    // Date filters
    const dueDateFrom = searchParams.get("dueDateFrom");
    const dueDateTo = searchParams.get("dueDateTo");
    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const overdue = searchParams.get("overdue");
    
    // Sorting
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { userStory: { contains: search, mode: "insensitive" } },
        { ticketNumber: { equals: parseInt(search) || -1 } },
      ];
    }
    
    if (projectId) where.projectId = projectId;
    if (columnId) where.columnId = columnId;
    if (assigneeId) where.assigneeId = assigneeId === "null" ? null : assigneeId;
    if (creatorId) where.creatorId = creatorId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (syncStatus) where.syncStatus = syncStatus;
    
    // Date filters
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) (where.dueDate as Record<string, Date>).gte = new Date(dueDateFrom);
      if (dueDateTo) (where.dueDate as Record<string, Date>).lte = new Date(dueDateTo);
    }
    
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) (where.createdAt as Record<string, Date>).gte = new Date(createdFrom);
      if (createdTo) (where.createdAt as Record<string, Date>).lte = new Date(createdTo);
    }
    
    // Overdue filter
    if (overdue === "true") {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ["done", "completed"] };
    }
    
    // Execute query
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(sortBy, sortOrder),
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          column: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              comments: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);
    
    return NextResponse.json({
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/v2/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      ticketNumber,
      userStory,
      description,
      acceptanceCriteria,
      estimate,
      priority,
      status,
      startDate,
      endDate,
      dueDate,
      projectId,
      columnId,
      assigneeId,
      creatorId,
      importBatchId,
    } = body;
    
    // Validation
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    
    // Auto-generate ticket number if not provided
    let finalTicketNumber = ticketNumber;
    if (!finalTicketNumber) {
      const maxTicket = await prisma.task.aggregate({
        _max: { ticketNumber: true },
      });
      finalTicketNumber = (maxTicket._max.ticketNumber || 0) + 1;
    }
    
    // Validate project exists if provided
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
    
    // Validate column belongs to project if both provided
    if (columnId && projectId) {
      const column = await prisma.column.findFirst({
        where: {
          id: columnId,
          projectId,
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
    
    // Validate assignee exists
    if (assigneeId) {
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
    
    // Determine position for new task
    let position = 0;
    if (columnId) {
      const maxPosition = await prisma.task.aggregate({
        where: { columnId, deletedAt: null },
        _max: { position: true },
      });
      position = (maxPosition._max.position ?? -1) + 1;
    }
    
    // Create task
    const task = await prisma.task.create({
      data: {
        ticketNumber: finalTicketNumber,
        title: title.trim(),
        userStory: userStory?.trim() || "",
        description: description?.trim() || "",
        acceptanceCriteria: acceptanceCriteria?.trim() || "",
        estimate: estimate || "",
        priority: priority || "medium",
        status: status || "pending",
        position,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        columnId: columnId || null,
        assigneeId: assigneeId || null,
        creatorId: creatorId || null,
        importBatchId: importBatchId || null,
        syncStatus: "local_only",
      },
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
      },
    });
    
    // Log activity
    await logActivity({
      action: "created",
      entityType: "task",
      entityId: task.id,
      projectId: task.projectId || undefined,
      actorId: creatorId,
      metadata: {
        ticketNumber: task.ticketNumber,
        title: task.title,
        projectName: task.project?.name,
        assigneeName: task.assignee?.name,
      },
    });
    
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
