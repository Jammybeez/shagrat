# Shagrat

> *"Shagrat has spoken."*

Shagrat, Captain of the Tower of Cirith Ungol, decides who buys the milk for the team each week.
There are no appeals.

Built with the [T3 Stack](https://create.t3.gg/): Next.js, tRPC, Prisma (SQLite) and Tailwind.

## How it works

- **The gate**: the whole site sits behind one shared team password (`SITE_PASSWORD`). Entering it
  sets a signed, httpOnly cookie that lasts 30 days.
- **The warband**: anyone can add a member. Only the name is required; favourite milk and signature
  excuse are optional. "Banishing" a member removes them from the rota but keeps their history.
- **The choosing**: each week starts on Sunday (in `SHAGRAT_TIMEZONE`). The first visit of the week
  picks a buyer, so no cron job is needed. Picks are fair-ish: the buyer is chosen at random from the
  members who have bought the fewest times, and last week's buyer is skipped whenever possible.
- **The Wheel of Doom**: purely theatrical. It is rigged to land on the buyer who has already been
  chosen.
- **Re-roll**: if the victim is on holiday, anyone can re-roll this week's pick.

## Getting started

```bash
cp .env.example .env      # then set SITE_PASSWORD and AUTH_SECRET
npm install
npm run db:migrate        # applies prisma/migrations to the SQLite db
npm run dev
```

Generate an `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Deploying

SQLite needs a persistent disk, so host it somewhere with one (a VPS, Fly.io with a volume,
Railway, etc.), not on serverless Vercel. Run `npm run db:migrate && npm run build && npm start`.
