import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";
import { files, datasetImages } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * 删除文件（软删除）
 */
export const deleteFileTool = tool(
  async ({ fileId, userId }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      return await db.transaction(async (tx) => {
        // 查找文件
        const fileToDelete = await tx.query.files.findFirst({
          where: (files, { eq, and, isNull }) =>
            and(
              eq(files.id, fileId),
              eq(files.userId, userId),
              isNull(files.deletedAt)
            ),
        });

        if (!fileToDelete) {
          return JSON.stringify({
            error: "File not found or already deleted",
          });
        }

        // 软删除文件
        await tx
          .update(files)
          .set({ deletedAt: new Date() })
          .where(eq(files.id, fileId));

        // 同时删除关联的数据集图片
        await tx
          .update(datasetImages)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(datasetImages.originalUrl, fileToDelete.url),
              eq(datasetImages.userId, userId),
              isNull(datasetImages.deletedAt)
            )
          );

        return JSON.stringify({
          success: true,
          fileName: fileToDelete.name,
          message: `File "${fileToDelete.name}" deleted successfully.`,
        });
      });
    } catch (error) {
      console.error("[Agent] Error deleting file:", error);
      return JSON.stringify({ error: "Failed to delete file" });
    }
  },
  {
    name: "delete_file",
    description: "Delete a file from the system. Use this when the user wants to remove a specific file.",
    schema: z.object({
      fileId: z.string().describe("The ID of the file to delete"),
      userId: z.string().describe("The ID of the user (injected by system)"),
    }),
  }
);
