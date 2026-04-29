import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Handle OAuth callback at root URL
  // When Basecamp redirects to https://tasks-creator-orcin.vercel.app/?code=xxx&state=yyy
  // Forward it to /api/basecamp/callback with the same query params
  if (pathname === "/" && searchParams.has("code") && searchParams.has("state")) {
    const callbackUrl = new URL("/api/basecamp/callback", request.url);
    callbackUrl.search = searchParams.toString();
    return NextResponse.redirect(callbackUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
