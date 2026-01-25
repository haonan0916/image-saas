// Google Gemini 模型适配器
import { BaseAdapter } from './BaseAdapter';
import { 
  ChatMessage, 
  ChatOptions, 
  ModelInfo, 
  ModelConfig,
  ModelProvider,
  ChatServiceError,
  TimeoutError
} from '../interfaces';

/**
 * Gemini 适配器配置
 */
export interface GeminiConfig extends ModelConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Google Gemini 模型适配器
 * 实现与 Google Gemini API 的集成
 */
export class GeminiAdapter extends BaseAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: GeminiConfig) {
    super(ModelProvider.GEMINI, 'Google Gemini Models', config);
    
    this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com';

    if (!this.apiKey) {
      throw new ChatServiceError(
        'Google API key is required',
        'MISSING_API_KEY',
        this.providerId
      );
    }
  }

  /**
   * 初始化适配器
   */
  async initialize(config: ModelConfig): Promise<void> {
    this.config = config;
    
    try {
      // 测试 API 连接
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new ChatServiceError(
          'Failed to connect to Google Gemini API',
          'CONNECTION_FAILED',
          this.providerId
        );
      }
      
      this.isInitialized = true;
      this.logDebug('Gemini adapter initialized successfully');
    } catch (error) {
      this.logError(error as Error, 'initialization');
      throw error;
    }
  }

  /**
   * 发送聊天请求
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    this.ensureInitialized();
    
    const cleanMessages = this.validateAndCleanMessages(messages);
    const mergedOptions = this.mergeOptions(options);
    
    try {
      return await this.withTimeout(
        this.withRetry(() => this.performChat(cleanMessages, mergedOptions)),
        mergedOptions.timeout || this.config.timeout
      );
    } catch (error) {
      this.logError(error as Error, 'chat');
      throw error;
    }
  }

  /**
   * 流式聊天
   */
  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    this.ensureInitialized();
    
    const cleanMessages = this.validateAndCleanMessages(messages);
    const mergedOptions = this.mergeOptions({ ...options, stream: true });
    
    try {
      yield* this.performChatStream(cleanMessages, mergedOptions);
    } catch (error) {
      this.logError(error as Error, 'chatStream');
      throw error;
    }
  }

  /**
   * 获取支持的模型列表
   */
  async getSupportedModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1beta/models?key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new ChatServiceError(
          `Failed to fetch models: ${response.statusText}`,
          'API_ERROR',
          this.providerId
        );
      }

      const data = await response.json();
      
      // 过滤出支持生成内容的模型
      const chatModels = (data.models || []).filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent')
      );

      return chatModels.map((model: any) => ({
        id: model.name.replace('models/', ''),
        name: model.displayName || model.name,
        providerId: this.providerId,
        capabilities: {
          supportsStreaming: model.supportedGenerationMethods?.includes('streamGenerateContent') || false,
          supportsFunctions: true,
          maxTokens: model.outputTokenLimit || 8192,
          supportedLanguages: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'ru', 'ar', 'it', 'nl', 'hi']
        },
        metadata: {
          version: model.version,
          description: model.description,
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit
        }
      }));
    } catch (error) {
      this.logError(error as Error, 'getSupportedModels');
      throw new ChatServiceError(
        `Failed to get supported models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MODEL_FETCH_FAILED',
        this.providerId
      );
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1beta/models?key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      return response.ok;
    } catch (error) {
      this.logDebug('Health check failed', error);
      return false;
    }
  }

  /**
   * 执行聊天请求
   */
  private async performChat(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    const formattedMessages = this.formatMessages(messages);
    
    const requestBody = {
      contents: formattedMessages,
      generationConfig: {
        temperature: options.temperature,
        topP: options.topP,
        maxOutputTokens: options.maxTokens
      }
    };

    const modelName = this.currentModel.startsWith('models/') ? this.currentModel : `models/${this.currentModel}`;
    const response = await fetch(`${this.baseUrl}/v1beta/${modelName}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatServiceError(
        `Gemini API error: ${errorData.error?.message || response.statusText}`,
        'API_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    const data = await response.json();
    
    if (data.error) {
      throw new ChatServiceError(
        `Gemini error: ${data.error.message}`,
        'MODEL_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * 执行流式聊天请求
   */
  private async *performChatStream(messages: ChatMessage[], options: ChatOptions): AsyncIterable<string> {
    const formattedMessages = this.formatMessages(messages);
    
    const requestBody = {
      contents: formattedMessages,
      generationConfig: {
        temperature: options.temperature,
        topP: options.topP,
        maxOutputTokens: options.maxTokens
      }
    };

    const modelName = this.currentModel.startsWith('models/') ? this.currentModel : `models/${this.currentModel}`;
    const response = await fetch(`${this.baseUrl}/v1beta/${modelName}:streamGenerateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatServiceError(
        `Gemini API error: ${errorData.error?.message || response.statusText}`,
        'API_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    if (!response.body) {
      throw new ChatServiceError(
        'No response body received',
        'API_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.error) {
              throw new ChatServiceError(
                `Gemini error: ${data.error.message}`,
                'MODEL_ERROR',
                this.providerId,
                this.currentModel
              );
            }
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch (parseError) {
            // 忽略 JSON 解析错误，继续处理下一行
            this.logDebug('Failed to parse streaming response line', { line, error: parseError });
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 格式化消息以符合 Gemini API 要求
   */
  private formatMessages(messages: ChatMessage[]): any[] {
    const formattedMessages: any[] = [];
    
    for (const message of messages) {
      let role: string;
      
      switch (message.role) {
        case 'system':
          // Gemini 没有专门的 system role，将其作为 user 消息处理
          role = 'user';
          break;
        case 'assistant':
          role = 'model';
          break;
        case 'user':
        default:
          role = 'user';
          break;
      }
      
      formattedMessages.push({
        role,
        parts: [{ text: message.content }]
      });
    }
    
    return formattedMessages;
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    await super.dispose();
    this.logDebug('Gemini adapter disposed');
  }
}