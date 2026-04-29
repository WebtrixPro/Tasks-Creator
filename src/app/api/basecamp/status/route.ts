import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  const row = await prisma.basecampConnection.findUnique({ where: { id: "default" } });
  if (!row) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    accountId: row.accountId,
    expiresAt: row.expiresAt.toISOString(),
  });
}
