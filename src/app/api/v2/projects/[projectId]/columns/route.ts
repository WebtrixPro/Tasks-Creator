import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

// GET /api/v2/projects/[projectId]/columns - List project columns
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    const where: Record<string, unknown> = { projectId };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    
    const columns = await prisma.column.findMany({
      where,
      orderBy: { position: "asc" },
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    return NextResponse.json({ data: columns });
  } catch (error) {
    console.error("Error fetching columns:", error);
    return NextResponse.json(
      { error: "Failed to fetch columns" },
      { status: 500 }
    );
  }
}

// POST /api/v2/projects/[projectId]/columns - Create a new column
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const { name, color, position } = body;
    
    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    if (project.deletedAt) {
      return NextResponse.json(
        { error: "Cannot add columns to a deleted project" },
        { status: 400 }
      );
    }
    
    // Determine position - either specified or at the end
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const maxPosition = await prisma.column.aggregate({
        where: { projectId, deletedAt: null },
        _max: { position: true },
      });
      finalPosition = (maxPosition._max.position ?? -1) + 1;
    }
    
    const column = await prisma.column.create({
      data: {
        name: name.trim(),
        color: color || null,
        position: finalPosition,
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
    
    await logActivity({
      action: "column_created",
      entityType: "column",
      entityId: column.id,
      projectId,
      metadata: {
        columnName: column.name,
        projectName: project.name,
      },
    });
    
    return NextResponse.json({ data: column }, { status: 201 });
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}

// PATCH /api/v2/projects/[projectId]/columns - Reorder columns
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const { columnOrder } = body;
    
    // Validation
    if (!columnOrder || !Array.isArray(columnOrder)) {
      return NextResponse.json(
        { error: "columnOrder must be an array of column IDs" },
        { status: 400 }
      );
    }
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    // Update positions in a transaction
    await prisma.$transaction(
      columnOrder.map((columnId: string, index: number) =>
        prisma.column.update({
          where: { id: columnId },
          data: { position: index },
        })
      )
    );
    
    // Fetch updated columns
    const columns = await prisma.column.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { position: "asc" },
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    await logActivity({
      action: "columns_reordered",
      entityType: "project",
      entityId: projectId,
      projectId,
      metadata: {
        projectName: project.name,
        newOrder: columnOrder,
      },
    });
    
    return NextResponse.json({ data: columns });
  } catch (error) {
    console.error("Error reordering columns:", error);
    return NextResponse.json(
      { error: "Failed to reorder columns" },
      { status: 500 }
    );
  }
}
