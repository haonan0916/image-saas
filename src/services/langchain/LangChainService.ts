import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ModelProvider,
} from "../../types/langchain";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";

export class LangChainService {
  private static instance: LangChainService;

  private constructor() {}

  public static getInstance(): LangChainService {
    if (!LangChainService.instance) {
      LangChainService.instance = new LangChainService();
    }
    return LangChainService.instance;
  }

  /**
   * 根据 modelId 获取模型实例
   * modelId 格式: "provider/model-name"
   */
  public getModel(modelId: string, options): BaseChatModel {
    // 处理 modelId，如果包含 / 则分割，否则默认为 openai (兼容旧逻辑)
    let provider = ModelProvider.OPENAI;
    let modelName = modelId;

    if (modelId.includes("/")) {
      const parts = modelId.split("/");
      provider = parts[0] as ModelProvider;
      modelName = parts.slice(1).join("/");
    }

    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2048;

    switch (provider.toLowerCase()) {
      case ModelProvider.OPENAI:
        return new ChatOpenAI({
          modelName: modelName || "doubao-seed-2-0-pro-260215",
          temperature,
          maxTokens,
          apiKey: process.env.OPENAI_API_KEY,
          configuration: {
            baseURL:
              process.env.OPENAI_BASE_URL ||
              "https://ark.cn-beijing.volces.com/api/v3",
          },
        });
      case ModelProvider.ANTHROPIC:
        return new ChatAnthropic({
          modelName: modelName || "claude-3-haiku-20240307",
          temperature,
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
      case "google":
      case ModelProvider.GEMINI:
        return new ChatGoogleGenerativeAI({
          model: modelName || "gemini-pro",
          temperature,
          maxOutputTokens: maxTokens,
          apiKey: process.env.GOOGLE_API_KEY,
        });
      case ModelProvider.OLLAMA:
      default:
        return new ChatOllama({
          model: modelName || "qwen3:0.6b",
          temperature,
          baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        });
    }
  }

  /**
   * 将自定义消息格式转换为 LangChain 消息格式
   */
  private convertMessages(messages: ChatMessage[]): BaseMessage[] {
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
   * 发送聊天请求
   */
  public async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const modelId = request.modelId || "doubao-seed-2-0-pro-260215";
    const model = this.getModel(modelId, request.options);
    const messages = this.convertMessages(request.messages);

    // 如果需要工具调用，可以绑定工具
    // const tools = [createDehazeTaskTool, listRecentImagesTool];
    // const modelWithTools = model.bindTools(tools);
    // const response = await modelWithTools.invoke(messages);

    const response = await model.invoke(messages);

    return {
      content: response.content as string,
      modelId: modelId,
      timestamp: new Date(),
      metadata: {
        usage: response.additional_kwargs?.tokenUsage,
      },
    };
  }

  /**
   * 发送流式聊天请求
   */
  public async *sendMessageStream(
    request: ChatRequest,
  ): AsyncIterable<ChatStreamChunk> {
    const modelId = request.modelId || "doubao-seed-2-0-pro-260215";
    const model = this.getModel(modelId, request.options);
    const messages = this.convertMessages(request.messages);

    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      yield {
        content: chunk.content as string,
        isComplete: false,
        modelId: modelId,
        timestamp: new Date(),
      };
    }

    yield {
      content: "",
      isComplete: true,
      modelId: modelId,
      timestamp: new Date(),
    };
  }

  /**
   * 获取所有可用模型（简化版）
   */
  public async getAvailableModels() {
    // 这里可以根据环境变量动态返回，或者返回硬编码的列表
    return [
      {
        id: "openai/doubao-seed-2-0-pro-260215",
        name: "Doubao Seed 2.0 Pro",
        providerId: "openai",
      },
      { id: "ollama/qwen3:0.6b", name: "Qwen3 (Ollama)", providerId: "ollama" },
      {
        id: "anthropic/claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        providerId: "anthropic",
      },
      { id: "google/gemini-pro", name: "Gemini Pro", providerId: "google" },
    ];
  }
}

export const langchainService = LangChainService.getInstance();
