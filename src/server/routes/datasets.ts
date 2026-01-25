import z from "zod";
import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db/db";
import { v4 as uuid } from "uuid";
import { datasets, datasetImages } from "../db/schema";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const createDatasetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum(["system", "custom"]).default("custom"),
  tags: z.array(z.string()).default([]),
  appId: z.string().uuid(),
});

const addImageToDatasetSchema = z.object({
  datasetId: z.string().uuid(),
  name: z.string().min(1).max(255),
  originalUrl: z.string().url(),
  processedUrl: z.string().url().optional(),
  contentType: z.string(),
  size: z.number().positive(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const datasetsRouters = router({
  // 为数据集图片创建预签名 URL
  createImagePresignedUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
        datasetId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证数据集所有权
      const dataset = await db.query.datasets.findFirst({
        where: (datasets, { eq, and, isNull }) =>
          and(
            eq(datasets.id, input.datasetId),
            eq(datasets.userId, ctx.session.user.id),
            isNull(datasets.deletedAt)
          ),
        with: {
          app: {
            with: {
              storage: true,
            },
          },
        },
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found or access denied",
        });
      }

      if (!dataset.app.storage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please configure storage settings first",
        });
      }

      // 免费计划限制检查
      if (ctx.plan === "free") {
        const totalImagesResult = await db
          .select({ count: count() })
          .from(datasetImages)
          .where(
            and(
              eq(datasetImages.userId, ctx.session.user.id),
              isNull(datasetImages.deletedAt)
            )
          );

        if (totalImagesResult[0].count >= 99) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan allows maximum 99 images across all datasets",
          });
        }
      }

      const date = new Date();
      const isoString = date.toISOString();
      const dateString = isoString.split("T")[0];
      const config = dataset.app.storage.configuration;

      const params: PutObjectCommandInput = {
        Bucket: config.bucket,
        Key: `datasets/${input.datasetId}/${dateString}/${input.filename.replaceAll(" ", "_")}`,
        ContentType: input.contentType,
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
      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });

      // 生成正确的文件访问URL
      let fileUrl: string;
      if (config.apiEndpoint) {
        // 处理自定义端点（如MinIO等）
        const endpoint = config.apiEndpoint.replace(/\/$/, ''); // 移除末尾斜杠
        // 检查是否已包含协议
        const hasProtocol = endpoint.startsWith('http://') || endpoint.startsWith('https://');
        const baseUrl = hasProtocol ? endpoint : `https://${endpoint}`;
        fileUrl = `${baseUrl}/${config.bucket}/${params.Key}`;
      } else {
        // 使用标准AWS S3 URL格式
        fileUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${params.Key}`;
      }

      return {
        url: signedUrl,
        method: "PUT" as const,
        fields: {},
        fileUrl,
      };
    }),

  // 创建数据集
  createDataset: protectedProcedure
    .input(createDatasetSchema)
    .mutation(async ({ ctx, input }) => {
      // 检查应用是否属于当前用户
      const app = await db.query.apps.findFirst({
        where: (apps, { eq, and, isNull }) =>
          and(
            eq(apps.id, input.appId),
            eq(apps.userId, ctx.session.user.id),
            isNull(apps.deletedAt)
          ),
      });

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App not found or access denied",
        });
      }

      // 免费计划限制检查
      if (ctx.plan === "free") {
        const datasetCount = await db
          .select({ count: count(datasets.id) })
          .from(datasets)
          .where(
            and(
              eq(datasets.userId, ctx.session.user.id),
              eq(datasets.appId, input.appId),
              isNull(datasets.deletedAt)
            )
          );

        if (datasetCount[0].count >= 3) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan allows maximum 3 datasets per app",
          });
        }
      }

      const result = await db
        .insert(datasets)
        .values({
          id: uuid(),
          name: input.name,
          description: input.description,
          type: input.type,
          tags: input.tags,
          appId: input.appId,
          userId: ctx.session.user.id,
        })
        .returning();

      return result[0];
    }),

  // 获取数据集列表
  listDatasets: protectedProcedure
    .input(
      z.object({
        appId: z.string().uuid(),
        type: z.enum(["system", "custom", "all"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(datasets.appId, input.appId),
        eq(datasets.userId, ctx.session.user.id),
        isNull(datasets.deletedAt),
      ];

      if (input.type !== "all") {
        whereConditions.push(eq(datasets.type, input.type));
      }

      return db.query.datasets.findMany({
        where: and(...whereConditions),
        orderBy: [desc(datasets.createdAt)],
        with: {
          images: {
            where: isNull(datasetImages.deletedAt),
            limit: 5, // 只获取前5张图片作为预览
          },
        },
      });
    }),

  // 获取单个数据集详情
  getDataset: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const dataset = await db.query.datasets.findFirst({
        where: (datasets, { eq, and, isNull }) =>
          and(
            eq(datasets.id, input),
            eq(datasets.userId, ctx.session.user.id),
            isNull(datasets.deletedAt)
          ),
        with: {
          app: {
            with: {
              storage: true,
            },
          },
          images: {
            where: isNull(datasetImages.deletedAt),
            orderBy: [desc(datasetImages.createdAt)],
          },
        },
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found",
        });
      }

      return dataset;
    }),

  // 添加图片到数据集
  addImageToDataset: protectedProcedure
    .input(addImageToDatasetSchema)
    .mutation(async ({ ctx, input }) => {
      // 验证数据集所有权
      const dataset = await db.query.datasets.findFirst({
        where: (datasets, { eq, and, isNull }) =>
          and(
            eq(datasets.id, input.datasetId),
            eq(datasets.userId, ctx.session.user.id),
            isNull(datasets.deletedAt)
          ),
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found or access denied",
        });
      }

      // 免费计划限制检查
      if (ctx.plan === "free") {
        // 检查用户所有数据集的总图片数量
        const totalImagesResult = await db
          .select({ count: count() })
          .from(datasetImages)
          .where(
            and(
              eq(datasetImages.userId, ctx.session.user.id),
              isNull(datasetImages.deletedAt)
            )
          );

        if (totalImagesResult[0].count >= 99) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan allows maximum 99 images across all datasets",
          });
        }
      }

      const result = await db
        .insert(datasetImages)
        .values({
          id: uuid(),
          name: input.name,
          originalUrl: input.originalUrl,
          processedUrl: input.processedUrl,
          contentType: input.contentType,
          size: input.size,
          width: input.width,
          height: input.height,
          datasetId: input.datasetId,
          userId: ctx.session.user.id,
        })
        .returning();

      // 更新数据集的图片计数
      await db
        .update(datasets)
        .set({
          imageCount: dataset.imageCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(datasets.id, input.datasetId));

      return result[0];
    }),

  // 从数据集删除图片
  removeImageFromDataset: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const image = await db.query.datasetImages.findFirst({
        where: (datasetImages, { eq, and, isNull }) =>
          and(
            eq(datasetImages.id, input),
            eq(datasetImages.userId, ctx.session.user.id),
            isNull(datasetImages.deletedAt)
          ),
        with: {
          dataset: true,
        },
      });

      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Image not found or access denied",
        });
      }

      // 软删除图片
      await db
        .update(datasetImages)
        .set({ deletedAt: new Date() })
        .where(eq(datasetImages.id, input));

      // 更新数据集的图片计数
      await db
        .update(datasets)
        .set({
          imageCount: Math.max(0, image.dataset.imageCount - 1),
          updatedAt: new Date(),
        })
        .where(eq(datasets.id, image.datasetId));

      return { success: true };
    }),

  // 更新数据集信息
  updateDataset: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 验证数据集所有权
      const dataset = await db.query.datasets.findFirst({
        where: (datasets, { eq, and, isNull }) =>
          and(
            eq(datasets.id, id),
            eq(datasets.userId, ctx.session.user.id),
            isNull(datasets.deletedAt)
          ),
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found or access denied",
        });
      }

      const result = await db
        .update(datasets)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(datasets.id, id))
        .returning();

      return result[0];
    }),

  // 删除数据集
  deleteDataset: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      // 验证数据集所有权
      const dataset = await db.query.datasets.findFirst({
        where: (datasets, { eq, and, isNull }) =>
          and(
            eq(datasets.id, input),
            eq(datasets.userId, ctx.session.user.id),
            isNull(datasets.deletedAt)
          ),
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found or access denied",
        });
      }

      // 软删除数据集和相关图片
      await db.transaction(async (tx) => {
        // 删除数据集中的所有图片
        await tx
          .update(datasetImages)
          .set({ deletedAt: new Date() })
          .where(eq(datasetImages.datasetId, input));

        // 删除数据集
        await tx
          .update(datasets)
          .set({ deletedAt: new Date() })
          .where(eq(datasets.id, input));
      });

      return { success: true };
    }),

  // 获取数据集统计信息
  getDatasetStats: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const dataset = await db.query.datasets.findFirst({
        where: (datasets, { eq, and, isNull }) =>
          and(
            eq(datasets.id, input),
            eq(datasets.userId, ctx.session.user.id),
            isNull(datasets.deletedAt)
          ),
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found",
        });
      }

      const imageStats = await db
        .select({
          totalImages: count(datasetImages.id),
        })
        .from(datasetImages)
        .where(
          and(
            eq(datasetImages.datasetId, input),
            isNull(datasetImages.deletedAt)
          )
        );

      // 计算总大小
      const sizeResult = await db
        .select({
          totalSize: datasetImages.size,
        })
        .from(datasetImages)
        .where(
          and(
            eq(datasetImages.datasetId, input),
            isNull(datasetImages.deletedAt)
          )
        );

      const totalSize = sizeResult.reduce((sum, item) => sum + (item.totalSize || 0), 0);

      return {
        ...dataset,
        stats: {
          totalImages: imageStats[0]?.totalImages || 0,
          totalSize,
        },
      };
    }),
});