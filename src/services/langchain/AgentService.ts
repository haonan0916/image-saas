import { createAgent } from "langchain";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { LangChainService } from "./LangChainService";
import {
  saveFileTool,
  searchFilesTool,
  deleteFileTool,
  listRecentImagesTool,
  listApplicationsTool,
  createApplicationTool,
  changeAppStorageTool,
  listStoragesTool,
  searchKnowledgeTool,
  createDehazeTaskTool,
} from "./tools";

/**
 * Agent 配置选项
 */
export interface AgentConfig {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  userId: string;
  userPlan: "free" | "pro";
  systemPrompt?: string;
}

/**
 * Agent 消息格式
 */
export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Agent 响应格式
 */
export interface AgentResponse {
  content: string;
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: string;
  }>;
  modelId: string;
  timestamp: Date;
}

/**
 * 智能平台助手 Agent 服务
 * 基于 LangChain 官方标准实现
 */
export class AgentService {
  private static instance: AgentService;
  private langchainService: LangChainService;

  private constructor() {
    this.langchainService = LangChainService.getInstance();
  }

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  /**
   * 获取默认系统提示词
   */
  private getDefaultSystemPrompt(): string {
    return `You are an intelligent assistant for a file/image management SaaS platform.
You use the ReAct (Reasoning + Acting) pattern to solve user requests step by step.

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
- Storage management: list storages, change app storage
- Knowledge search: find documentation and help articles
- Image processing: create dehaze tasks

Important notes about application creation:
- When creating an application, you DON'T need to specify storage configuration
- Storage configuration is set AFTER the application is created
- If user wants to configure storage for an app:
  1. First, list available storages using list_storages
  2. Then, use change_app_storage to configure the app's storage
- Example workflow:
  User: "Create an app called Test"
  You: [call create_application with name="Test"]
  You: "Application 'Test' created successfully! Would you like to configure storage for it?"

CRITICAL - How to handle tool results:
- Tools return JSON strings with operation results
- You MUST parse the JSON and present the information in a natural, user-friendly way
- NEVER show raw JSON to users
- NEVER show technical error messages or stack traces to users
- Extract key information and format it nicely

Examples of good responses:

1. After creating an application:
   Tool returns: {"success":true,"applicationId":"xxx","applicationName":"Test","message":"..."}
   You say: "✅ 应用 'Test' 创建成功！应用 ID: xxx
   您可以稍后在应用设置中配置存储。"

2. After listing applications:
   Tool returns: {"success":true,"count":3,"applications":[...]}
   You say: "您当前有 3 个应用：
   1. Production App (创建于 2024-01-15)
   2. Test App (创建于 2024-01-20)
   3. Development App (创建于 2024-02-01)"

3. After searching files:
   Tool returns: {"success":true,"count":5,"files":[...]}
   You say: "找到 5 个匹配的文件：
   1. logo.png (2.3 MB, 2024-01-10)
   2. banner.jpg (1.5 MB, 2024-01-15)
   ..."

4. When an error occurs:
   Tool returns: {"error":"Free plan allows only 1 application"}
   You say: "❌ 抱歉，免费计划只允许创建 1 个应用。
   如需创建更多应用，请升级到专业版。"

5. When a tool fails:
   Tool returns: {"error":"操作失败，请稍后重试","details":"..."}
   You say: "❌ 抱歉，操作失败了。请稍后再试，或者联系客服获取帮助。"

Always prioritize user experience and data safety. Make your responses warm, helpful, and easy to understand.`;
  }

  /**
   * 注入用户上下文到工具参数
   * 这样工具可以自动获取 userId 和 userPlan，无需用户提供
   * 
   * CRITICAL: We need to remove userId and userPlan from the schema
   * so the agent doesn't try to pass them - we inject them automatically
   */
  private injectUserContext(
    tools: DynamicStructuredTool[],
    userId: string,
    userPlan: "free" | "pro"
  ): DynamicStructuredTool[] {
    return tools.map((tool) => {
      // Get the original schema
      const originalSchema = tool.schema as z.ZodObject<z.ZodRawShape>;
      
      // Check which user fields exist in the schema
      const hasUserId = 'userId' in originalSchema.shape;
      const hasUserPlan = 'userPlan' in originalSchema.shape;
      
      // Create new schema, only omitting fields that actually exist
      let newSchema = originalSchema;
      
      if (hasUserId && hasUserPlan) {
        // Both fields exist, omit both
        newSchema = originalSchema.omit({ userId: true, userPlan: true });
      } else if (hasUserId) {
        // Only userId exists, omit only userId
        newSchema = originalSchema.omit({ userId: true });
      } else if (hasUserPlan) {
        // Only userPlan exists, omit only userPlan
        newSchema = originalSchema.omit({ userPlan: true });
      }
      // If neither exists, use original schema

      // Create new tool instance with modified schema
      return new DynamicStructuredTool({
        name: tool.name,
        description: tool.description,
        schema: newSchema,
        func: async (input: Record<string, unknown>) => {
          // Auto-inject user context
          const enrichedInput = {
            ...input,
            userId,
            userPlan,
          };
          
          try {
            // Call the original tool with enriched input
            const result = await tool.invoke(enrichedInput);
            return result;
          } catch (error) {
            // Catch tool errors and return user-friendly messages
            console.error(`[Agent] Tool ${tool.name} error:`, error);
            
            // Return a user-friendly error message
            return JSON.stringify({
              error: "操作失败，请稍后重试",
              details: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
      });
    });
  }

  /**
   * 创建 Agent 实例
   */
  private createAgentInstance(config: AgentConfig) {
    // 使用支持函数调用的模型
    // qwen3:0.6b 太小，不支持函数调用，需要使用更大的模型
    const modelId = config.modelId || "ollama/qwen3:0.6b";
    const model = this.langchainService.getModel(modelId, {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    });

    // 获取所有工具
    const allTools = [
      saveFileTool,
      searchFilesTool,
      deleteFileTool,
      listRecentImagesTool,
      listApplicationsTool,
      createApplicationTool,
      changeAppStorageTool,
      listStoragesTool,
      searchKnowledgeTool,
      createDehazeTaskTool,
    ];

    // 注入用户上下文
    const toolsWithContext = this.injectUserContext(
      allTools,
      config.userId,
      config.userPlan
    );

    // 使用 LangChain 官方 createAgent
    const agent = createAgent({
      model,
      tools: toolsWithContext,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
    });

    return agent;
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: AgentMessage[]): BaseMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case "user":
          return new HumanMessage(msg.content);
        case "assistant":
          return new AIMessage(msg.content);
        case "system":
          return new SystemMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  /**
   * 调用 Agent（非流式）
   */
  public async invoke(
    messages: AgentMessage[],
    config: AgentConfig
  ): Promise<AgentResponse> {
    const agent = this.createAgentInstance(config);
    const langchainMessages = this.convertMessages(messages);

    const result = await agent.invoke({
      messages: langchainMessages,
    });

    // 提取最后一条消息作为响应
    const lastMessage = result.messages[result.messages.length - 1];
    
    // 提取工具调用信息（如果有）
    const toolCalls = result.messages
      .filter((msg: BaseMessage) => 'tool_calls' in msg && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0)
      .flatMap((msg: BaseMessage) => {
        const msgWithTools = msg as BaseMessage & { tool_calls?: Array<{ name: string; args: Record<string, unknown> }> };
        return (msgWithTools.tool_calls || []).map((tc) => ({
          toolName: tc.name,
          args: tc.args,
          result: "",
        }));
      });

    return {
      content: lastMessage.content as string,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      modelId: config.modelId || "ollama/qwen3:0.6b",
      timestamp: new Date(),
    };
  }

  /**
   * 调用 Agent（流式）
   */
  public async *stream(
    messages: AgentMessage[],
    config: AgentConfig
  ): AsyncIterable<{ content: string; isComplete: boolean }> {
    const agent = this.createAgentInstance(config);
    const langchainMessages = this.convertMessages(messages);

    const stream = await agent.stream(
      {
        messages: langchainMessages,
      },
      {
        streamMode: "messages",
      }
    );

    for await (const [message] of stream) {
      if (message.content) {
        yield {
          content: message.content as string,
          isComplete: false,
        };
      }
    }

    yield {
      content: "",
      isComplete: true,
    };
  }
}

export const agentService = AgentService.getInstance();
