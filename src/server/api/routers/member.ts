import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const optionalText = z
  .string()
  .trim()
  .max(120)
  .transform((s) => (s === "" ? null : s))
  .optional();

export const memberRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) => {
    return ctx.db.member.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { picks: true } } },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Even orcs have names").max(60),
        favouriteMilk: optionalText,
        excuse: optionalText,
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.member.create({ data: input });
    }),

  /** Soft delete, so their shameful history survives. */
  retire: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.member.update({
        where: { id: input.id },
        data: { active: false },
      });
    }),
});
