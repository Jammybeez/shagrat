import { env } from "~/env";
import { Prisma, type PrismaClient } from "../../generated/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

const DECREES = [
  "Shagrat has spoken. {name} fetches the milk, or answers to the Tower of Cirith Ungol.",
  "Gorbag wanted someone else to do it. Gorbag is no longer with us. {name} buys the milk.",
  "The Great Eye turns west... and settles upon {name}. Semi-skimmed, and be quick about it.",
  "Orders from Lugbúrz: {name} is on milk duty. No questions, no excuses, no mithril shirts.",
  "{name}! Get to the shops, you snivelling maggot, before the tea goes cold.",
  "One Pint to rule them all, and {name} shall bring it.",
  "The Nazgûl have been consulted. They screeched '{name}'. That's good enough for Shagrat.",
  "{name} has been volunteered. Volunteering is mandatory in Cirith Ungol.",
  "Shagrat rolled the bones of a Gondorian scout. They spell '{name}'. Off you go.",
  "By order of the Captain of the Tower: {name} is this week's milk-bearer. Do not drink it on the way back.",
];

/** Today's date (YYYY-MM-DD) and weekday index (0 = Sunday) in the configured timezone. */
function todayInZone(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.SHAGRAT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

/** The Sunday that starts the current week, as YYYY-MM-DD. */
export function currentWeekOf(now = new Date()) {
  const today = todayInZone(now);
  today.setUTCDate(today.getUTCDate() - today.getUTCDay());
  return today.toISOString().slice(0, 10);
}

const MORE_DECREES = [
  "The first pint was not enough. Shagrat demands more. {name}, to the shops!",
  "The warband is thirsty and the jug is dry. {name} is sent to refill it.",
  "More milk! MORE! {name}, you heard the Captain.",
  "One does not simply run out of milk. {name} will see to it.",
  "A second runner is needed, and {name} looked the least busy.",
];

function pickDecree(name: string, round: number) {
  const decrees = round === 0 ? DECREES : MORE_DECREES;
  const template = decrees[Math.floor(Math.random() * decrees.length)]!;
  return template.replaceAll("{name}", name);
}

const thisWeekWhere = (weekOf: string, round: number) => ({ weekOf_round: { weekOf, round } });

/**
 * Chooses a buyer for round `round` of `weekOf`: whoever bought milk longest ago, and anyone who
 * has never bought beats everyone. Ties are broken at random. Never picks someone already buying
 * this week. Avoids last week's Sunday buyer (and `excludeId`) whenever anyone else is available.
 * Returns null if nobody is left to send.
 */
async function choose(db: Db, weekOf: string, round: number, excludeId?: number) {
  const members = await db.member.findMany({ where: { active: true } });

  const lastBought = new Map(
    (
      await db.pick.groupBy({
        by: ["memberId"],
        where: { weekOf: { lt: weekOf } },
        _max: { weekOf: true },
      })
    ).map((g) => [g.memberId, g._max.weekOf]),
  );
  // "" sorts before every YYYY-MM-DD, so the never-bought come first.
  const lastOf = (id: number) => lastBought.get(id) ?? "";

  const buyingThisWeek = new Set(
    (await db.pick.findMany({ where: { weekOf } })).map((p) => p.memberId),
  );
  const previous = await db.pick.findFirst({
    where: { weekOf: { lt: weekOf }, round: 0 },
    orderBy: { weekOf: "desc" },
  });

  let pool = members.filter((m) => !buyingThisWeek.has(m.id));
  if (pool.length === 0) return null;
  const preferred = pool.filter(
    (m) => m.id !== previous?.memberId && m.id !== excludeId,
  );
  if (preferred.length > 0) pool = preferred;

  const longestAgo = pool.map((m) => lastOf(m.id)).sort()[0];
  pool = pool.filter((m) => lastOf(m.id) === longestAgo);
  const chosen = pool[Math.floor(Math.random() * pool.length)]!;

  return db.pick.create({
    data: { weekOf, round, memberId: chosen.id, decree: pickDecree(chosen.name, round) },
    include: { member: true },
  });
}

function isUniqueClash(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Returns this week's Sunday pick, making one if Sunday has come and gone without one. Lazy rather
 * than cron-driven, so the first visitor of the week triggers the choosing.
 */
export async function ensureCurrentPick(db: PrismaClient) {
  const weekOf = currentWeekOf();
  const existing = await db.pick.findUnique({
    where: thisWeekWhere(weekOf, 0),
    include: { member: true },
  });
  if (existing) return existing;

  try {
    return await choose(db, weekOf, 0);
  } catch (e) {
    // Two visitors raced to make the pick; the other one won.
    if (isUniqueClash(e)) {
      return db.pick.findUnique({ where: thisWeekWhere(weekOf, 0), include: { member: true } });
    }
    throw e;
  }
}

/** This week's extra buyers, in the order they were summoned. */
export function currentExtraPicks(db: PrismaClient) {
  return db.pick.findMany({
    where: { weekOf: currentWeekOf(), round: { gt: 0 } },
    orderBy: { round: "asc" },
    include: { member: true },
  });
}

/**
 * "More milk now!": sends one more member for milk this week. Returns null if everyone is already
 * buying, and "clash" if someone else summoned an extra buyer at the same moment.
 */
export async function addExtraPick(db: PrismaClient) {
  const main = await ensureCurrentPick(db);
  if (!main) return null;

  const last = await db.pick.findFirst({
    where: { weekOf: main.weekOf },
    orderBy: { round: "desc" },
  });
  try {
    return await choose(db, main.weekOf, (last?.round ?? 0) + 1);
  } catch (e) {
    if (isUniqueClash(e)) return "clash" as const;
    throw e;
  }
}

/**
 * Throws out one of this week's buyers (round 0 is the Sunday pick, 1+ the extras) and chooses
 * someone else for that slot. The other buyers are kept.
 */
export async function rerollCurrentPick(db: PrismaClient, round: number) {
  const weekOf = currentWeekOf();
  return db.$transaction(async (tx) => {
    const existing = await tx.pick.findUnique({ where: thisWeekWhere(weekOf, round) });
    if (!existing) return null;
    await tx.pick.delete({ where: { id: existing.id } });
    return choose(tx, weekOf, round, existing.memberId);
  });
}
