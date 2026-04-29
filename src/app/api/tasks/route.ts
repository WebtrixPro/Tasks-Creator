import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const importBatchId = searchParams.get("importBatchId");

  const tasks = await prisma.task.findMany({
    where: importBatchId ? { importBatchId } : undefined,
    orderBy: [{ createdAt: "desc" }, { ticketNumber: "asc" }],
    take: importBatchId ? undefined : 200,
    include: {
      importBatch: { select: { id: true, fileName: true, createdAt: true } },
    },
  });

  return NextResponse.json({ tasks });
}
