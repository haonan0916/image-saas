import { z } from "zod";
import { eq, desc, and, isNull } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db/db";
import { chatSessions, chatMessages } from "../db/schema";
import { ollamaClient } from "../services/ollamaClient";
import { LangChainChatManager } from "../../services/langchain/chat/LangChainChatManager";
import { ModelFactory } from "../../services/langchain/factory/ModelFactory";
import { AdapterRegistry } from "../../services/langchain/factory/AdapterRegistry";
import { ChatRequest, ChatMessage, ModelProvider } from "../../types/langchain";
import { LogLevel } from "../../services/langchain/observability";

// 初始化 LangChain 系统
const adapterRegistry = new AdapterRegistry();
const modelFactory = new ModelFactory(adapterRegistry);

// 配置 LangChain Chat Manager
const chatManager = new LangChainChatManager(modelFactory, {
  defaultModel: 'ollama/qwen3:0.6b',
  enableFallback: true,
  performanceConfig: {
    connectionPoolSize: 5,
    requestTimeout: 30000,
    cacheSize: 100,
    cacheTTL: 300000, // 5 minutes
    enableMetrics: true
  },
  observabilityConfig: {
    enableLogging: true,
    enableMetrics: true,
    enableTracing: true,
    logLevel: LogLevel.INFO,
    metricsRetentionDays: 7,
    tracingRetentionDays: 3,
    excludeSensitiveData: true
  }
});

/**
 * 将数据库消息格式转换为 LangChain 消息格式
 */
function convertToLangChainMessages(dbMessages: any[]): ChatMessage[] {
  return dbMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
    timestamp: msg.createdAt
  }));
}

/**
 * 解析模型ID，提取提供商和模型名称
 */
function parseModelId(modelId: string): { provider: ModelProvider; model: string } {
  const parts = modelId.split('/');
  if (parts.length === 2) {
    const providerStr = parts[0].toLowerCase();
    let provider: ModelProvider;
    
    switch (providerStr) {
      case 'openai':
        provider = ModelProvider.OPENAI;
        break;
      case 'anthropic':
        provider = ModelProvider.ANTHROPIC;
        break;
      case 'google':
      case 'gemini':
        provider = ModelProvider.GOOGLE;
        break;
      case 'ollama':
      default:
        provider = ModelProvider.OLLAMA;
        break;
    }
    
    return { provider, model: parts[1] };
  }
  
  // 默认为 Ollama
  return { provider: ModelProvider.OLLAMA, model: modelId };
}

export const chatLangChainRoutes = router({
  // 创建新的聊天会话
  createSession: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [session] = await db
        .insert(chatSessions)
        .values({
          id: crypto.randomUUID(),
          title: input.title || "新对话",
          userId: ctx.session.user.id,
          model: input.model || "ollama/qwen3:0.6b",
        })
        .returning();

      return session;
    }),

  // 获取用户的聊天会话列表
  getSessions: protectedProcedure
    .query(async ({ ctx }) => {
      const sessions = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.userId, ctx.session.user.id),
            isNull(chatSessions.deletedAt)
          )
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
            eq(chatSessions.userId, ctx.session.user.id),
            isNull(chatSessions.deletedAt)
          )
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

  // 发送消息并获取AI回复 (使用 LangChain)
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        content: z.string(),
        model: z.string().optional(),
      })
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
            isNull(chatSessions.deletedAt)
          )
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

      // 获取会话历史消息
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, input.sessionId))
        .orderBy(chatMessages.createdAt);

      // 转换为 LangChain 消息格式
      const langchainMessages = convertToLangChainMessages(messages);

      try {
        // 准备 LangChain 请求
        const modelId = input.model || sessionCheck[0].model || 'ollama/qwen3:0.6b';
        const chatRequest: ChatRequest = {
          messages: langchainMessages,
          modelId,
          sessionId: input.sessionId,
          options: {
            temperature: 0.7,
            maxTokens: 2048,
            timeout: 30000
          }
        };

        // 使用 LangChain Chat Manager 获取回复
        const response = await chatManager.sendMessage(chatRequest);

        // 保存 AI 回复
        const [assistantMessage] = await db
          .insert(chatMessages)
          .values({
            id: crypto.randomUUID(),
            sessionId: input.sessionId,
            role: "assistant",
            content: response.content,
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
          metadata: {
            modelUsed: response.modelId,
            usage: response.usage,
            responseTime: response.timestamp ? 
              new Date().getTime() - response.timestamp.getTime() : undefined
          }
        };
      } catch (error) {
        console.error("LangChain chat error:", error);
        
        // 如果 LangChain 失败，回退到原始的 Ollama 客户端
        try {
          console.log("Falling back to Ollama client...");
          
          const ollamaMessages = messages.map((msg: { role: string; content: string }) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          }));

          if (input.model) {
            ollamaClient.setModel(input.model);
          }

          const aiResponse = await ollamaClient.chat(ollamaMessages);

          const [assistantMessage] = await db
            .insert(chatMessages)
            .values({
              id: crypto.randomUUID(),
              sessionId: input.sessionId,
              role: "assistant",
              content: aiResponse,
            })
            .returning();

          await db
            .update(chatSessions)
            .set({ updatedAt: new Date() })
            .where(eq(chatSessions.id, input.sessionId));

          return {
            userMessage,
            assistantMessage,
            metadata: {
              fallbackUsed: true,
              modelUsed: ollamaClient.getModel()
            }
          };
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          
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
            metadata: {
              error: true,
              errorMessage: error instanceof Error ? error.message : "未知错误"
            }
          };
        }
      }
    }),

  // 删除会话
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(chatSessions)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.userId, ctx.session.user.id)
          )
        );

      return { success: true };
    }),

  // 更新会话标题
  updateSessionTitle: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        title: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [session] = await db
        .update(chatSessions)
        .set({ 
          title: input.title,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.userId, ctx.session.user.id)
          )
        )
        .returning();

      return session;
    }),

  // 获取可用的模型列表 (LangChain + Ollama)
  getAvailableModels: protectedProcedure.query(async () => {
    try {
      // 获取 LangChain 支持的模型
      const langchainModels = await chatManager.getAvailableModels();
      
      // 获取 Ollama 模型作为后备
      let ollamaModels: string[] = [];
      try {
        ollamaModels = await ollamaClient.listModels();
      } catch (ollamaError) {
        console.warn("Failed to get Ollama models:", ollamaError);
      }

      // 合并模型列表
      const allModels = [
        ...langchainModels.map(model => ({
          id: model.id,
          name: model.name,
          provider: model.providerId,
          capabilities: model.capabilities
        })),
        ...ollamaModels.map(model => ({
          id: `ollama/${model}`,
          name: model,
          provider: 'ollama',
          capabilities: { chat: true, stream: true }
        }))
      ];

      return {
        models: allModels,
        currentModel: chatManager.getCurrentModel(),
        langchainAvailable: true
      };
    } catch (error) {
      console.error("Failed to get LangChain models, falling back to Ollama:", error);
      
      // 回退到 Ollama
      try {
        const models = await ollamaClient.listModels();
        return {
          models: models.map(model => ({
            id: `ollama/${model}`,
            name: model,
            provider: 'ollama',
            capabilities: { chat: true, stream: true }
          })),
          currentModel: `ollama/${ollamaClient.getModel()}`,
          langchainAvailable: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } catch (ollamaError) {
        return {
          models: [],
          currentModel: null,
          langchainAvailable: false,
          error: "Both LangChain and Ollama are unavailable",
        };
      }
    }
  }),

  // 检查连接状态 (LangChain + Ollama)
  checkConnection: protectedProcedure.query(async () => {
    try {
      // 检查 LangChain 健康状态
      const healthStatus = await chatManager.getHealthStatus();
      
      // 检查 Ollama 连接
      let ollamaStatus = { connected: false, model: '' };
      try {
        const isAvailable = await ollamaClient.isModelAvailable();
        ollamaStatus = {
          connected: isAvailable,
          model: ollamaClient.getModel(),
        };
      } catch (ollamaError) {
        console.warn("Ollama connection check failed:", ollamaError);
      }

      return {
        langchain: {
          connected: Object.values(healthStatus).some(status => 
            typeof status === 'object' && status.connected === true
          ),
          healthStatus,
          currentModel: chatManager.getCurrentModel()
        },
        ollama: ollamaStatus,
        overall: {
          connected: true, // 至少有一个系统可用
          primarySystem: 'langchain'
        }
      };
    } catch (error) {
      // LangChain 不可用，检查 Ollama
      try {
        const isAvailable = await ollamaClient.isModelAvailable();
        return {
          langchain: {
            connected: false,
            error: error instanceof Error ? error.message : "Unknown error"
          },
          ollama: {
            connected: isAvailable,
            model: ollamaClient.getModel(),
          },
          overall: {
            connected: isAvailable,
            primarySystem: 'ollama'
          }
        };
      } catch (ollamaError) {
        return {
          langchain: {
            connected: false,
            error: error instanceof Error ? error.message : "Unknown error"
          },
          ollama: {
            connected: false,
            error: ollamaError instanceof Error ? ollamaError.message : "Unknown error",
          },
          overall: {
            connected: false,
            primarySystem: null
          }
        };
      }
    }
  }),

  // 获取性能和可观测性指标
  getMetrics: protectedProcedure.query(async () => {
    try {
      const performanceMetrics = chatManager.getPerformanceMetrics();
      const healthStatus = await chatManager.getHealthStatus();
      
      return {
        performance: performanceMetrics,
        health: healthStatus,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to get metrics",
        timestamp: new Date()
      };
    }
  }),
});