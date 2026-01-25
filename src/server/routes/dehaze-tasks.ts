import { protectedProcedure, router } from "../trpc";
import { db } from "../db/db";
import { v4 as uuid } from "uuid";
import { dehazeTasks } from "../db/schema";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { batchTaskProcessor } from "../services/batchTaskProcessor";
import { getServiceStatus } from "../startup";

const createDehazeTaskSchema = z.object({
  name: z.string().min(1).max(255),
  datasetId: z.string().uuid(),
  modelId: z.string().uuid(),
  inputImageIds: z.array(z.string().uuid()).min(1),
  appId: z.string().uuid(),
});

const updateTaskStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  outputImageIds: z.array(z.string().uuid()).optional(),
  processingTime: z.number().positive().optional(),
  errorMessage: z.string().optional(),
});

export const dehazeTasksRouters = router({
  // 创建去雾任务
  createDehazeTask: protectedProcedure
    .input(createDehazeTaskSchema)
    .mutation(async ({ ctx, input }) => {
      // 验证应用所有权
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

      // 验证数据集所有权
      const dataset = await db.query.datasets.findFirst({
        where: (datasets, { eq, and, isNull }) =>
          and(
            eq(datasets.id, input.datasetId),
            eq(datasets.userId, ctx.session.user.id),
            eq(datasets.appId, input.appId),
            isNull(datasets.deletedAt)
          ),
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found or access denied",
        });
      }

      // 验证模型所有权
      const model = await db.query.models.findFirst({
        where: (models, { eq, and, isNull }) =>
          and(
            eq(models.id, input.modelId),
            eq(models.userId, ctx.session.user.id),
            eq(models.appId, input.appId),
            isNull(models.deletedAt)
          ),
      });

      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found or access denied",
        });
      }

      // 验证输入图片是否属于指定数据集
      const validImages = await db.query.datasetImages.findMany({
        where: (datasetImages, { eq, and, isNull, inArray }) =>
          and(
            inArray(datasetImages.id, input.inputImageIds),
            eq(datasetImages.datasetId, input.datasetId),
            eq(datasetImages.userId, ctx.session.user.id),
            isNull(datasetImages.deletedAt)
          ),
      });

      if (validImages.length !== input.inputImageIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some input images are not valid or not found in the dataset",
        });
      }

      // 免费计划限制检查
      if (ctx.plan === "free") {
        const taskCount = await db
          .select({ count: count(dehazeTasks.id) })
          .from(dehazeTasks)
          .where(
            and(
              eq(dehazeTasks.userId, ctx.session.user.id),
              eq(dehazeTasks.appId, input.appId),
              inArray(dehazeTasks.status, ["pending", "processing"])
            )
          );

        if (taskCount[0].count >= 2) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan allows maximum 2 concurrent tasks per app",
          });
        }

        // 检查单次任务图片数量限制
        if (input.inputImageIds.length > 10) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan allows maximum 10 images per task",
          });
        }
      }

      const result = await db
        .insert(dehazeTasks)
        .values({
          id: uuid(),
          name: input.name,
          status: "pending",
          datasetId: input.datasetId,
          modelId: input.modelId,
          inputImageIds: input.inputImageIds,
          outputImageIds: [],
          appId: input.appId,
          userId: ctx.session.user.id,
        })
        .returning();

      const task = result[0];

      // 启动批量处理
      try {
        const batchId = await batchTaskProcessor.createBatchTask(
          task.id,
          input.inputImageIds,
          input.modelId
        );
        
        console.log(`Started batch processing for task ${task.id} with batch ${batchId}`);
      } catch (error) {
        console.error('Failed to start batch processing:', error);
        
        // 更新任务状态为失败
        await db
          .update(dehazeTasks)
          .set({
            status: 'failed',
            errorMessage: 'Failed to start batch processing',
            completedAt: new Date(),
          })
          .where(eq(dehazeTasks.id, task.id));
      }

      return task;
    }),

  // 获取任务列表
  listDehazeTasks: protectedProcedure
    .input(
      z.object({
        appId: z.string().uuid(),
        status: z.enum(["pending", "processing", "completed", "failed", "all"]).default("all"),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(dehazeTasks.appId, input.appId),
        eq(dehazeTasks.userId, ctx.session.user.id),
      ];

      if (input.status !== "all") {
        whereConditions.push(eq(dehazeTasks.status, input.status));
      }

      const tasks = await db.query.dehazeTasks.findMany({
        where: and(...whereConditions),
        orderBy: [desc(dehazeTasks.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          dataset: {
            columns: {
              id: true,
              name: true,
            },
          },
          model: {
            columns: {
              id: true,
              name: true,
              category: true,
            },
          },
          app: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 获取总数
      const totalCount = await db
        .select({ count: count() })
        .from(dehazeTasks)
        .where(and(...whereConditions));

      return {
        tasks,
        total: totalCount[0].count,
        hasMore: input.offset + input.limit < totalCount[0].count,
      };
    }),

  // 获取单个任务详情
  getDehazeTask: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const task = await db.query.dehazeTasks.findFirst({
        where: (dehazeTasks, { eq, and }) =>
          and(
            eq(dehazeTasks.id, input),
            eq(dehazeTasks.userId, ctx.session.user.id)
          ),
        with: {
          dataset: true,
          model: true,
          app: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // 获取输入图片详情
      const inputImages = await db.query.datasetImages.findMany({
        where: (datasetImages, { inArray, isNull, and }) =>
          and(
            inArray(datasetImages.id, task.inputImageIds),
            isNull(datasetImages.deletedAt)
          ),
      });

      // 获取输出图片详情（如果有）
      let outputImages: typeof inputImages = [];
      if (task.outputImageIds && task.outputImageIds.length > 0) {
        outputImages = await db.query.datasetImages.findMany({
          where: (datasetImages, { inArray, isNull, and }) =>
            and(
              inArray(datasetImages.id, task.outputImageIds!),
              isNull(datasetImages.deletedAt)
            ),
        });
      }

      return {
        ...task,
        inputImages,
        outputImages,
      };
    }),

  // 更新任务状态
  updateTaskStatus: protectedProcedure
    .input(updateTaskStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 验证任务所有权
      const task = await db.query.dehazeTasks.findFirst({
        where: (dehazeTasks, { eq, and }) =>
          and(
            eq(dehazeTasks.id, id),
            eq(dehazeTasks.userId, ctx.session.user.id)
          ),
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found or access denied",
        });
      }

      const updateFields: Record<string, string | number | Date | string[] | null> = {
        status: updateData.status,
      };

      if (updateData.outputImageIds) {
        updateFields.outputImageIds = updateData.outputImageIds;
      }

      if (updateData.processingTime) {
        updateFields.processingTime = updateData.processingTime;
      }

      if (updateData.errorMessage) {
        updateFields.errorMessage = updateData.errorMessage;
      }

      if (updateData.status === "completed") {
        updateFields.completedAt = new Date();
      }

      const result = await db
        .update(dehazeTasks)
        .set(updateFields)
        .where(eq(dehazeTasks.id, id))
        .returning();

      return result[0];
    }),

  // 取消任务
  cancelTask: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const task = await db.query.dehazeTasks.findFirst({
        where: (dehazeTasks, { eq, and }) =>
          and(
            eq(dehazeTasks.id, input),
            eq(dehazeTasks.userId, ctx.session.user.id)
          ),
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found or access denied",
        });
      }

      if (!["pending", "processing"].includes(task.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending or processing tasks can be cancelled",
        });
      }

      const result = await db
        .update(dehazeTasks)
        .set({
          status: "failed",
          errorMessage: "Task cancelled by user",
          completedAt: new Date(),
        })
        .where(eq(dehazeTasks.id, input))
        .returning();

      return result[0];
    }),

  // 重新运行任务
  retryTask: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const task = await db.query.dehazeTasks.findFirst({
        where: (dehazeTasks, { eq, and }) =>
          and(
            eq(dehazeTasks.id, input),
            eq(dehazeTasks.userId, ctx.session.user.id)
          ),
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found or access denied",
        });
      }

      if (task.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed tasks can be retried",
        });
      }

      const result = await db
        .update(dehazeTasks)
        .set({
          status: "pending",
          outputImageIds: [],
          processingTime: null,
          errorMessage: null,
          completedAt: null,
        })
        .where(eq(dehazeTasks.id, input))
        .returning();

      return result[0];
    }),

  // 获取任务统计
  getTaskStats: protectedProcedure
    .input(z.string().uuid()) // appId
    .query(async ({ ctx, input }) => {
      const stats = await db.query.dehazeTasks.findMany({
        where: (dehazeTasks, { eq, and }) =>
          and(
            eq(dehazeTasks.appId, input),
            eq(dehazeTasks.userId, ctx.session.user.id)
          ),
        columns: {
          status: true,
          processingTime: true,
          inputImageIds: true,
          outputImageIds: true,
        },
      });

      const statusCounts = stats.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalImages = stats.reduce((sum, task) => sum + task.inputImageIds.length, 0);
      const processedImages = stats.reduce((sum, task) => sum + (task.outputImageIds?.length || 0), 0);
      
      const completedTasks = stats.filter(task => task.status === "completed" && task.processingTime);
      const avgProcessingTime = completedTasks.length > 0 
        ? completedTasks.reduce((sum, task) => sum + (task.processingTime || 0), 0) / completedTasks.length
        : 0;

      return {
        statusCounts,
        totalTasks: stats.length,
        totalImages,
        processedImages,
        avgProcessingTime: Math.round(avgProcessingTime),
      };
    }),

  // 获取任务状态选项
  getTaskStatuses: protectedProcedure.query(() => {
    return [
      {
        value: "pending",
        label: "等待中",
        description: "任务已创建，等待处理",
        color: "gray",
      },
      {
        value: "processing",
        label: "处理中",
        description: "任务正在执行",
        color: "blue",
      },
      {
        value: "completed",
        label: "已完成",
        description: "任务成功完成",
        color: "green",
      },
      {
        value: "failed",
        label: "失败",
        description: "任务执行失败",
        color: "red",
      },
    ];
  }),

  // 获取服务状态
  getServiceStatus: protectedProcedure.query(() => {
    return getServiceStatus();
  }),
});