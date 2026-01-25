import { z } from "zod";
import { eq, desc, and, isNull } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db/db";
import { knowledgeBase, ragQueries } from "../db/schema";
import { ragService } from "../services/ragService";
import { TRPCError } from "@trpc/server";

export const ragRoutes = router({
  // 添加知识库文档
  addDocument: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        type: z.enum(["document", "api", "guide", "faq"]),
        category: z.string().optional(),
        tags: z.array(z.string()).default([]),
        source: z.string().optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const docId = await ragService.addDocument(
          input.title,
          input.content,
          input.type,
          input.category,
          input.tags,
          input.source,
          ctx.session.user.id
        );

        // 如果是公共文档，需要更新 isPublic 字段
        if (input.isPublic) {
          await db
            .update(knowledgeBase)
            .set({ isPublic: true })
            .where(eq(knowledgeBase.id, docId));
        }

        return { id: docId, success: true };
      } catch (error) {
        console.error("Failed to add document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add document to knowledge base",
        });
      }
    }),

  // 获取知识库文档列表
  getDocuments: protectedProcedure
    .input(
      z.object({
        type: z.enum(["document", "api", "guide", "faq"]).optional(),
        category: z.string().optional(),
        includePublic: z.boolean().default(true),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const whereConditions = [isNull(knowledgeBase.deletedAt)];

      // 访问权限：公共文档 + 用户自己的文档
      if (input.includePublic) {
        whereConditions.push(
          // 使用 SQL 表达式来处理 OR 条件
          // (isPublic = true OR userId = currentUserId)
        );
      } else {
        whereConditions.push(eq(knowledgeBase.userId, ctx.session.user.id));
      }

      if (input.type) {
        whereConditions.push(eq(knowledgeBase.type, input.type));
      }

      if (input.category) {
        whereConditions.push(eq(knowledgeBase.category, input.category));
      }

      const documents = await db
        .select({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          content: knowledgeBase.content,
          type: knowledgeBase.type,
          category: knowledgeBase.category,
          tags: knowledgeBase.tags,
          source: knowledgeBase.source,
          isPublic: knowledgeBase.isPublic,
          createdAt: knowledgeBase.createdAt,
          updatedAt: knowledgeBase.updatedAt,
        })
        .from(knowledgeBase)
        .where(and(...whereConditions))
        .orderBy(desc(knowledgeBase.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      return documents;
    }),

  // 删除知识库文档
  deleteDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(knowledgeBase)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(knowledgeBase.id, input.id),
            eq(knowledgeBase.userId, ctx.session.user.id)
          )
        );

      return { success: true };
    }),

  // RAG 增强的聊天
  ragChat: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        sessionId: z.string(),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await ragService.generateRAGResponse(
          input.query,
          input.sessionId,
          ctx.session.user.id,
          input.model
        );

        return response;
      } catch (error) {
        console.error("RAG chat error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate RAG response",
        });
      }
    }),

  // 搜索知识库
  searchKnowledge: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
        threshold: z.number().min(0).max(1).default(0.3),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const results = await ragService.retrieveRelevantDocs(
          input.query,
          ctx.session.user.id,
          input.limit,
          input.threshold
        );

        return results;
      } catch (error) {
        console.error("Knowledge search error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search knowledge base",
        });
      }
    }),

  // 获取RAG查询历史
  getQueryHistory: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const whereConditions = [eq(ragQueries.userId, ctx.session.user.id)];

      if (input.sessionId) {
        whereConditions.push(eq(ragQueries.sessionId, input.sessionId));
      }

      const queries = await db
        .select()
        .from(ragQueries)
        .where(and(...whereConditions))
        .orderBy(desc(ragQueries.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return queries;
    }),

  // 初始化系统知识库
  initializeSystemKnowledge: protectedProcedure
    .mutation(async () => {
      // 只允许管理员用户初始化系统知识库
      // 这里可以添加权限检查
      try {
        await ragService.initializeSystemKnowledge();
        return { success: true, message: "System knowledge base initialized" };
      } catch (error) {
        console.error("Failed to initialize system knowledge:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize system knowledge base",
        });
      }
    }),

  // 测试 embedding 模型连接
  testEmbeddingConnection: protectedProcedure
    .query(async () => {
      try {
        const result = await ragService.testEmbeddingConnection();
        return result;
      } catch (error) {
        console.error("Failed to test embedding connection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to test embedding connection",
        });
      }
    }),
});