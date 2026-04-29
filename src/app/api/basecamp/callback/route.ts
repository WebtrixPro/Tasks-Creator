import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { exchangeAuthorizationCode } from "@/lib/basecamp";
import { saveTokensFromOAuth } from "@/lib/basecampConnection";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  if (err) {
    return NextResponse.redirect(`${base}/?bc_error=${encodeURIComponent(err)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${base}/?bc_error=${encodeURIComponent("missing_code_or_state")}`);
  }

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("bc_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${base}/?bc_error=${encodeURIComponent("invalid_state")}`);
  }

  const redirectUri =
    process.env.BASECAMP_REDIRECT_URI?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000"}/api/basecamp/callback`;

  try {
    const tokens = await exchangeAuthorizationCode(code, redirectUri);
    await saveTokensFromOAuth(tokens.access_token, tokens.refresh_token, tokens.expires_in);
  } catch (e) {
    const message = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(`${base}/?bc_error=${encodeURIComponent(message)}`);
  }

  const res = NextResponse.redirect(`${base}/?bc_connected=1`);
  res.cookies.set("bc_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
