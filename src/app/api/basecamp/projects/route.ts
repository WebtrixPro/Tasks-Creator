import { NextResponse } from "next/server";

import { getProjects } from "@/lib/basecamp";
import { ensureFreshAccessToken } from "@/lib/basecampConnection";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "active" | "archived" | "trashed" | null;

  try {
    const { accessToken, accountId } = await ensureFreshAccessToken();
    const projects = await getProjects(accessToken, accountId, status ?? "active");
    
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
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
