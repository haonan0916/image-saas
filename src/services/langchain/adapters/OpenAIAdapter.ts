// OpenAI 模型适配器
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
 * OpenAI 适配器配置
 */
export interface OpenAIConfig extends ModelConfig {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
}

/**
 * OpenAI 模型适配器
 * 实现与 OpenAI API 的集成
 */
export class OpenAIAdapter extends BaseAdapter {
  private apiKey: string;
  private baseUrl: string;
  private organization?: string;

  constructor(config: OpenAIConfig) {
    super(ModelProvider.OPENAI, 'OpenAI GPT Models', config);
    
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.organization = config.organization || process.env.OPENAI_ORGANIZATION;

    if (!this.apiKey) {
      throw new ChatServiceError(
        'OpenAI API key is required',
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
          'Failed to connect to OpenAI API',
          'CONNECTION_FAILED',
          this.providerId
        );
      }
      
      this.isInitialized = true;
      this.logDebug('OpenAI adapter initialized successfully');
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
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new ChatServiceError(
          `Failed to fetch models: ${response.statusText}`,
          'API_ERROR',
          this.providerId
        );
      }

      const data = await response.json();
      
      // 过滤出聊天模型
      const chatModels = (data.data || []).filter((model: any) => 
        model.id.includes('gpt') && !model.id.includes('instruct')
      );

      return chatModels.map((model: any) => ({
        id: model.id,
        name: model.id,
        providerId: this.providerId,
        capabilities: {
          supportsStreaming: true,
          supportsFunctions: model.id.includes('gpt-4') || model.id.includes('gpt-3.5-turbo'),
          maxTokens: this.getMaxTokensForModel(model.id),
          supportedLanguages: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'ru', 'ar']
        },
        metadata: {
          created: model.created,
          owned_by: model.owned_by
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
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      return response.ok;
    } catch (error) {
      this.logDebug('Health check failed', error);
      return false;
    }
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    return headers;
  }

  /**
   * 执行聊天请求
   */
  private async performChat(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    const requestBody = {
      model: this.currentModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      stream: false
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatServiceError(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`,
        'API_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    const data = await response.json();
    
    if (data.error) {
      throw new ChatServiceError(
        `OpenAI error: ${data.error.message}`,
        'MODEL_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 执行流式聊天请求
   */
  private async *performChatStream(messages: ChatMessage[], options: ChatOptions): AsyncIterable<string> {
    const requestBody = {
      model: this.currentModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      stream: true
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatServiceError(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`,
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
        const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.replace('data: ', '');
          
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.error) {
              throw new ChatServiceError(
                `OpenAI error: ${parsed.error.message}`,
                'MODEL_ERROR',
                this.providerId,
                this.currentModel
              );
            }
            
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
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
   * 获取模型的最大 token 数
   */
  private getMaxTokensForModel(modelId: string): number {
    if (modelId.includes('gpt-4-turbo') || modelId.includes('gpt-4o')) {
      return 128000;
    } else if (modelId.includes('gpt-4')) {
      return 8192;
    } else if (modelId.includes('gpt-3.5-turbo')) {
      return 16385;
    }
    return 4096; // 默认值
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    await super.dispose();
    this.logDebug('OpenAI adapter disposed');
  }
}