import { protectedProcedure, router } from "../trpc";
import { createAppSchema } from "../db/validate-schema";
import { db } from "../db/db";
import { v4 as uuid } from "uuid";
import { apps, storageConfiguration } from "../db/schema";
import { desc } from "drizzle-orm";
import z from "zod";

export const storagesRouters = router({
  listStorages: protectedProcedure.query(async ({ ctx }) => {
    return db.query.storageConfiguration.findMany({
      where: (storages, { eq, and, isNull }) =>
        and(
          eq(storages.userId, ctx.session.user.id),
          isNull(storages.deletedAt)
        ),
    });
  }),

  createStorage: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(50),
        bucket: z.string(),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        region: z.string(),
        apiEndpoint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, ...configuration } = input;
      const result = await db.insert(storageConfiguration).values({
        name: name,
        configuration: configuration,
        userId: ctx.session.user.id,
      }).returning();
      return result[0];
    }),
});
