import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

// POST /api/v2/members/[memberId]/restore - Restore a soft-deleted team member
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { memberId } = await context.params;
    
    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }
    
    if (!existing.deletedAt) {
      return NextResponse.json(
        { error: "Team member is not deleted" },
        { status: 400 }
      );
    }
    
    const member = await prisma.teamMember.update({
      where: { id: memberId },
      data: { deletedAt: null },
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
    
    await logActivity({
      action: "restored",
      entityType: "team_member",
      entityId: member.id,
      metadata: { name: member.name },
    });
    
    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("Error restoring member:", error);
    return NextResponse.json(
      { error: "Failed to restore team member" },
      { status: 500 }
    );
  }
}
