import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  addExtraPick,
  currentExtraPicks,
  ensureCurrentPick,
  rerollCurrentPick,
} from "~/server/picker";

export const pickRouter = createTRPCRouter({
  /** This week's Sunday buyer. Makes the pick on first read of the week. */
  current: protectedProcedure.query(({ ctx }) => ensureCurrentPick(ctx.db)),

  /** Extra buyers summoned this week with "More milk now!". */
  extras: protectedProcedure.query(({ ctx }) => currentExtraPicks(ctx.db)),

  history: protectedProcedure.query(({ ctx }) => {
    return ctx.db.pick.findMany({
      orderBy: [{ weekOf: "desc" }, { round: "asc" }],
      take: 12,
      include: { member: true },
    });
  }),

  /** "They're on holiday": replaces one of this week's buyers. */
  reroll: protectedProcedure
    .input(z.object({ round: z.number().int().min(0) }))
    .mutation(({ ctx, input }) => rerollCurrentPick(ctx.db, input.round)),

  more: protectedProcedure.mutation(async ({ ctx }) => {
    const pick = await addExtraPick(ctx.db);
    if (pick === "clash") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Another orc demanded milk at the same moment. Look again.",
      });
    }
    if (!pick) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Every orc in the warband is already fetching milk. There is no one left to send.",
      });
    }
    return pick;
  }),
});
