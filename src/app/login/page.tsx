"use client";

import { useActionState, useEffect, useState } from "react";

import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  // Set by /join when someone arrives with a bad or out-of-date invite link.
  const [badInvite, setBadInvite] = useState(false);
  useEffect(() => {
    setBadInvite(new URLSearchParams(window.location.search).get("invite") === "bad");
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold tracking-wide text-ember sm:text-6xl">
          Shagrat
        </h1>
        <p className="mt-2 text-stone-400">Keeper of the Tower. Decider of Milk.</p>
      </div>

      <form
        action={action}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-red-900/60 bg-stone-900/80 p-6 shadow-[0_0_40px_-10px] shadow-red-700/40"
      >
        <label htmlFor="password" className="font-display text-lg text-stone-200">
          Speak, friend, and enter
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="rounded-md border border-stone-700 bg-stone-950 px-4 py-2 text-stone-100 outline-none focus:border-ember"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-800 px-4 py-2 font-semibold text-stone-100 transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "The gate creaks..." : "Enter Cirith Ungol"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {badInvite && !error && (
          <p className="text-sm text-red-400">
            That invite is forged or stale, maggot. Ask the warband for a fresh one, or speak the
            password.
          </p>
        )}
      </form>
    </main>
  );
}
