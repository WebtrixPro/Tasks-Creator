import { NextResponse } from "next/server";

import { buildCardContent, createCard, updateCard } from "@/lib/basecamp";
import { ensureFreshAccessToken } from "@/lib/basecampConnection";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ taskId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { taskId } = await ctx.params;
  let body: { columnListId?: string; bucketId?: string; assigneeId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }
  
  const assigneeId = body.assigneeId?.trim() || null;

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

  // Accept bucketId from request body or fall back to env var
  const bucketId =
    typeof body.bucketId === "string" && body.bucketId.trim()
      ? body.bucketId.trim()
      : process.env.BASECAMP_BUCKET_ID;

  if (!bucketId) {
    return NextResponse.json(
      { error: "bucketId required in body or set BASECAMP_BUCKET_ID." },
      { status: 400 },
    );
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

    // Format end date as YYYY-MM-DD for Basecamp due_on field
    const dueOn = task.endDate 
      ? task.endDate.toISOString().split('T')[0] 
      : null;

    const created = await createCard(accessToken, accountId, bucketId, columnListId, {
      title: task.title,
      content,
      due_on: dueOn,
      notify: false,
    });

    // Assign the card to the selected team member if provided
    if (assigneeId) {
      await updateCard(accessToken, accountId, bucketId, String(created.id), {
        assignee_ids: [parseInt(assigneeId, 10)],
      });
    }

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
