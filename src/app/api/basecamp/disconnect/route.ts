import { NextResponse } from "next/server";

import { disconnectBasecamp } from "@/lib/basecampConnection";

export async function POST() {
  await disconnectBasecamp();
  return NextResponse.json({ ok: true });
}
