import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";

/**
 * 搜索平台知识库
 * 这是一个简化版本，实际应该使用向量数据库进行语义搜索
 */
export const searchKnowledgeTool = tool(
  async ({ query }) => {
    try {
      // 读取知识库文档
      const knowledgePath = path.join(process.cwd(), "src/knowledge/system-documentation.md");
      
      if (!fs.existsSync(knowledgePath)) {
        return JSON.stringify({
          error: "Knowledge base not found",
        });
      }

      const content = fs.readFileSync(knowledgePath, "utf-8");
      
      // 简单的关键词匹配（实际应该使用 RAG）
      const lines = content.split("\n");
      const relevantLines: string[] = [];
      const queryLower = query.toLowerCase();

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(queryLower)) {
          // 获取上下文（前后各2行）
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          relevantLines.push(...lines.slice(start, end));
        }
      }

      if (relevantLines.length === 0) {
        return JSON.stringify({
          success: true,
          found: false,
          message: "No relevant information found in the knowledge base.",
          suggestion: "Try rephrasing your question or ask about: file upload, API integration, storage configuration, or application management.",
        });
      }

      return JSON.stringify({
        success: true,
        found: true,
        content: relevantLines.join("\n").substring(0, 1000), // 限制长度
        message: "Found relevant information in the knowledge base.",
      });
    } catch (error) {
      console.error("[Agent] Error searching knowledge:", error);
      return JSON.stringify({ 
        error: "Failed to search knowledge base" 
      });
    }
  },
  {
    name: "search_knowledge",
    description: "Search the platform knowledge base for documentation, FAQs, and help articles. Use this when the user asks how to use features, API documentation, or general platform questions.",
    schema: z.object({
      query: z.string().describe("The search query or question"),
    }),
  }
);
