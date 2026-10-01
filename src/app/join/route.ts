import { NextResponse, type NextRequest } from "next/server";

import { checkInviteKey, newSessionCookie } from "~/server/auth";

/**
 * The invite link: /join?key=<SITE_INVITE_KEY>. Posted in the team chat so people can get in with
 * one tap instead of typing the password. A bad key lands on the login page with a telling-off.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!checkInviteKey(key)) {
    // Slow down anyone guessing, same as a wrong password.
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.redirect(new URL("/login?invite=bad", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(await newSessionCookie());
  return res;
}
