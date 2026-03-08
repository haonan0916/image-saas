import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ragService } from "@/server/services/ragService";

/**
 * 搜索平台知识库
 * 这是一个简化版本，实际应该使用向量数据库进行语义搜索
 */
export const searchKnowledgeTool = tool(
  async ({ query, sessionId, userId }) => {
    try {
      const res = ragService.generateRAGResponse(query, sessionId, userId);
      return JSON.stringify({
        success: true,
        found: true,
        content: res,
        message: "Found relevant information in the knowledge base.",
      });
    } catch (error) {
      console.error("[Agent] Error searching knowledge:", error);
      return JSON.stringify({
        error: "Failed to search knowledge base",
      });
    }
  },
  {
    name: "search_knowledge",
    description:
      "Search the platform knowledge base for documentation, FAQs, and help articles. Use this when the user asks how to use features, API documentation, or general platform questions.",
    schema: z.object({
      query: z.string().describe("The search query or question"),
      sessionId: z.string().describe("The session ID"),
      userId: z.string().describe("The user ID"),
    }),
  },
);
