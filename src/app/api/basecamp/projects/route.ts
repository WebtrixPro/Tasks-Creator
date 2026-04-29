import { NextResponse } from "next/server";

import { getProjects, createProject } from "@/lib/basecamp";
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
      cardTable: project.dock.find((d) => d.name === "kanban_board"),
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
