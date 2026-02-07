import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";

/**
 * 列出用户的应用
 */
export const listApplicationsTool = tool(
  async ({ userId }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      const userApps = await db.query.apps.findMany({
        where: (apps, { eq, and, isNull }) =>
          and(eq(apps.userId, userId), isNull(apps.deletedAt)),
        orderBy: (apps, { desc }) => [desc(apps.createdAt)],
        with: {
          storage: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      return JSON.stringify({
        success: true,
        count: userApps.length,
        applications: userApps.map((app) => ({
          id: app.id,
          name: app.name,
          description: app.description,
          storageId: app.storageId,
          storageName: app.storage?.name,
          createdAt: app.createdAt,
        })),
      });
    } catch (error) {
      console.error("[Agent] Error listing applications:", error);
      return JSON.stringify({ error: "Failed to list applications" });
    }
  },
  {
    name: "list_applications",
    description: "List all applications owned by the user. Use this when the user asks about their apps or wants to select an app for operations.",
    schema: z.object({
      userId: z.string().describe("The ID of the user (injected by system)"),
    }),
  }
);
