import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ensureCurrentPick, rerollCurrentPick } from "~/server/picker";

export const pickRouter = createTRPCRouter({
  /** This week's buyer. Makes the pick on first read of the week. */
  current: protectedProcedure.query(({ ctx }) => ensureCurrentPick(ctx.db)),

  history: protectedProcedure.query(({ ctx }) => {
    return ctx.db.pick.findMany({
      orderBy: { weekOf: "desc" },
      take: 12,
      include: { member: true },
    });
  }),

  reroll: protectedProcedure.mutation(({ ctx }) => rerollCurrentPick(ctx.db)),
});
