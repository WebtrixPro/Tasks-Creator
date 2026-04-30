import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { buildPagination, buildOrderBy } from "@/lib/query-helpers";

// GET /api/v2/members - List all team members with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const { skip, take } = buildPagination(page, limit);
    
    // Filtering
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const projectId = searchParams.get("projectId");
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    
    // Sorting
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = (searchParams.get("sortOrder") || "asc") as "asc" | "desc";
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (projectId) {
      where.projectMemberships = {
        some: { projectId },
      };
    }
    
    // Execute query
    const [members, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(sortBy, sortOrder),
        include: {
          projectMemberships: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
          _count: {
            select: {
              assignedTasks: { where: { deletedAt: null } },
              createdTasks: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.teamMember.count({ where }),
    ]);
    
    return NextResponse.json({
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST /api/v2/members - Create a new team member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, avatarUrl, role, basecampPersonId, projectIds } = body;
    
    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    
    // Check for duplicate email
    if (email) {
      const existing = await prisma.teamMember.findUnique({
        where: { email },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A team member with this email already exists" },
          { status: 409 }
        );
      }
    }
    
    // Check for duplicate basecampPersonId
    if (basecampPersonId) {
      const existing = await prisma.teamMember.findUnique({
        where: { basecampPersonId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A team member with this Basecamp ID already exists" },
          { status: 409 }
        );
      }
    }
    
    // Create member with optional project memberships
    const member = await prisma.teamMember.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        avatarUrl: avatarUrl || null,
        role: role || "member",
        basecampPersonId: basecampPersonId || null,
        projectMemberships: projectIds?.length
          ? {
              create: projectIds.map((projectId: string) => ({
                projectId,
                role: "member",
              })),
            }
          : undefined,
      },
      include: {
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });
    
    // Log activity
    await logActivity({
      action: "created",
      entityType: "team_member",
      entityId: member.id,
      metadata: {
        name: member.name,
        email: member.email,
        role: member.role,
      },
    });
    
    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 }
    );
  }
}
