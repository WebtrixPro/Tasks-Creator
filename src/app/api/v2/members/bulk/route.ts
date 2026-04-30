import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

const MAX_BULK_ITEMS = 100;

// POST /api/v2/members/bulk - Bulk operations on team members
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, memberIds } = body;
    
    // Validation
    if (!action || !["delete", "restore", "updateRole"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Allowed: delete, restore, updateRole" },
        { status: 400 }
      );
    }
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds must be a non-empty array" },
        { status: 400 }
      );
    }
    
    if (memberIds.length > MAX_BULK_ITEMS) {
      return NextResponse.json(
        { error: `Cannot process more than ${MAX_BULK_ITEMS} items at once` },
        { status: 400 }
      );
    }
    
    let result;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    switch (action) {
      case "delete": {
        // Soft delete multiple members
        result = await prisma.teamMember.updateMany({
          where: {
            id: { in: memberIds },
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
        
        results.success = result.count;
        results.failed = memberIds.length - result.count;
        
        // Log activity for each
        await Promise.all(
          memberIds.map((id) =>
            logActivity({
              action: "deleted",
              entityType: "team_member",
              entityId: id,
              metadata: { bulkOperation: true },
            })
          )
        );
        break;
      }
      
      case "restore": {
        // Restore multiple soft-deleted members
        result = await prisma.teamMember.updateMany({
          where: {
            id: { in: memberIds },
            deletedAt: { not: null },
          },
          data: { deletedAt: null },
        });
        
        results.success = result.count;
        results.failed = memberIds.length - result.count;
        
        await Promise.all(
          memberIds.map((id) =>
            logActivity({
              action: "restored",
              entityType: "team_member",
              entityId: id,
              metadata: { bulkOperation: true },
            })
          )
        );
        break;
      }
      
      case "updateRole": {
        const { role } = body;
        if (!role) {
          return NextResponse.json(
            { error: "role is required for updateRole action" },
            { status: 400 }
          );
        }
        
        result = await prisma.teamMember.updateMany({
          where: {
            id: { in: memberIds },
            deletedAt: null,
          },
          data: { role },
        });
        
        results.success = result.count;
        results.failed = memberIds.length - result.count;
        
        await Promise.all(
          memberIds.map((id) =>
            logActivity({
              action: "updated",
              entityType: "team_member",
              entityId: id,
              metadata: { bulkOperation: true, changes: { role: { to: role } } },
            })
          )
        );
        break;
      }
    }
    
    return NextResponse.json({
      message: `Bulk ${action} completed`,
      results,
    });
  } catch (error) {
    console.error("Error in bulk member operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}
