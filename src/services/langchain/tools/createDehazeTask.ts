import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";
import { dehazeTasks } from "@/server/db/schema";
import { v4 as uuid } from "uuid";
import { batchTaskProcessor } from "@/server/services/batchTaskProcessor";
import { eq } from "drizzle-orm";

/**
 * 创建去雾任务
 * 注意：由于 Tool 运行在独立上下文中，这里简化了部分鉴权逻辑，假设调用前已验证用户身份
 * 在实际生产环境中，应该通过 Service 层复用 trpc 的逻辑
 */
export const createDehazeTaskTool = tool(
  async ({ name, datasetId, modelId, imageIds, appId, userId }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      // 1. 创建任务记录
      const result = await db
        .insert(dehazeTasks)
        .values({
          id: uuid(),
          name: name,
          status: "pending",
          datasetId: datasetId,
          modelId: modelId,
          inputImageIds: imageIds,
          outputImageIds: [],
          appId: appId,
          userId: userId,
        })
        .returning();

      const task = result[0];

      // 2. 触发异步批量处理
      // 注意：这里不会等待处理完成，只触发
      try {
        const batchId = await batchTaskProcessor.createBatchTask(
          task.id,
          imageIds,
          modelId
        );
        console.log(`[Agent] Started batch processing for task ${task.id} with batch ${batchId}`);
      } catch (error) {
        console.error('[Agent] Failed to start batch processing:', error);
        // 如果启动失败，更新任务状态
         await db
          .update(dehazeTasks)
          .set({
            status: 'failed',
            errorMessage: 'Failed to start batch processing',
            completedAt: new Date(),
          })
          .where(eq(dehazeTasks.id, task.id));
          
          return JSON.stringify({ error: "Task created but failed to start processing." });
      }

      return JSON.stringify({
        success: true,
        taskId: task.id,
        message: "Dehaze task created and processing started.",
        taskName: task.name
      });

    } catch (error) {
      console.error("[Agent] Error creating dehaze task:", error);
      return JSON.stringify({ error: "Failed to create dehaze task. Please check input IDs." });
    }
  },
  {
    name: "create_dehaze_task",
    description: "Create a new image dehazing task. Use this when the user wants to process/dehaze specific images.",
    schema: z.object({
      name: z.string().describe("A name for the task (e.g., 'Dehaze Task 1')"),
      datasetId: z.string().describe("The ID of the dataset containing the images"),
      modelId: z.string().describe("The ID of the AI model to use for dehazing"),
      imageIds: z.array(z.string()).describe("List of image IDs to process"),
      appId: z.string().describe("The ID of the current application context"),
      userId: z.string().describe("The ID of the user (injected by system)"),
    }),
  }
);
