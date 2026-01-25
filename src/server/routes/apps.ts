import { protectedProcedure, router } from "../trpc";
import { createAppSchema } from "../db/validate-schema";
import { db } from "../db/db";
import { v4 as uuid } from "uuid";
import { apps } from "../db/schema";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import z from "zod";
import { TRPCError } from "@trpc/server";

export const appRouters = router({
  createApp: protectedProcedure
    .input(createAppSchema.pick({ name: true, description: true }))
    .mutation(async ({ ctx, input }) => {
      const isFreePlan = ctx.plan === "free";

      if (isFreePlan) {
        const appCountResult = await db
          .select({ count: count(apps.id) })
          .from(apps)
          .where(
            and(eq(apps.userId, ctx.session.user.id), isNull(apps.deletedAt))
          );

        const appCount = appCountResult[0].count;
        if (appCount >= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan only allows 1 app",
          });
        }
      }
      const result = await db
        .insert(apps)
        .values({
          id: uuid(),
          name: input.name,
          description: input.description,
          userId: ctx.session.user.id,
        })
        .returning();

      return result[0];
    }),

  listApps: protectedProcedure.query(async ({ ctx }) => {
    const result = await db.query.apps.findMany({
      where: (apps, { eq, and, isNull }) =>
        and(eq(apps.userId, ctx.session.user.id), isNull(apps.deletedAt)),
      orderBy: [desc(apps.createdAt)],
      with: {
        storage: true,
      },
    });

    return result;
  }),

  changeStorage: protectedProcedure
    .input(z.object({ appId: z.string(), storageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const storage = await db.query.storageConfiguration.findFirst({
        where: (storageConfiguration, { eq }) =>
          eq(storageConfiguration.id, input.storageId),
      });
      if (storage?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Storage not found",
        });
      }
      await db
        .update(apps)
        .set({
          storageId: input.storageId,
        })
        .where(
          and(eq(apps.id, input.appId), eq(apps.userId, ctx.session.user.id))
        );
    }),
});
