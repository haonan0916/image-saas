import { z } from "zod";
import { eq, desc, and, isNull } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db/db";
import { chatSessions, chatMessages } from "../db/schema";
import { langchainService } from "@/services/langchain/LangChainService";
import { ragService, type RAGDocument } from "../services/ragService";

export const chatRoutes = router({
  // 创建新的聊天会话
  createSession: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        model: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [session] = await db
        .insert(chatSessions)
        .values({
          id: crypto.randomUUID(),
          title: input.title || "新对话",
          userId: ctx.session.user.id,
          model: input.model || "openai/doubao-seed-2-0-pro-260215",
        })
        .returning();

      return session;
    }),

  // 获取用户的聊天会话列表
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, ctx.session.user.id),
          isNull(chatSessions.deletedAt),
        ),
      )
      .orderBy(desc(chatSessions.updatedAt));

    return sessions;
  }),

  // 获取会话详情和消息
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const session = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.userId, ctx.session.user.id), // 确保用户只能访问自己的会话
            isNull(chatSessions.deletedAt),
          ),
        )
        .limit(1);

      if (!session.length) {
        throw new Error("Session not found");
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, input.sessionId))
        .orderBy(chatMessages.createdAt);

      return {
        session: session[0],
        messages,
      };
    }),

  // 发送消息并获取AI回复（支持RAG）
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        content: z.string(),
        model: z.string().optional(),
        useRAG: z.boolean().default(false), // 是否使用RAG
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // 首先验证会话属于当前用户
      const sessionCheck = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.userId, ctx.session.user.id),
            isNull(chatSessions.deletedAt),
          ),
        )
        .limit(1);

      if (!sessionCheck.length) {
        throw new Error("Session not found or access denied");
      }

      // 保存用户消息
      const [userMessage] = await db
        .insert(chatMessages)
        .values({
          id: crypto.randomUUID(),
          sessionId: input.sessionId,
          role: "user",
          content: input.content,
        })
        .returning();

      try {
        let aiResponse: string;
        let sources: RAGDocument[] = [];

        if (input.useRAG) {
          // 使用RAG增强回答
          const ragResponse = await ragService.generateRAGResponse(
            input.content,
            input.sessionId,
            ctx.session.user.id,
            input.model,
          );
          aiResponse = ragResponse.answer;
          sources = ragResponse.sources;
        } else {
          // 普通聊天模式
          // 获取会话历史消息
          const messages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, input.sessionId))
            .orderBy(chatMessages.createdAt);

          // 使用 LangChain Service 发送请求
          const response = await langchainService.sendMessage({
            modelId: input.model || "openai/doubao-seed-2-0-pro-260215",
            messages: messages.map((msg) => ({
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
            })),
            options: {},
          });

          aiResponse = response.content;
        }

        // 保存 AI 回复
        const [assistantMessage] = await db
          .insert(chatMessages)
          .values({
            id: crypto.randomUUID(),
            sessionId: input.sessionId,
            role: "assistant",
            content: aiResponse,
          })
          .returning();

        // 更新会话的更新时间
        await db
          .update(chatSessions)
          .set({ updatedAt: new Date() })
          .where(eq(chatSessions.id, input.sessionId));

        return {
          userMessage,
          assistantMessage,
          sources: input.useRAG ? sources : undefined,
        };
      } catch (error) {
        console.error("Chat error:", error);

        // 保存错误消息
        const [errorMessage] = await db
          .insert(chatMessages)
          .values({
            id: crypto.randomUUID(),
            sessionId: input.sessionId,
            role: "assistant",
            content: `抱歉，我遇到了一些问题：${error instanceof Error ? error.message : "未知错误"}`,
          })
          .returning();

        return {
          userMessage,
          assistantMessage: errorMessage,
        };
      }
    }),

  // 删除会话
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 确保用户只能删除自己的会话
      await db
        .update(chatSessions)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.userId, ctx.session.user.id),
          ),
        );

      return { success: true };
    }),

  // 更新会话标题
  updateSessionTitle: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [session] = await db
        .update(chatSessions)
        .set({
          title: input.title,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.userId, ctx.session.user.id),
          ),
        )
        .returning();

      return session;
    }),

  // 获取可用的模型列表
  getAvailableModels: protectedProcedure.query(async () => {
    try {
      const models = await langchainService.getAvailableModels();
      return {
        models: models.map((m) => ({
          id: m.id,
          name: m.name,
          provider: m.providerId,
        })),
        currentModel: "openai/doubao-seed-2-0-pro-260215",
      };
    } catch (error) {
      console.error("Failed to get models:", error);
      return {
        models: [],
        currentModel: "openai/doubao-seed-2-0-pro-260215",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  // 检查连接状态
  checkConnection: protectedProcedure.query(async () => {
    // 简单返回 true，或者可以尝试调用一次 LangChain 的简单请求
    return {
      connected: true,
      model: "openai/doubao-seed-2-0-pro-260215",
    };
  }),
});
