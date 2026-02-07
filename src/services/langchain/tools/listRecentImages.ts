import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";
import { datasetImages } from "@/server/db/schema";
import { desc, eq, and, isNull } from "drizzle-orm";

/**
 * 列出用户最近上传的图片
 */
export const listRecentImagesTool = tool(
  async ({ limit = 5, userId }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      const images = await db.query.datasetImages.findMany({
        where: (datasetImages, { eq, and, isNull }) =>
          and(
            eq(datasetImages.userId, userId),
            isNull(datasetImages.deletedAt)
          ),
        orderBy: (datasetImages, { desc }) => [desc(datasetImages.createdAt)],
        limit: limit,
      });

      return JSON.stringify(
        images.map((img) => ({
          id: img.id,
          name: img.name,
          url: img.originalUrl,
          createdAt: img.createdAt,
        }))
      );
    } catch (error) {
      console.error("Error listing recent images:", error);
      return JSON.stringify({ error: "Failed to fetch images" });
    }
  },
  {
    name: "list_recent_images",
    description: "List the most recent images uploaded by the user. Use this when the user asks about their recent uploads or wants to select an image for processing.",
    schema: z.object({
      limit: z.number().optional().default(5).describe("The number of images to return"),
      userId: z.string().describe("The ID of the user (injected by system, do not ask user)"),
    }),
  }
);
