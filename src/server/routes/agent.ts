import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { agentService } from "@/services/langchain/AgentService";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";

/**
 * Agent 路由
 * 提供智能助手功能的 API 端点
 */
export const agentRoutes = router({
  /**
   * 发送消息给 Agent（非流式）
   */
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string(),
          }),
        ),
        modelId: z.string().optional(),
        sessionId: z.string().optional(),
        options: z
          .object({
            temperature: z.number().min(0).max(2).optional(),
            maxTokens: z.number().min(1).max(8000).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const response = await agentService.invoke(input.messages, {
          modelId: input.modelId,
          temperature: input.options?.temperature,
          maxTokens: input.options?.maxTokens,
          userId: ctx.session.user.id,
          userPlan: ctx.plan || "free",
          sessionId: input.sessionId,
        });

        return {
          content: response.content,
          toolCalls: response.toolCalls,
          modelId: response.modelId,
          timestamp: response.timestamp,
          sessionId: input.sessionId,
        };
      } catch (error) {
        console.error("[Agent] Chat error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process agent request",
          cause: error,
        });
      }
    }),

  /**
   * 发送消息给 Agent（流式）
   */
  chatStream: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string(),
          }),
        ),
        modelId: z.string().optional(),
        sessionId: z.string().optional(),
        options: z
          .object({
            temperature: z.number().min(0).max(2).optional(),
            maxTokens: z.number().min(1).max(8000).optional(),
          })
          .optional(),
      }),
    )
    .subscription(async ({ ctx, input }) => {
      return observable<{ content: string; isComplete: boolean }>((emit) => {
        (async () => {
          try {
            const stream = agentService.stream(input.messages, {
              modelId: input.modelId,
              temperature: input.options?.temperature,
              maxTokens: input.options?.maxTokens,
              userId: ctx.session.user.id,
              userPlan: ctx.plan || "free",
              sessionId: input.sessionId,
            });

            for await (const chunk of stream) {
              emit.next(chunk);
            }

            emit.complete();
          } catch (error) {
            console.error("[Agent] Stream error:", error);
            emit.error(
              new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to stream agent response",
                cause: error,
              }),
            );
          }
        })();
      });
    }),

  /**
   * 获取可用的工具列表
   */
  getAvailableTools: protectedProcedure.query(async () => {
    return {
      tools: [
        {
          name: "save_file",
          description: "Save a file record to the database",
          category: "file_management",
        },
        {
          name: "search_files",
          description: "Search for files by name or type",
          category: "file_management",
        },
        {
          name: "delete_file",
          description: "Delete a file from the system",
          category: "file_management",
        },
        {
          name: "list_recent_images",
          description: "List the most recent images uploaded",
          category: "file_management",
        },
        {
          name: "list_applications",
          description: "List all applications owned by the user",
          category: "application_management",
        },
        {
          name: "create_application",
          description:
            "Create a new application (storage is configured separately)",
          category: "application_management",
        },
        {
          name: "change_app_storage",
          description: "Change storage configuration for an application",
          category: "application_management",
        },
        {
          name: "list_storages",
          description: "List available storage configurations",
          category: "storage_management",
        },
        {
          name: "search_knowledge",
          description: "Search the platform knowledge base",
          category: "knowledge",
        },
        {
          name: "create_dehaze_task",
          description: "Create a new image dehazing task",
          category: "image_processing",
        },
      ],
    };
  }),

  /**
   * 获取 Agent 系统提示词（用于调试）
   */
  getSystemPrompt: protectedProcedure.query(async () => {
    return {
      prompt: `You are an intelligent assistant for a file/image management SaaS platform.

Your capabilities:
- Help users manage files and applications
- Answer questions about platform features and API usage
- Execute operations like uploading files, creating apps, searching files
- Provide guidance on storage configuration and best practices

Guidelines:
- Be concise and helpful
- Always confirm before deleting files or making destructive changes
- When users ask "how to" questions, search the knowledge base first
- Provide step-by-step guidance for complex operations
- If you need information (like app ID), ask the user or use list tools to find it

Available operations:
- File management: search, save, delete files
- Application management: list, create applications
- Knowledge search: find documentation and help articles
- Image processing: create dehaze tasks

Always prioritize user experience and data safety.`,
    };
  }),
});
