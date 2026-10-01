"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { checkPassword, newSessionCookie, SESSION_COOKIE } from "~/server/auth";

export async function login(_prev: string | null, formData: FormData) {
  const password = formData.get("password");
  if (typeof password !== "string" || !checkPassword(password)) {
    // Slow down anyone guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return "That is not the word, maggot. The gate stays shut.";
  }

  (await cookies()).set(await newSessionCookie());
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
