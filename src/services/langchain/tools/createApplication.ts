import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";
import { apps } from "@/server/db/schema";
import { v4 as uuid } from "uuid";
import { count, eq, and, isNull } from "drizzle-orm";

/**
 * 创建新应用
 * 注意：应用创建时不需要指定 storageId，storageId 是后续通过 changeStorage 设置的
 */
export const createApplicationTool = tool(
  async ({ name, description, userId, userPlan }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      // 检查免费计划限制
      if (userPlan === "free") {
        const existingAppsCount = await db
          .select({ count: count() })
          .from(apps)
          .where(and(eq(apps.userId, userId), isNull(apps.deletedAt)));

        if (existingAppsCount[0].count >= 1) {
          return JSON.stringify({
            error: "Free plan allows only 1 application. Please upgrade to create more apps.",
            requiresUpgrade: true,
          });
        }
      }

      const result = await db
        .insert(apps)
        .values({
          id: uuid(),
          name,
          description: description || null,
          userId,
          // storageId 不在创建时设置，用户可以后续通过 UI 或 changeStorage API 设置
        })
        .returning();

      const app = result[0];

      return JSON.stringify({
        success: true,
        applicationId: app.id,
        applicationName: app.name,
        message: `Application "${name}" created successfully. You can configure storage settings later in the application settings.`,
      });
    } catch (error) {
      console.error("[Agent] Error creating application:", error);
      return JSON.stringify({ 
        error: "Failed to create application. Please try again." 
      });
    }
  },
  {
    name: "create_application",
    description: "Create a new application. Use this when the user wants to create a new app for file management. Note: Storage configuration is set separately after creation.",
    schema: z.object({
      name: z.string().describe("The name of the application"),
      description: z.string().optional().describe("Optional description of the application"),
      userId: z.string().describe("The ID of the user (injected by system)"),
      userPlan: z.enum(["free", "pro"]).describe("The user's plan (injected by system)"),
    }),
  }
);
