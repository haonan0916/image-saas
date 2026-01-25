// Ollama 模型适配器
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
import { PerformanceManager } from '../performance';

/**
 * Ollama 适配器配置
 */
export interface OllamaConfig extends ModelConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

/**
 * Ollama 模型适配器
 * 实现与本地 Ollama 服务的集成
 */
export class OllamaAdapter extends BaseAdapter {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: OllamaConfig, performanceManager?: PerformanceManager) {
    super(ModelProvider.OLLAMA, 'Ollama Local Models', config, performanceManager);
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  /**
   * 初始化适配器
   */
  async initialize(config: ModelConfig): Promise<void> {
    this.config = config;
    
    try {
      // 测试连接
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new ChatServiceError(
          'Failed to connect to Ollama service',
          'CONNECTION_FAILED',
          this.providerId
        );
      }
      
      this.isInitialized = true;
      this.logDebug('Ollama adapter initialized successfully');
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
    
    // 检查缓存
    const cacheKey = this.generateCacheKey(cleanMessages, mergedOptions);
    const cachedResult = this.getCachedData<string>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    try {
      const result = await this.withPerformanceMonitoring(
        () => this.withTimeout(
          this.withRetry(() => this.performChat(cleanMessages, mergedOptions)),
          mergedOptions.timeout || this.config.timeout
        ),
        'ollama-chat'
      );
      
      // 缓存结果
      this.setCachedData(cacheKey, result, 300000); // 5分钟缓存
      
      return result;
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
    // 检查缓存
    const cacheKey = `${this.providerId}:models`;
    const cachedModels = this.getCachedData<ModelInfo[]>(cacheKey);
    if (cachedModels) {
      return cachedModels;
    }

    try {
      const models = await this.withPerformanceMonitoring(
        async () => {
          const response = await fetch(`${this.baseUrl}/api/tags`, {
            method: 'GET',
            headers: this.headers
          });

          if (!response.ok) {
            throw new ChatServiceError(
              `Failed to fetch models: ${response.statusText}`,
              'API_ERROR',
              this.providerId
            );
          }

          const data = await response.json();
          
          return (data.models || []).map((model: any) => ({
            id: model.name,
            name: model.name,
            providerId: this.providerId,
            capabilities: {
              supportsStreaming: true,
              supportsFunctions: false,
              maxTokens: 4096, // 默认值，实际可能不同
              supportedLanguages: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko']
            },
            metadata: {
              size: model.size,
              modified_at: model.modified_at,
              digest: model.digest
            }
          }));
        },
        'ollama-get-models'
      );

      // 缓存模型列表
      this.setCachedData(cacheKey, models, 600000); // 10分钟缓存
      
      return models;
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
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: this.headers,
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
    const requestBody = {
      model: this.currentModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: false,
      options: {
        temperature: options.temperature,
        top_p: options.topP,
        num_predict: options.maxTokens
      }
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new ChatServiceError(
        `Ollama API error: ${response.statusText}`,
        'API_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    const data = await response.json();
    
    if (data.error) {
      throw new ChatServiceError(
        `Ollama error: ${data.error}`,
        'MODEL_ERROR',
        this.providerId,
        this.currentModel
      );
    }

    return data.message?.content || '';
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
      stream: true,
      options: {
        temperature: options.temperature,
        top_p: options.topP,
        num_predict: options.maxTokens
      }
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new ChatServiceError(
        `Ollama API error: ${response.statusText}`,
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
                `Ollama error: ${data.error}`,
                'MODEL_ERROR',
                this.providerId,
                this.currentModel
              );
            }
            
            if (data.message?.content) {
              yield data.message.content;
            }
            
            if (data.done) {
              return;
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
   * 清理资源
   */
  async dispose(): Promise<void> {
    await super.dispose();
    this.logDebug('Ollama adapter disposed');
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(messages: ChatMessage[], options: ChatOptions): string {
    const messageHash = messages.map(m => `${m.role}:${m.content}`).join('|');
    const optionsHash = `${options.temperature}:${options.maxTokens}:${options.topP}`;
    return `${this.providerId}:${this.currentModel}:${messageHash}:${optionsHash}`;
  }
}