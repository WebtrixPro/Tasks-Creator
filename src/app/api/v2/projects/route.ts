import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { buildPagination, buildOrderBy } from "@/lib/query-helpers";

// GET /api/v2/projects - List all projects with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const { skip, take } = buildPagination(page, limit);
    
    // Filtering
    const search = searchParams.get("search");
    const isArchived = searchParams.get("isArchived");
    const memberId = searchParams.get("memberId");
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const hasBasecampLink = searchParams.get("hasBasecampLink");
    
    // Sorting
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (isArchived !== null && isArchived !== undefined) {
      where.isArchived = isArchived === "true";
    }
    
    if (memberId) {
      where.members = {
        some: { memberId },
      };
    }
    
    if (hasBasecampLink !== null && hasBasecampLink !== undefined) {
      if (hasBasecampLink === "true") {
        where.basecampProjectId = { not: null };
      } else {
        where.basecampProjectId = null;
      }
    }
    
    // Execute query
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(sortBy, sortOrder),
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
            select: {
              id: true,
              name: true,
              position: true,
              color: true,
            },
          },
          _count: {
            select: {
              tasks: { where: { deletedAt: null } },
              activities: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);
    
    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/v2/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, basecampProjectId, memberIds, columns } = body;
    
    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    
    // Check for duplicate basecampProjectId
    if (basecampProjectId) {
      const existing = await prisma.project.findUnique({
        where: { basecampProjectId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A project with this Basecamp ID already exists" },
          { status: 409 }
        );
      }
    }
    
    // Default columns if not provided
    const defaultColumns = columns || [
      { name: "To Do", position: 0, color: "#94a3b8" },
      { name: "In Progress", position: 1, color: "#3b82f6" },
      { name: "Review", position: 2, color: "#f59e0b" },
      { name: "Done", position: 3, color: "#22c55e" },
    ];
    
    // Create project with columns and optional member assignments
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#6366f1",
        basecampProjectId: basecampProjectId || null,
        columns: {
          create: defaultColumns.map((col: { name: string; position: number; color?: string }) => ({
            name: col.name,
            position: col.position,
            color: col.color || null,
          })),
        },
        members: memberIds?.length
          ? {
              create: memberIds.map((memberId: string, index: number) => ({
                memberId,
                role: index === 0 ? "owner" : "member",
              })),
            }
          : undefined,
      },
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
          orderBy: { position: "asc" },
        },
      },
    });
    
    // Log activity
    await logActivity({
      action: "created",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      metadata: {
        name: project.name,
        hasBasecampLink: !!basecampProjectId,
        columnsCount: defaultColumns.length,
        membersCount: memberIds?.length || 0,
      },
    });
    
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
