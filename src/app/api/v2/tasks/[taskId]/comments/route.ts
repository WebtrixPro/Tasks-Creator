import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

// GET /api/v2/tasks/[taskId]/comments - List task comments
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }
    
    const where: Record<string, unknown> = { taskId };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    
    const comments = await prisma.taskComment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/v2/tasks/[taskId]/comments - Add a comment
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId } = await context.params;
    const body = await request.json();
    const { content, authorId } = body;
    
    // Validation
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });
    
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }
    
    if (task.deletedAt) {
      return NextResponse.json(
        { error: "Cannot comment on a deleted task" },
        { status: 400 }
      );
    }
    
    // Validate author if provided
    if (authorId) {
      const author = await prisma.teamMember.findUnique({
        where: { id: authorId },
      });
      if (!author || author.deletedAt) {
        return NextResponse.json(
          { error: "Author not found or deleted" },
          { status: 400 }
        );
      }
    }
    
    const comment = await prisma.taskComment.create({
      data: {
        content: content.trim(),
        taskId,
        authorId: authorId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    await logActivity({
      action: "comment_added",
      entityType: "task",
      entityId: taskId,
      projectId: task.projectId || undefined,
      actorId: authorId,
      metadata: {
        ticketNumber: task.ticketNumber,
        title: task.title,
        commentId: comment.id,
        contentPreview: content.substring(0, 100),
      },
    });
    
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
