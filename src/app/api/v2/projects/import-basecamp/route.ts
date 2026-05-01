import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureFreshAccessToken, getDecryptedTokens } from "@/lib/basecampConnection";
import { getProjects, type BasecampProject } from "@/lib/basecamp";
import { logActivity } from "@/lib/activity-logger";

export async function POST() {
  try {
    const tokens = await getDecryptedTokens();
    if (!tokens) {
      return NextResponse.json(
        { error: "Basecamp is not connected" },
        { status: 400 }
      );
    }

    const { accessToken, accountId } = await ensureFreshAccessToken();
    
    // Fetch projects from Basecamp
    const basecampProjects = await getProjects(accessToken, accountId, "active");
    
    const imported: string[] = [];
    const skipped: string[] = [];

    for (const bcProject of basecampProjects) {
      // Check if project already exists with this Basecamp ID
      const existing = await prisma.project.findFirst({
        where: { basecampProjectId: String(bcProject.id) },
      });

      if (existing) {
        // Update existing project
        await prisma.project.update({
          where: { id: existing.id },
          data: {
            name: bcProject.name,
            description: bcProject.description || null,
          },
        });
        skipped.push(bcProject.name);
      } else {
        // Create new project
        const newProject = await prisma.project.create({
          data: {
            name: bcProject.name,
            description: bcProject.description || null,
            basecampProjectId: String(bcProject.id),
            color: getRandomColor(),
          },
        });

        await logActivity({
          action: "created",
          entityType: "project",
          entityId: newProject.id,
          projectId: newProject.id,
          metadata: { 
            source: "basecamp_import",
            basecampProjectId: bcProject.id,
          },
        });

        imported.push(bcProject.name);
      }
    }

    return NextResponse.json({
      ok: true,
      imported: imported.length,
      updated: skipped.length,
      projects: { imported, updated: skipped },
    });
  } catch (error) {
    console.error("Import projects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import projects" },
      { status: 500 }
    );
  }
}

function getRandomColor(): string {
  const colors = [
    "#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6",
    "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#ef4444",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
