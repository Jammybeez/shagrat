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

function pickDecree(name: string) {
  const template = DECREES[Math.floor(Math.random() * DECREES.length)]!;
  return template.replaceAll("{name}", name);
}

/**
 * Chooses a buyer for `weekOf`. Fair-ish: picks randomly among the active members who have bought
 * the fewest times, avoiding last week's buyer (and `excludeId`) whenever anyone else is available.
 */
async function choose(db: Db, weekOf: string, excludeId?: number) {
  const members = await db.member.findMany({
    where: { active: true },
    include: { _count: { select: { picks: true } } },
  });
  if (members.length === 0) return null;

  const previous = await db.pick.findFirst({
    where: { weekOf: { lt: weekOf } },
    orderBy: { weekOf: "desc" },
  });

  let pool = members.filter(
    (m) => m.id !== previous?.memberId && m.id !== excludeId,
  );
  if (pool.length === 0) pool = members;

  const fewest = Math.min(...pool.map((m) => m._count.picks));
  pool = pool.filter((m) => m._count.picks === fewest);
  const chosen = pool[Math.floor(Math.random() * pool.length)]!;

  return db.pick.create({
    data: { weekOf, memberId: chosen.id, decree: pickDecree(chosen.name) },
    include: { member: true },
  });
}

/**
 * Returns this week's pick, making one if Sunday has come and gone without one. Lazy rather than
 * cron-driven, so the first visitor of the week triggers the choosing.
 */
export async function ensureCurrentPick(db: PrismaClient) {
  const weekOf = currentWeekOf();
  const existing = await db.pick.findUnique({
    where: { weekOf },
    include: { member: true },
  });
  if (existing) return existing;

  try {
    return await choose(db, weekOf);
  } catch (e) {
    // Two visitors raced to make the pick; the other one won.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return db.pick.findUnique({ where: { weekOf }, include: { member: true } });
    }
    throw e;
  }
}

/** Throws out this week's pick and chooses someone else. */
export async function rerollCurrentPick(db: PrismaClient) {
  const weekOf = currentWeekOf();
  return db.$transaction(async (tx) => {
    const existing = await tx.pick.findUnique({ where: { weekOf } });
    if (existing) await tx.pick.delete({ where: { id: existing.id } });
    return choose(tx, weekOf, existing?.memberId);
  });
}
