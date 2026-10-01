# Shagrat

A deliberately silly team app that decides who buys the milk each week, themed on Shagrat, the orc
captain of Cirith Ungol from LOTR. Keep the tone non-serious: orc and Mordor jokes in UI copy, error
messages and decrees.

Stack: create-t3-app (Next.js 15 App Router, tRPC 11, Prisma 6 with SQLite, Tailwind 4). No NextAuth.

## Commands

- `npm run dev`: dev server
- `npm run typecheck` / `npm run build`: run both before calling a change done
- `npm run db:generate`: create a new migration after editing `prisma/schema.prisma` (`prisma migrate dev`)
- `npm run db:migrate`: apply migrations (`prisma migrate deploy`)

The Prisma client is generated into `/generated/prisma`, which is gitignored and rebuilt on `postinstall`.

## Design decisions (and why)

- **Auth is one shared team password**, not per-user accounts, because the user asked for "basic
  security". `SITE_PASSWORD` unlocks the site. The session cookie is `<expiry>.<HMAC-SHA256(expiry, AUTH_SECRET)>`
  and lasts 30 days. The logic is in `src/server/auth.ts`, which uses Web Crypto and `btoa` (not
  `Buffer`) because it also runs in the edge middleware.
  - `src/middleware.ts` blocks every route except `/login` and static assets.
  - tRPC also checks the cookie: every procedure is `protectedProcedure` (`src/server/api/trpc.ts`).
  - Login and logout are server actions in `src/app/login/actions.ts`. A wrong password waits 1s before failing.
- **SQLite on purpose**, for zero setup. That means hosting needs a persistent disk (VPS, Fly volume,
  Railway). It does not work on serverless Vercel.
- **The pick is lazy, not cron-driven.** `ensureCurrentPick` in `src/server/picker.ts` runs when
  `pick.current` is read. If the current week (keyed by the Sunday that starts it, `YYYY-MM-DD`,
  computed in `SHAGRAT_TIMEZONE`, default Europe/London) has no `Pick` row, it creates one. If two
  first visitors race, the unique `weekOf` constraint rejects the second insert (P2002), which then
  re-reads the winner's pick.
- **The pick is fair-ish:** random among the active members with the fewest picks, excluding last
  week's buyer when anyone else is available.
- **Re-roll** deletes the current week's pick and re-chooses, excluding the previous buyer (for when
  they're on holiday).
- **Members are soft-deleted** ("Banish" sets `active = false`) so the history in the "Hall of Shame"
  survives. Only `name` is required; `favouriteMilk` and `excuse` are optional.
- **The Wheel of Doom is rigged.** `src/app/_components/wheel.tsx` animates a spin that lands on the
  buyer already chosen server-side. Each viewer sees the spin once per pick (tracked in localStorage
  as `shagrat:spun:<pickId>`); after that it shows the result straight away. It is remounted with
  `key={pick.id}` so a re-roll spins again.
- `src/app/page.tsx` is `force-dynamic` because it depends on the cookie and the current date.
  Prerendering it broke the build.

## Env vars

See `.env.example`: `DATABASE_URL`, `SITE_PASSWORD`, `AUTH_SECRET` (16+ chars), `SHAGRAT_TIMEZONE`.
When adding a variable, update `src/env.js` too.

## Housekeeping

- Git: the `integration` branch, remote `Jammybeez/shagrat`. The T3 rewrite replaced an older
  create-next-app demo, which is still in history.
- The local `prisma/db.sqlite` may still hold smoke-test data (members Ugluk, Grishnakh, Gorbag and
  one pick). Wipe it with `npx prisma migrate reset` if the user agrees.
