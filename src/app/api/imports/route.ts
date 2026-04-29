import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { hashMarkdown, parseTicketMarkdown } from "@/lib/parseTickets";

const MAX_BYTES = 512 * 1024;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object." }, { status: 400 });
  }

  const markdown = typeof (body as { markdown?: unknown }).markdown === "string" ? (body as { markdown: string }).markdown : null;
  const fileName =
    typeof (body as { fileName?: unknown }).fileName === "string" ? (body as { fileName: string }).fileName : null;

  if (!markdown) {
    return NextResponse.json({ error: "Field `markdown` (string) is required." }, { status: 400 });
  }

  const bytes = Buffer.byteLength(markdown, "utf8");
  if (bytes > MAX_BYTES) {
    return NextResponse.json({ error: `Markdown exceeds ${MAX_BYTES} bytes.` }, { status: 413 });
  }

  const { tasks, warnings } = parseTicketMarkdown(markdown);
  if (tasks.length === 0) {
    return NextResponse.json({ error: "No tickets parsed.", warnings }, { status: 422 });
  }

  const contentHash = hashMarkdown(markdown);

  const batch = await prisma.$transaction(async (tx) => {
    const b = await tx.importBatch.create({
      data: {
        fileName: fileName ?? null,
        contentHash,
        rawMarkdown: markdown,
      },
    });

    for (const t of tasks) {
      await tx.task.create({
        data: {
          importBatchId: b.id,
          ticketNumber: t.ticketNumber,
          title: t.title,
          userStory: t.userStory,
          description: t.description,
          acceptanceCriteria: t.acceptanceCriteria,
          estimate: t.estimate,
          priority: t.priority,
          startDate: t.startDate,
          endDate: t.endDate,
        },
      });
    }

    return b;
  });

  return NextResponse.json({
    importBatchId: batch.id,
    taskCount: tasks.length,
    warnings,
  });
}
