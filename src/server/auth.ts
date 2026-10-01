/**
 * Minimal shared-password auth.
 *
 * Anyone who knows SITE_PASSWORD gets a session cookie of the form `<expiry>.<hmac>`, where the
 * HMAC is over the expiry using AUTH_SECRET. Uses Web Crypto so it runs in both the edge middleware
 * and Node.
 */
import { env } from "~/env";

export const SESSION_COOKIE = "shagrat_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string) {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < Math.max(ab.length, bb.length); i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export function checkPassword(attempt: string) {
  return safeEqual(attempt, env.SITE_PASSWORD);
}

/** For the /join invite link. Always false when SITE_INVITE_KEY isn't set. */
export function checkInviteKey(attempt: string) {
  return !!env.SITE_INVITE_KEY && safeEqual(attempt, env.SITE_INVITE_KEY);
}

export async function createSessionToken() {
  const expiry = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiry}.${await hmac(expiry)}`;
}

/** A fresh session cookie, ready for `cookies().set(...)`. */
export async function newSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) return false;
  const [expiry, sig] = token.split(".");
  if (!expiry || !sig) return false;
  if (!safeEqual(sig, await hmac(expiry))) return false;
  return Number(expiry) > Date.now();
}

/** Pulls the session cookie out of a raw Cookie header. */
export function readSessionCookie(cookieHeader: string | null) {
  return cookieHeader
    ?.split(";")
    .map((c) => c.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE)?.[1];
}
