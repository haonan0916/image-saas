import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";
import { files } from "@/server/db/schema";
import { desc, eq, and, isNull, like, or } from "drizzle-orm";

/**
 * 搜索用户的文件
 */
export const searchFilesTool = tool(
  async ({ query, appId, userId, limit = 10 }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      let whereCondition = and(
        eq(files.userId, userId),
        isNull(files.deletedAt)
      );

      // 如果指定了 appId，添加应用过滤
      if (appId) {
        whereCondition = and(whereCondition, eq(files.appId, appId));
      }

      // 如果有搜索关键词，添加名称搜索
      if (query) {
        whereCondition = and(
          whereCondition,
          or(
            like(files.name, `%${query}%`),
            like(files.contentType, `%${query}%`)
          )
        );
      }

      const results = await db.query.files.findMany({
        where: whereCondition,
        orderBy: [desc(files.createdAt)],
        limit: limit,
      });

      return JSON.stringify({
        success: true,
        count: results.length,
        files: results.map((file) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          contentType: file.contentType,
          appId: file.appId,
          createdAt: file.createdAt,
        })),
      });
    } catch (error) {
      console.error("[Agent] Error searching files:", error);
      return JSON.stringify({ error: "Failed to search files" });
    }
  },
  {
    name: "search_files",
    description: "Search for files by name or type. Use this when the user wants to find specific files or list their uploaded files.",
    schema: z.object({
      query: z.string().optional().describe("Search keyword for file name or type (optional)"),
      appId: z.string().optional().describe("Filter by application ID (optional)"),
      userId: z.string().describe("The ID of the user (injected by system)"),
      limit: z.number().optional().default(10).describe("Maximum number of results to return"),
    }),
  }
);
