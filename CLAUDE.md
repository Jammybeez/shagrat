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
  - `src/middleware.ts` blocks every route except `/login`, `/join` and static assets. `public/shagrat/`
    (the sticker PNGs) and `public/avatars/` are also exempt, because the `next/image` optimiser
    fetches them without the cookie.
  - tRPC also checks the cookie: every procedure is `protectedProcedure` (`src/server/api/trpc.ts`).
  - Login and logout are server actions in `src/app/login/actions.ts`. A wrong password waits 1s before failing.
  - **Invite link:** `/join?key=<SITE_INVITE_KEY>` (`src/app/join/route.ts`) sets the same session
    cookie with one tap. It exists because the team shares access through a WhatsApp/Signal group.
    A bad key waits 1s and redirects to `/login?invite=bad`. It is disabled if the key is unset.
    To revoke it, change the key, plus `AUTH_SECRET` to log out existing sessions.
- **SQLite on purpose**, for zero setup. That means hosting needs a persistent disk (VPS, Fly volume,
  Railway). It does not work on serverless Vercel.
- **The pick is lazy, not cron-driven.** `ensureCurrentPick` in `src/server/picker.ts` runs when
  `pick.current` is read. If the current week (keyed by the Sunday that starts it, `YYYY-MM-DD`,
  computed in `SHAGRAT_TIMEZONE`, default Europe/London) has no `Pick` row, it creates one. If two
  first visitors race, the unique `(weekOf, round)` constraint rejects the second insert (P2002), which then
  re-reads the winner's pick.
- **The pick goes to whoever bought longest ago:** members who have never bought come first. Ties
  are broken at random, and last week's buyer is excluded when anyone else is available. It is not
  "fewest picks", because that would hand every week to newcomers until they caught up.
- **Re-roll** ("They're on holiday", one link per buyer) deletes that buyer's pick for the current
  week and re-chooses the same round, avoiding the person being replaced. The other buyers are kept.
- **"More milk now!"** adds extra buyers to the current week. `Pick.round` is 0 for the Sunday pick
  and 1, 2, ... for extras; `(weekOf, round)` is unique, which is what catches the first-visitor race.
  Extras use the same longest-ago rule, never pick someone already buying that week, and count as a
  purchase. The big wheel is for round 0; extras get a small second wheel whose slices leave out
  people already buying that week.
- **Members are soft-deleted** ("Banish" sets `active = false`) so the history in the "Hall of Shame"
  survives. Only `name` is required; `favouriteMilk`, `excuse` and `avatar` are optional.
- **Avatars** are a fixed set of 20 PNGs in `public/avatars/`, listed in `src/lib/avatars.ts`
  (which the server also uses to validate `Member.avatar`). A member without one shows their initial.
- **Header sticker:** `src/app/_components/sticker.tsx` shows a random one of 15 stickers from
  `public/shagrat/` on each request.
- **The Wheel of Doom is rigged.** `src/app/_components/wheel.tsx` animates a spin that lands on the
  buyer already chosen server-side. `dashboard.tsx` tracks which of this week's picks (Sunday pick,
  then extras) each viewer has watched spin, in localStorage as `shagrat:spun:<pickId>:<createdAt ms>` (the timestamp stops stale marks matching new picks after a DB reset). Each wheel
  targets the first pick of its kind the viewer hasn't watched and waits for a click. Unwatched buyers are hidden everywhere,
  including the Hall of Shame. A pick the viewer made themselves ("More milk now!", re-roll) spins
  straight away. The wheel is remounted with `key={pick.id}` for each target.
- `src/app/page.tsx` is `force-dynamic` because it depends on the cookie and the current date.
  Prerendering it broke the build.

## Env vars

See `.env.example`: `DATABASE_URL`, `SITE_PASSWORD`, `AUTH_SECRET` (16+ chars), `SITE_INVITE_KEY`
(optional, 16+ chars), `SHAGRAT_TIMEZONE`.
When adding a variable, update `src/env.js` too.

## Housekeeping

- Git: the `integration` branch, remote `Jammybeez/shagrat`. The T3 rewrite replaced an older
  create-next-app demo, which is still in history.
- The local `prisma/db.sqlite` may still hold smoke-test data (members Ugluk, Grishnakh, Gorbag and
  one pick). Wipe it with `npx prisma migrate reset` if the user agrees.
