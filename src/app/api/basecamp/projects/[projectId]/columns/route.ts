import { NextResponse } from "next/server";

import { getCardTable, getProjects } from "@/lib/basecamp";
import { ensureFreshAccessToken } from "@/lib/basecampConnection";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const { accessToken, accountId } = await ensureFreshAccessToken();
    
    // Fetch the project to get its dock items
    const projects = await getProjects(accessToken, accountId);
    const project = projects.find((p) => String(p.id) === projectId);
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Find the card table (kanban_board) dock item
    const cardTableDock = project.dock.find((d) => d.name === "kanban_board" && d.enabled);
    
    if (!cardTableDock) {
      return NextResponse.json({ 
        error: "No Card Table found for this project", 
        lists: [] 
      }, { status: 404 });
    }

    // Extract card table ID from the URL
    // URL format: https://3.basecampapi.com/{accountId}/buckets/{bucketId}/card_tables/{cardTableId}.json
    const urlMatch = cardTableDock.url.match(/buckets\/(\d+)\/card_tables\/(\d+)/);
    if (!urlMatch) {
      return NextResponse.json({ 
        error: "Could not parse Card Table URL", 
        lists: [] 
      }, { status: 500 });
    }

    const bucketId = urlMatch[1];
    const cardTableId = urlMatch[2];

    // Fetch the card table to get columns (lists)
    const table = await getCardTable(accessToken, accountId, bucketId, cardTableId);
    
    const lists = (table.lists ?? []).map((l) => ({
      id: String(l.id),
      title: l.title,
      type: l.type,
    }));

    return NextResponse.json({ 
      lists, 
      cardTableTitle: table.title,
      cardTableId,
      bucketId,
      projectId,
      projectName: project.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    console.error("[v0] /api/basecamp/projects/[projectId]/columns error:", message);
    return NextResponse.json({ error: message, lists: [] }, { status: 502 });
  }
}
