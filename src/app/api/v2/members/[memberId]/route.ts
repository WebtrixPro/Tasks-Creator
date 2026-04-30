import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity, logFieldChanges } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

// GET /api/v2/members/[memberId] - Get a single team member
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { memberId } = await context.params;
    
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                color: true,
                isArchived: true,
              },
            },
          },
        },
        assignedTasks: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
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
            comments: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    if (!member) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch team member" },
      { status: 500 }
    );
  }
}

// PATCH /api/v2/members/[memberId] - Update a team member
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { memberId } = await context.params;
    const body = await request.json();
    const { name, email, avatarUrl, role, basecampPersonId } = body;
    
    // Get existing member
    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }
    
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Cannot update a deleted team member. Restore it first." },
        { status: 400 }
      );
    }
    
    // Check for duplicate email
    if (email && email !== existing.email) {
      const duplicate = await prisma.teamMember.findUnique({
        where: { email },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A team member with this email already exists" },
          { status: 409 }
        );
      }
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (role !== undefined) updateData.role = role;
    if (basecampPersonId !== undefined) updateData.basecampPersonId = basecampPersonId || null;
    
    // Update member
    const member = await prisma.teamMember.update({
      where: { id: memberId },
      data: updateData,
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
    
    // Log activity with field changes
    const changes = logFieldChanges(existing, member, ["name", "email", "role", "avatarUrl"]);
    if (Object.keys(changes).length > 0) {
      await logActivity({
        action: "updated",
        entityType: "team_member",
        entityId: member.id,
        metadata: {
          changes,
          name: member.name,
        },
      });
    }
    
    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/members/[memberId] - Soft delete a team member
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { memberId } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";
    
    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        _count: {
          select: {
            assignedTasks: { where: { deletedAt: null } },
          },
        },
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }
    
    if (permanent) {
      // Permanent delete - only if already soft deleted
      if (!existing.deletedAt) {
        return NextResponse.json(
          { error: "Member must be soft deleted before permanent deletion" },
          { status: 400 }
        );
      }
      
      await prisma.teamMember.delete({
        where: { id: memberId },
      });
      
      await logActivity({
        action: "permanently_deleted",
        entityType: "team_member",
        entityId: memberId,
        metadata: { name: existing.name },
      });
      
      return NextResponse.json({ message: "Team member permanently deleted" });
    } else {
      // Soft delete
      if (existing.deletedAt) {
        return NextResponse.json(
          { error: "Team member is already deleted" },
          { status: 400 }
        );
      }
      
      // Warn if member has assigned tasks
      if (existing._count.assignedTasks > 0) {
        // Still delete but include warning in response
      }
      
      const member = await prisma.teamMember.update({
        where: { id: memberId },
        data: { deletedAt: new Date() },
      });
      
      await logActivity({
        action: "deleted",
        entityType: "team_member",
        entityId: member.id,
        metadata: {
          name: existing.name,
          assignedTasksCount: existing._count.assignedTasks,
        },
      });
      
      return NextResponse.json({
        data: member,
        warning: existing._count.assignedTasks > 0
          ? `This member had ${existing._count.assignedTasks} assigned tasks that are now unassigned.`
          : undefined,
      });
    }
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete team member" },
      { status: 500 }
    );
  }
}
