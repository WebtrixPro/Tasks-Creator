import { NextResponse } from "next/server";

import { getProjects, createProject, createCardTableColumn, enableTool } from "@/lib/basecamp";
import { ensureFreshAccessToken } from "@/lib/basecampConnection";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "active" | "archived" | "trashed" | null;

  try {
    const { accessToken, accountId } = await ensureFreshAccessToken();
    const projects = await getProjects(accessToken, accountId, status ?? undefined);
    
    // Return simplified project data for the frontend
    const simplified = projects.map((p) => ({
      id: String(p.id),
      name: p.name,
      description: p.description,
      purpose: p.purpose,
      status: p.status,
      appUrl: p.app_url,
      url: p.url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      // Find the Card Table dock item if it exists
      cardTable: p.dock.find((d) => d.name === "kanban_board"),
    }));

    return NextResponse.json({ projects: simplified });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    console.error("[v0] /api/basecamp/projects error:", message);
    
    // Return 401 if not connected, 502 for other errors
    if (message === "Basecamp is not connected.") {
      return NextResponse.json({ error: message, projects: [] }, { status: 401 });
    }
    
    return NextResponse.json({ error: message, projects: [] }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body as { name?: string; description?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const { accessToken, accountId } = await ensureFreshAccessToken();
    const project = await createProject(accessToken, accountId, name.trim(), description);

    // Find the Card Table (kanban_board) in the project dock
    let cardTable = project.dock.find((d) => d.name === "kanban_board");
    
    // Enable the Card Table if it exists but is not enabled
    if (cardTable && !cardTable.enabled) {
      try {
        await enableTool(accessToken, accountId, String(project.id), String(cardTable.id));
        // Update the cardTable reference to reflect it's now enabled
        cardTable = { ...cardTable, enabled: true };
      } catch (enableErr) {
        console.error("Failed to enable Card Table:", enableErr);
      }
    }
    
    // If the project has a card table (now enabled), create the default columns
    if (cardTable?.enabled) {
      const bucketId = String(project.id);
      const cardTableId = String(cardTable.id);
      
      // Create the three default columns: To-Do, In Progress, Done
      const defaultColumns = [
        { title: "To-Do", description: "Tasks that need to be started" },
        { title: "In Progress", description: "Tasks currently being worked on" },
        { title: "Done", description: "Completed tasks" },
      ];
      
      for (const col of defaultColumns) {
        try {
          await createCardTableColumn(
            accessToken,
            accountId,
            bucketId,
            cardTableId,
            col.title,
            col.description
          );
        } catch (colErr) {
          // Log but don't fail the whole request if column creation fails
          console.error("Failed to create column:", col.title, colErr);
        }
      }
    }

    // Return simplified project data
    const simplified = {
      id: String(project.id),
      name: project.name,
      description: project.description,
      purpose: project.purpose,
      status: project.status,
      appUrl: project.app_url,
      url: project.url,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      cardTable: cardTable,
    };

    return NextResponse.json({ project: simplified }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    console.error("[v0] POST /api/basecamp/projects error:", message);

    if (message === "Basecamp is not connected.") {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
