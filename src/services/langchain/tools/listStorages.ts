import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";

/**
 * 列出用户的存储配置
 */
export const listStoragesTool = tool(
  async ({ userId }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      const storages = await db.query.storageConfiguration.findMany({
        where: (storageConfiguration, { eq, and, isNull }) =>
          and(
            eq(storageConfiguration.userId, userId),
            isNull(storageConfiguration.deletedAt)
          ),
        columns: {
          id: true,
          name: true,
          createdAt: true,
        },
      });

      return JSON.stringify({
        success: true,
        count: storages.length,
        storages: storages.map((storage) => ({
          id: storage.id,
          name: storage.name,
          createdAt: storage.createdAt,
        })),
      });
    } catch (error) {
      console.error("[Agent] Error listing storages:", error);
      return JSON.stringify({ error: "Failed to list storage configurations" });
    }
  },
  {
    name: "list_storages",
    description: "List all storage configurations owned by the user. Use this when the user wants to see available storage options or before configuring app storage.",
    schema: z.object({
      userId: z.string().describe("The ID of the user (injected by system)"),
    }),
  }
);
