import z from "zod";
import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAppProcedure, router } from "../trpc";
import { db } from "../db/db";
import { apps, files } from "../db/schema";
import { v4 as uuid } from "uuid";
import { asc, desc, eq, isNull, sql, and, count } from "drizzle-orm";
import { filesCanOrderByColumns } from "../db/validate-schema";
import { TRPCError } from "@trpc/server";

const filesOrderByColumnSchema = z
  .object({
    field: filesCanOrderByColumns.keyof(),
    order: z.enum(["desc", "asc"]),
  })
  .optional();

export type filesOrderByColumn = z.infer<typeof filesOrderByColumnSchema>;

export const fileOpenRoutes = router({
  createPresignedUrl: withAppProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const date = new Date();
      const isoString = date.toISOString();
      const dateString = isoString.split("T")[0];
      const { app, user } = ctx;
      const isFreePlan = user.plan === "free";
      if (!app || !app.storage)
        throw new TRPCError({
          code: "BAD_REQUEST",
        });

      if (app.userId !== ctx.user.id)
        throw new TRPCError({
          code: "FORBIDDEN",
        });

      const alreadyUploadedFilesCountResult = await db
        .select({ count: count() })
        .from(apps)
        .where(and(eq(apps.id, app.id), isNull(apps.deletedAt)));

      const counter = alreadyUploadedFilesCountResult[0].count;
      if (isFreePlan && counter >= 100) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You have uploaded 100 files, please upgrade your plan",
        });
      }
      const config = app.storage.configuration;

      const params: PutObjectCommandInput = {
        Bucket: config.bucket,
        Key: `${dateString}/${input.filename.replaceAll(" ", "_")}`,
        ContentType: input.contentType,
        ContentLength: input.size,
      };
      const s3Client = new S3Client({
        endpoint: config.apiEndpoint,
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
      const command = new PutObjectCommand(params);
      const url = await getSignedUrl(s3Client, command, {
        expiresIn: 60,
      });

      return {
        url,
        method: "PUT" as const,
      };
    }),
  saveFile: withAppProcedure
    .input(
      z.object({
        name: z.string(),
        path: z.string(),
        type: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, app } = ctx;
      const url = new URL(input.path);

      const photo = await db
        .insert(files)
        .values({
          ...input,
          appId: app.id,
          id: uuid(),
          path: url.pathname,
          url: url.toString(),
          userId: user.id,
          contentType: input.type,
        })
        .returning();
      console.log(photo);

      return photo[0];
    }),

  listFile: withAppProcedure
    .input(
      z.object({
        appId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query.files.findMany({
        orderBy: [desc(files.createdAt)],
        where: (files, { eq, and }) =>
          and(eq(files.userId, ctx.user.id), eq(files.appId, input.appId)),
      });

      return result;
    }),

  infinityQueryFiles: withAppProcedure
    .input(
      z.object({
        cursor: z
          .object({
            createdAt: z.string(),
            id: z.string(),
          })
          .optional(),
        limit: z.number().default(10),
        orderBy: filesOrderByColumnSchema,
        appId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const {
        cursor,
        limit,
        orderBy = { field: "createdAt", order: "desc" },
        appId,
      } = input;

      const deleteFilter = isNull(files.deletedAt);
      const userFilter = eq(files.userId, ctx.user.id);
      const appFilter = eq(files.appId, appId);

      let whereCondition = and(deleteFilter, userFilter, appFilter);

      if (cursor) {
        const cursorCondition =
          orderBy.order === "desc"
            ? and(
                sql`(date_trunc('milliseconds', ${files.createdAt}), ${
                  files.id
                }) < (${new Date(cursor.createdAt).toISOString()}, ${
                  cursor.id
                })`
              )
            : and(
                sql`(date_trunc('milliseconds', ${files.createdAt}), ${
                  files.id
                }) > (${new Date(cursor.createdAt).toISOString()}, ${
                  cursor.id
                })`
              );

        whereCondition = and(whereCondition, cursorCondition);
      }

      const result = await db
        .select()
        .from(files)
        .limit(limit)
        .where(whereCondition)
        .orderBy(
          orderBy.order === "desc"
            ? desc(files[orderBy.field])
            : asc(files[orderBy.field]),
          orderBy.order === "desc"
            ? desc(files.id)
            : asc(files.id)
            ? sql`${files.id} desc`
            : sql`${files.id} asc`
        );

      return {
        items: result,
        nextCursor:
          result.length > 0
            ? {
                createdAt: result[result.length - 1].createdAt!,
                id: result[result.length - 1].id,
              }
            : null,
      };
    }),

  deleteFile: withAppProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return db
        .update(files)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(files.id, input));
    }),
});
