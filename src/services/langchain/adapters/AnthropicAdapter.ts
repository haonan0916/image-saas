// Anthropic Claude 模型适配器
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
 * Anthropic 适配器配置
 */
export interface AnthropicConfig extends ModelConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Anthropic Claude 模型适配器
 * 实现与 Anthropic API 的集成
 */
export class AnthropicAdapter extends BaseAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AnthropicConfig) {
    super(ModelProvider.ANTHROPIC, 'Anthropic Claude Models', config);
    
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

    if (!this.apiKey) {
      throw new ChatServiceError(
        'Anthropic API key is required',
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
          'Failed to connect to Anthropic API',
          'CONNECTION_FAILED',
          this.providerId
        );
      }
      
      this.isInitialized = true;
      this.logDebug('Anthropic adapter initialized successfully');
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
    // Anthropic 没有公开的模型列表 API，返回已知的模型
    const knownModels = [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        maxTokens: 200000
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        maxTokens: 200000
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        maxTokens: 200000
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        maxTokens: 200000
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        maxTokens: 200000
      }
    ];

    return knownModels.map(model => ({
      id: model.id,
      name: model.name,
      providerId: this.providerId,
      capabilities: {
        supportsStreaming: true,
        supportsFunctions: true,
        maxTokens: model.maxTokens,
        supportedLanguages: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'ru', 'ar', 'it', 'nl']
      },
      metadata: {
        family: 'claude-3'
      }
    }));
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 发送一个简单的测试请求
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        }),
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      return response.ok || response.status === 400; // 400 可能是参数错误，但说明 API 可达
    } catch (error) {
      this.logDebug('Health check failed', error);
      return false;
    }
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
  }

  /**
   * 执行聊天请求
   */
  private async performChat(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    const { system, userMessages } = this.formatMessages(messages);
    
    const requestBody: any = {
      model: this.currentModel,
      max_tokens: options.maxTokens || 4096,
      messages: userMessages,
      temperature: options.temperature,
      top_p: options.topP,
      stream: false
    };

    if (system) {
      requestBody.system = system;
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatServiceError(
        `Anthropic API error: ${errorData.error?.message || response.statusText}`,
        'API_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    const data = await response.json();
    
    if (data.error) {
      throw new ChatServiceError(
        `Anthropic error: ${data.error.message}`,
        'MODEL_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    return data.content?.[0]?.text || '';
  }

  /**
   * 执行流式聊天请求
   */
  private async *performChatStream(messages: ChatMessage[], options: ChatOptions): AsyncIterable<string> {
    const { system, userMessages } = this.formatMessages(messages);
    
    const requestBody: any = {
      model: this.currentModel,
      max_tokens: options.maxTokens || 4096,
      messages: userMessages,
      temperature: options.temperature,
      top_p: options.topP,
      stream: true
    };

    if (system) {
      requestBody.system = system;
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatServiceError(
        `Anthropic API error: ${errorData.error?.message || response.statusText}`,
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
                `Anthropic error: ${parsed.error.message}`,
                'MODEL_ERROR',
                this.providerId,
                this.currentModel
              );
            }
            
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
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
   * 格式化消息以符合 Anthropic API 要求
   */
  private formatMessages(messages: ChatMessage[]): { system?: string; userMessages: any[] } {
    let system: string | undefined;
    const userMessages: any[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // Anthropic 将系统消息单独处理
        system = message.content;
      } else {
        userMessages.push({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content
        });
      }
    }

    return { system, userMessages };
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    await super.dispose();
    this.logDebug('Anthropic adapter disposed');
  }
}