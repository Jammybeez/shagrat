import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "~/server/auth";

/** Turns away anyone without a valid session cookie. */
export async function middleware(req: NextRequest) {
  const authed = await verifySessionToken(
    req.cookies.get(SESSION_COOKIE)?.value,
  );
  if (authed) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorised, maggot" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
