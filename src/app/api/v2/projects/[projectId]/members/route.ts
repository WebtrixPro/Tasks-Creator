import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

// GET /api/v2/projects/[projectId]/members - List project members
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            deletedAt: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { joinedAt: "asc" },
      ],
    });
    
    return NextResponse.json({ data: members });
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      { error: "Failed to fetch project members" },
      { status: 500 }
    );
  }
}

// POST /api/v2/projects/[projectId]/members - Add members to project
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const { memberIds, role = "member" } = body;
    
    // Validation
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds must be a non-empty array" },
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
        { error: "Cannot add members to a deleted project" },
        { status: 400 }
      );
    }
    
    // Verify all members exist
    const existingMembers = await prisma.teamMember.findMany({
      where: {
        id: { in: memberIds },
        deletedAt: null,
      },
      select: { id: true, name: true },
    });
    
    if (existingMembers.length !== memberIds.length) {
      return NextResponse.json(
        { error: "One or more team members not found or are deleted" },
        { status: 400 }
      );
    }
    
    // Check for existing memberships
    const existingMemberships = await prisma.projectMember.findMany({
      where: {
        projectId,
        memberId: { in: memberIds },
      },
    });
    
    const existingMemberIds = new Set(existingMemberships.map((m) => m.memberId));
    const newMemberIds = memberIds.filter((id: string) => !existingMemberIds.has(id));
    
    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { error: "All specified members are already in this project" },
        { status: 400 }
      );
    }
    
    // Add new members
    await prisma.projectMember.createMany({
      data: newMemberIds.map((memberId: string) => ({
        projectId,
        memberId,
        role,
      })),
    });
    
    // Log activity
    await logActivity({
      action: "members_added",
      entityType: "project",
      entityId: projectId,
      projectId,
      metadata: {
        projectName: project.name,
        addedCount: newMemberIds.length,
        memberNames: existingMembers
          .filter((m) => newMemberIds.includes(m.id))
          .map((m) => m.name),
      },
    });
    
    // Return updated member list
    const members = await prisma.projectMember.findMany({
      where: { projectId },
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
    });
    
    return NextResponse.json({
      data: members,
      added: newMemberIds.length,
      skipped: memberIds.length - newMemberIds.length,
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding project members:", error);
    return NextResponse.json(
      { error: "Failed to add project members" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/projects/[projectId]/members - Remove members from project
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const { memberIds } = body;
    
    // Validation
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds must be a non-empty array" },
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
    
    // Get member names for activity log
    const membersToRemove = await prisma.projectMember.findMany({
      where: {
        projectId,
        memberId: { in: memberIds },
      },
      include: {
        member: {
          select: { name: true },
        },
      },
    });
    
    // Remove memberships
    const result = await prisma.projectMember.deleteMany({
      where: {
        projectId,
        memberId: { in: memberIds },
      },
    });
    
    if (result.count > 0) {
      await logActivity({
        action: "members_removed",
        entityType: "project",
        entityId: projectId,
        projectId,
        metadata: {
          projectName: project.name,
          removedCount: result.count,
          memberNames: membersToRemove.map((m) => m.member.name),
        },
      });
    }
    
    return NextResponse.json({
      message: `Removed ${result.count} member(s) from project`,
      removed: result.count,
    });
  } catch (error) {
    console.error("Error removing project members:", error);
    return NextResponse.json(
      { error: "Failed to remove project members" },
      { status: 500 }
    );
  }
}
