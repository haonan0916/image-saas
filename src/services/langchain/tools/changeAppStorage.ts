import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";
import { apps } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * 更改应用的存储配置
 */
export const changeAppStorageTool = tool(
  async ({ appId, storageId, userId }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      // 验证存储配置是否属于该用户
      const storage = await db.query.storageConfiguration.findFirst({
        where: (storageConfiguration, { eq }) =>
          eq(storageConfiguration.id, storageId),
      });

      if (!storage) {
        return JSON.stringify({
          error: "Storage configuration not found.",
        });
      }

      if (storage.userId !== userId) {
        return JSON.stringify({
          error: "You don't have permission to use this storage configuration.",
        });
      }

      // 验证应用是否属于该用户
      const app = await db.query.apps.findFirst({
        where: (apps, { eq, and, isNull }) =>
          and(eq(apps.id, appId), eq(apps.userId, userId), isNull(apps.deletedAt)),
      });

      if (!app) {
        return JSON.stringify({
          error: "Application not found or you don't have permission to modify it.",
        });
      }

      // 更新应用的存储配置
      await db
        .update(apps)
        .set({ storageId })
        .where(and(eq(apps.id, appId), eq(apps.userId, userId)));

      return JSON.stringify({
        success: true,
        applicationId: appId,
        applicationName: app.name,
        storageName: storage.name,
        message: `Storage configuration for "${app.name}" has been updated to "${storage.name}".`,
      });
    } catch (error) {
      console.error("[Agent] Error changing app storage:", error);
      return JSON.stringify({
        error: "Failed to change storage configuration. Please try again.",
      });
    }
  },
  {
    name: "change_app_storage",
    description: "Change the storage configuration for an application. Use this when the user wants to configure or change the storage settings for an app.",
    schema: z.object({
      appId: z.string().describe("The ID of the application"),
      storageId: z.number().describe("The ID of the storage configuration to use"),
      userId: z.string().describe("The ID of the user (injected by system)"),
    }),
  }
);
