import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureFreshAccessToken, getDecryptedTokens } from "@/lib/basecampConnection";
import { getProjectPeople, getProjects } from "@/lib/basecamp";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { projectId: basecampProjectId } = body;

    const tokens = await getDecryptedTokens();
    if (!tokens) {
      return NextResponse.json(
        { error: "Basecamp is not connected" },
        { status: 400 }
      );
    }

    const { accessToken, accountId } = await ensureFreshAccessToken();
    
    let projectIds: string[] = [];
    
    if (basecampProjectId) {
      // Import from specific project
      projectIds = [basecampProjectId];
    } else {
      // Import from all active projects
      const basecampProjects = await getProjects(accessToken, accountId, "active");
      projectIds = basecampProjects.map((p) => String(p.id));
    }

    const imported: string[] = [];
    const updated: string[] = [];

    for (const bcProjectId of projectIds) {
      const people = await getProjectPeople(accessToken, accountId, bcProjectId);

      for (const person of people) {
        // Check if member already exists with this Basecamp ID
        const existing = await prisma.teamMember.findFirst({
          where: { basecampPersonId: String(person.id) },
        });

        if (existing) {
          // Update existing member
          await prisma.teamMember.update({
            where: { id: existing.id },
            data: {
              name: person.name,
              email: person.email_address || null,
              avatarUrl: person.avatar_url || null,
            },
          });
          if (!updated.includes(person.name)) {
            updated.push(person.name);
          }
        } else {
          // Create new member
          const newMember = await prisma.teamMember.create({
            data: {
              name: person.name,
              email: person.email_address || null,
              avatarUrl: person.avatar_url || null,
              basecampPersonId: String(person.id),
              role: person.admin ? "admin" : "member",
            },
          });

          await logActivity({
            action: "created",
            entityType: "member",
            entityId: newMember.id,
            metadata: { 
              source: "basecamp_import",
              basecampPersonId: person.id,
            },
          });

          imported.push(person.name);
        }
      }

      // Link members to local project if it exists
      const localProject = await prisma.project.findFirst({
        where: { basecampProjectId: bcProjectId },
      });

      if (localProject) {
        // Get all members imported from this Basecamp project
        const people = await getProjectPeople(accessToken, accountId, bcProjectId);
        for (const person of people) {
          const member = await prisma.teamMember.findFirst({
            where: { basecampPersonId: String(person.id) },
          });

          if (member) {
            // Create project membership if it doesn't exist
            await prisma.projectMember.upsert({
              where: {
                projectId_memberId: {
                  projectId: localProject.id,
                  memberId: member.id,
                },
              },
              create: {
                projectId: localProject.id,
                memberId: member.id,
                role: person.admin ? "admin" : "member",
              },
              update: {
                role: person.admin ? "admin" : "member",
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      imported: imported.length,
      updated: updated.length,
      members: { imported, updated },
    });
  } catch (error) {
    console.error("Import members error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import members" },
      { status: 500 }
    );
  }
}
