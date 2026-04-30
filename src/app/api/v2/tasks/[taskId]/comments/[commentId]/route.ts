import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ taskId: string; commentId: string }>;
};

// PATCH /api/v2/tasks/[taskId]/comments/[commentId] - Update a comment
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId, commentId } = await context.params;
    const body = await request.json();
    const { content, actorId } = body;
    
    // Validation
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }
    
    const existing = await prisma.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      include: {
        task: {
          select: { ticketNumber: true, title: true, projectId: true },
        },
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }
    
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Cannot update a deleted comment" },
        { status: 400 }
      );
    }
    
    const comment = await prisma.taskComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
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
      action: "comment_updated",
      entityType: "task",
      entityId: taskId,
      projectId: existing.task.projectId || undefined,
      actorId,
      metadata: {
        ticketNumber: existing.task.ticketNumber,
        commentId: comment.id,
      },
    });
    
    return NextResponse.json({ data: comment });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/tasks/[taskId]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { taskId, commentId } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";
    const actorId = searchParams.get("actorId");
    
    const existing = await prisma.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      include: {
        task: {
          select: { ticketNumber: true, title: true, projectId: true },
        },
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }
    
    if (permanent) {
      if (!existing.deletedAt) {
        return NextResponse.json(
          { error: "Comment must be soft deleted before permanent deletion" },
          { status: 400 }
        );
      }
      
      await prisma.taskComment.delete({
        where: { id: commentId },
      });
      
      return NextResponse.json({ message: "Comment permanently deleted" });
    }
    
    // Soft delete
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Comment is already deleted" },
        { status: 400 }
      );
    }
    
    await prisma.taskComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    
    await logActivity({
      action: "comment_deleted",
      entityType: "task",
      entityId: taskId,
      projectId: existing.task.projectId || undefined,
      actorId: actorId || undefined,
      metadata: {
        ticketNumber: existing.task.ticketNumber,
        commentId,
      },
    });
    
    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
