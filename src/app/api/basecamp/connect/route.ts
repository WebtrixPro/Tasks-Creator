import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.BASECAMP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "BASECAMP_CLIENT_ID is not configured." }, { status: 500 });
  }

  // Server-side: use APP_URL first, then NEXT_PUBLIC_APP_URL, then localhost fallback
  const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const redirectUri = process.env.BASECAMP_REDIRECT_URI?.trim() || `${baseUrl}/api/basecamp/callback`;

  const state = randomBytes(24).toString("hex");
  const url = new URL("https://launchpad.37signals.com/authorization/new");
  url.searchParams.set("type", "web_server");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("bc_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
