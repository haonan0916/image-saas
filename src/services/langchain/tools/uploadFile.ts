import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/server/db/db";
import { files } from "@/server/db/schema";
import { v4 as uuid } from "uuid";

/**
 * 保存文件记录到数据库
 * 注意：实际文件上传需要先通过 presigned URL 完成
 */
export const saveFileTool = tool(
  async ({ name, path, contentType, appId, userId }) => {
    if (!userId) {
      return JSON.stringify({ error: "User ID is required" });
    }

    try {
      const url = new URL(path);
      
      const result = await db
        .insert(files)
        .values({
          id: uuid(),
          name,
          path: url.pathname,
          url: url.toString(),
          userId,
          appId,
          contentType,
        })
        .returning();

      const file = result[0];

      return JSON.stringify({
        success: true,
        fileId: file.id,
        fileName: file.name,
        fileUrl: file.url,
        message: `File "${name}" saved successfully.`,
      });
    } catch (error) {
      console.error("[Agent] Error saving file:", error);
      return JSON.stringify({ 
        error: "Failed to save file record. Please check the input parameters." 
      });
    }
  },
  {
    name: "save_file",
    description: "Save a file record to the database after upload. Use this when a file has been uploaded and needs to be registered in the system.",
    schema: z.object({
      name: z.string().describe("The name of the file"),
      path: z.string().describe("The full URL path where the file is stored"),
      contentType: z.string().describe("The MIME type of the file (e.g., 'image/jpeg')"),
      appId: z.string().describe("The ID of the application this file belongs to"),
      userId: z.string().describe("The ID of the user (injected by system)"),
    }),
  }
);
