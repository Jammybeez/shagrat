import { Suspense } from "react";

import { Dashboard } from "~/app/_components/dashboard";
import { Sticker } from "~/app/_components/sticker";
import { logout } from "~/app/login/actions";
import { api, HydrateClient } from "~/trpc/server";

// Depends on the session cookie and the current week, so never prerender.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Load this week's pick first so the history below already includes it.
  await api.pick.current.prefetch();
  void api.member.list.prefetch();
  void api.pick.history.prefetch();
  void api.pick.extras.prefetch();

  return (
    <HydrateClient>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-10 flex items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Sticker className="h-24 w-auto shrink-0 drop-shadow-[0_0_12px_rgba(185,28,28,0.45)] sm:h-32" />
            <div>
              <h1 className="font-display text-5xl font-bold tracking-wide text-ember sm:text-6xl">
                Shagrat
              </h1>
              <p className="mt-1 text-stone-400">
                Every Sunday, the Eye chooses who buys the milk. There are no appeals.
              </p>
            </div>
          </div>
          <form action={logout}>
            <button className="text-sm text-stone-500 hover:text-stone-300">Flee</button>
          </form>
        </header>

        <Suspense fallback={<p className="font-display text-stone-400">Consulting the Eye...</p>}>
          <Dashboard />
        </Suspense>
      </main>
    </HydrateClient>
  );
}
