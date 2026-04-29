import { NextResponse } from "next/server";

import { buildCardContent, createCard } from "@/lib/basecamp";
import { ensureFreshAccessToken } from "@/lib/basecampConnection";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ taskId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { taskId } = await ctx.params;
  let body: { columnListId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  const columnListId =
    typeof body.columnListId === "string" && body.columnListId.trim()
      ? body.columnListId.trim()
      : process.env.BASECAMP_DEFAULT_COLUMN_LIST_ID?.trim();

  if (!columnListId) {
    return NextResponse.json(
      { error: "columnListId required in body or set BASECAMP_DEFAULT_COLUMN_LIST_ID." },
      { status: 400 },
    );
  }

  const bucketId = process.env.BASECAMP_BUCKET_ID;
  const cardTableId = process.env.BASECAMP_CARD_TABLE_ID;
  if (!bucketId || !cardTableId) {
    return NextResponse.json({ error: "BASECAMP_BUCKET_ID and BASECAMP_CARD_TABLE_ID must be set." }, { status: 500 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (task.basecampCardId) {
    return NextResponse.json({ error: "Task already linked to a Basecamp card.", cardId: task.basecampCardId }, { status: 409 });
  }

  try {
    const { accessToken, accountId } = await ensureFreshAccessToken();
    const content = buildCardContent({
      userStory: task.userStory,
      description: task.description,
      acceptanceCriteria: task.acceptanceCriteria,
      estimate: task.estimate,
      priority: task.priority,
    });

    const created = await createCard(accessToken, accountId, bucketId, columnListId, {
      title: task.title,
      content,
      notify: false,
    });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        basecampCardId: String(created.id),
        basecampColumnListId: columnListId,
        syncStatus: "synced",
        lastSyncedAt: new Date(),
        lastSyncError: null,
      },
    });

    return NextResponse.json({ ok: true, basecampCardId: String(created.id) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await prisma.task.update({
      where: { id: taskId },
      data: {
        syncStatus: "failed",
        lastSyncError: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
