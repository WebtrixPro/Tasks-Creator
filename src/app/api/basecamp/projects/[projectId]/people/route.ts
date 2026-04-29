import { NextResponse } from "next/server";

import { getProjectPeople } from "@/lib/basecamp";
import { ensureFreshAccessToken } from "@/lib/basecampConnection";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { projectId } = await ctx.params;

  try {
    const { accessToken, accountId } = await ensureFreshAccessToken();
    const people = await getProjectPeople(accessToken, accountId, projectId);

    // Return simplified people data for the frontend
    const simplified = people.map((p) => ({
      id: String(p.id),
      name: p.name,
      email: p.email_address,
      title: p.title,
      avatarUrl: p.avatar_url,
      isAdmin: p.admin,
      isOwner: p.owner,
    }));

    return NextResponse.json({ people: simplified });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    console.error("[/api/basecamp/projects/[projectId]/people] error:", message);

    if (message === "Basecamp is not connected.") {
      return NextResponse.json({ error: message, people: [] }, { status: 401 });
    }

    return NextResponse.json({ error: message, people: [] }, { status: 502 });
  }
}
