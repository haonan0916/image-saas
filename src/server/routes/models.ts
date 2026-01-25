import { protectedProcedure, router } from "../trpc";
import { db } from "../db/db";
import { v4 as uuid } from "uuid";
import { models, dehazeTasks } from "../db/schema";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";

const createModelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum(["system", "custom"]).default("custom"),
  category: z.enum(["general", "high_fidelity", "fast_processing"]),
  version: z.string().max(50).default("1.0.0"),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().positive().optional(),
  format: z.enum(["pth", "onnx", "pb"]).optional(),
  isDefault: z.boolean().default(false),
  appId: z.string().uuid(),
});

const updateModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(["general", "high_fidelity", "fast_processing"]).optional(),
  version: z.string().max(50).optional(),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().positive().optional(),
  format: z.enum(["pth", "onnx", "pb"]).optional(),
  isDefault: z.boolean().optional(),
});

export const modelsRouters = router({
  // 创建模型
  createModel: protectedProcedure
    .input(createModelSchema)
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
        const modelCount = await db
          .select({ count: count(models.id) })
          .from(models)
          .where(
            and(
              eq(models.userId, ctx.session.user.id),
              isNull(models.deletedAt)
            )
          );

        if (modelCount[0].count >= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan allows maximum 1 model file",
          });
        }
      }

      // 如果设置为默认模型，需要先取消其他默认模型
      if (input.isDefault) {
        await db
          .update(models)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(models.appId, input.appId),
              eq(models.isDefault, true),
              isNull(models.deletedAt)
            )
          );
      }

      const result = await db
        .insert(models)
        .values({
          id: uuid(),
          name: input.name,
          description: input.description,
          type: input.type,
          category: input.category,
          version: input.version,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          format: input.format,
          isDefault: input.isDefault,
          appId: input.appId,
          userId: ctx.session.user.id,
        })
        .returning();

      return result[0];
    }),

  // 获取模型列表
  listModels: protectedProcedure
    .input(
      z.object({
        appId: z.string().uuid(),
        type: z.enum(["system", "custom", "all"]).default("all"),
        category: z.enum(["general", "high_fidelity", "fast_processing", "all"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(models.appId, input.appId),
        eq(models.userId, ctx.session.user.id),
        isNull(models.deletedAt),
      ];

      if (input.type !== "all") {
        whereConditions.push(eq(models.type, input.type));
      }

      if (input.category !== "all") {
        whereConditions.push(eq(models.category, input.category));
      }

      return db.query.models.findMany({
        where: and(...whereConditions),
        orderBy: [desc(models.isDefault), desc(models.createdAt)],
        with: {
          app: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  // 获取单个模型详情
  getModel: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const model = await db.query.models.findFirst({
        where: (models, { eq, and, isNull }) =>
          and(
            eq(models.id, input),
            eq(models.userId, ctx.session.user.id),
            isNull(models.deletedAt)
          ),
        with: {
          app: true,
        },
      });

      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }

      return model;
    }),

  // 获取默认模型
  getDefaultModel: protectedProcedure
    .input(z.string().uuid()) // appId
    .query(async ({ ctx, input }) => {
      const defaultModel = await db.query.models.findFirst({
        where: (models, { eq, and, isNull }) =>
          and(
            eq(models.appId, input),
            eq(models.userId, ctx.session.user.id),
            eq(models.isDefault, true),
            isNull(models.deletedAt)
          ),
        with: {
          app: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      return defaultModel;
    }),

  // 设置默认模型
  setDefaultModel: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      // 验证模型所有权
      const model = await db.query.models.findFirst({
        where: (models, { eq, and, isNull }) =>
          and(
            eq(models.id, input),
            eq(models.userId, ctx.session.user.id),
            isNull(models.deletedAt)
          ),
      });

      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found or access denied",
        });
      }

      await db.transaction(async (tx) => {
        // 取消同应用下的其他默认模型
        await tx
          .update(models)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(models.appId, model.appId),
              eq(models.isDefault, true),
              isNull(models.deletedAt)
            )
          );

        // 设置当前模型为默认
        await tx
          .update(models)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(models.id, input));
      });

      return { success: true };
    }),

  // 更新模型信息
  updateModel: protectedProcedure
    .input(updateModelSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 验证模型所有权
      const model = await db.query.models.findFirst({
        where: (models, { eq, and, isNull }) =>
          and(
            eq(models.id, id),
            eq(models.userId, ctx.session.user.id),
            isNull(models.deletedAt)
          ),
      });

      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found or access denied",
        });
      }

      // 如果要设置为默认模型，需要先取消其他默认模型
      if (updateData.isDefault === true) {
        await db
          .update(models)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(models.appId, model.appId),
              eq(models.isDefault, true),
              isNull(models.deletedAt)
            )
          );
      }

      const result = await db
        .update(models)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(models.id, id))
        .returning();

      return result[0];
    }),

  // 删除模型
  deleteModel: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      // 验证模型所有权
      const model = await db.query.models.findFirst({
        where: (models, { eq, and, isNull }) =>
          and(
            eq(models.id, input),
            eq(models.userId, ctx.session.user.id),
            isNull(models.deletedAt)
          ),
      });

      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found or access denied",
        });
      }

      // 检查是否有正在使用该模型的任务
      const activeTasks = await db.query.dehazeTasks.findMany({
        where: (dehazeTasks, { eq, and, inArray }) =>
          and(
            eq(dehazeTasks.modelId, input),
            inArray(dehazeTasks.status, ["pending", "processing"])
          ),
      });

      if (activeTasks.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete model with active tasks. Please wait for tasks to complete.",
        });
      }

      // 软删除模型
      await db
        .update(models)
        .set({ deletedAt: new Date() })
        .where(eq(models.id, input));

      return { success: true };
    }),

  // 获取模型统计信息
  getModelStats: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const model = await db.query.models.findFirst({
        where: (models, { eq, and, isNull }) =>
          and(
            eq(models.id, input),
            eq(models.userId, ctx.session.user.id),
            isNull(models.deletedAt)
          ),
      });

      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }

      // 统计使用该模型的任务数量
      const taskStats = await db
        .select({
          totalTasks: count(),
        })
        .from(dehazeTasks)
        .where(eq(dehazeTasks.modelId, input));

      // 统计各状态的任务数量
      const statusStats = await db.query.dehazeTasks.findMany({
        where: (dehazeTasks, { eq }) => eq(dehazeTasks.modelId, input),
        columns: {
          status: true,
        },
      });

      const statusCounts = statusStats.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        ...model,
        stats: {
          totalTasks: taskStats[0]?.totalTasks || 0,
          statusCounts,
        },
      };
    }),

  // 获取模型类别列表
  getModelCategories: protectedProcedure.query(() => {
    return [
      {
        value: "general",
        label: "通用模型",
        description: "适用于大多数场景的通用去雾模型",
      },
      {
        value: "high_fidelity",
        label: "高保真模型",
        description: "注重图像质量和细节保持的模型",
      },
      {
        value: "fast_processing",
        label: "快速处理模型",
        description: "优化处理速度的轻量级模型",
      },
    ];
  }),

  // 获取支持的模型格式
  getSupportedFormats: protectedProcedure.query(() => {
    return [
      {
        value: "pth",
        label: "PyTorch (.pth)",
        description: "PyTorch 原生格式，支持完整的模型功能",
      },
      {
        value: "onnx",
        label: "ONNX (.onnx)",
        description: "开放神经网络交换格式，跨平台兼容",
      },
      {
        value: "pb",
        label: "TensorFlow (.pb)",
        description: "TensorFlow 保存的模型格式",
      },
    ];
  }),
});