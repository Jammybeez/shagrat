"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "~/env";
import {
  checkPassword,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "~/server/auth";

export async function login(_prev: string | null, formData: FormData) {
  const password = formData.get("password");
  if (typeof password !== "string" || !checkPassword(password)) {
    // Slow down anyone guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return "That is not the word, maggot. The gate stays shut.";
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
