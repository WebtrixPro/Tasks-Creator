import { NextResponse } from "next/server";

import { getCardTable } from "@/lib/basecamp";
import { ensureFreshAccessToken } from "@/lib/basecampConnection";

export async function GET() {
  const bucketId = process.env.BASECAMP_BUCKET_ID;
  const cardTableId = process.env.BASECAMP_CARD_TABLE_ID;
  if (!bucketId || !cardTableId) {
    return NextResponse.json({ error: "BASECAMP_BUCKET_ID and BASECAMP_CARD_TABLE_ID must be set." }, { status: 500 });
  }

  try {
    const { accessToken, accountId } = await ensureFreshAccessToken();
    const table = await getCardTable(accessToken, accountId, bucketId, cardTableId);
    const lists = (table.lists ?? []).map((l) => ({
      id: String(l.id),
      title: l.title,
      type: l.type,
    }));
    return NextResponse.json({ lists, cardTableTitle: table.title });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
