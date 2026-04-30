import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPagination, buildOrderBy } from "@/lib/query-helpers";

// GET /api/v2/activity - List activity log with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const { skip, take } = buildPagination(page, limit);
    
    // Filtering
    const projectId = searchParams.get("projectId");
    const actorId = searchParams.get("actorId");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    
    // Date filters
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    
    // Sorting
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (projectId) where.projectId = projectId;
    if (actorId) where.actorId = actorId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
    }
    
    // Execute query
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(sortBy, sortOrder),
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      }),
      prisma.activity.count({ where }),
    ]);
    
    return NextResponse.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
