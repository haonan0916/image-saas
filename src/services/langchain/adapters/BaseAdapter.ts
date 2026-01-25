// 基础模型适配器抽象类
import { 
  ModelAdapter, 
  ChatMessage, 
  ChatOptions, 
  ModelInfo, 
  ModelConfig,
  ChatServiceError,
  TimeoutError
} from '../interfaces';
import { PerformanceManager } from '../performance';
import { ObservabilityManager, LogLevel } from '../observability';
import { ModelProvider } from '../../../types/langchain';

/**
 * 基础模型适配器抽象类
 * 提供所有适配器的通用功能实现
 */
export abstract class BaseAdapter implements ModelAdapter {
  protected config: ModelConfig;
  protected currentModel: string;
  protected isInitialized: boolean = false;
  protected performanceManager?: PerformanceManager;
  protected observabilityManager?: ObservabilityManager;

  constructor(
    public readonly providerId: string,
    public readonly providerName: string,
    config: ModelConfig,
    performanceManager?: PerformanceManager,
    observabilityManager?: ObservabilityManager
  ) {
    this.config = config;
    this.currentModel = config.defaultModel || config.models[0] || '';
    this.performanceManager = performanceManager;
    this.observabilityManager = observabilityManager;
  }

  /**
   * 初始化适配器（子类需要实现）
   */
  abstract initialize(config: ModelConfig): Promise<void>;

  /**
   * 发送聊天请求（子类需要实现）
   */
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;

  /**
   * 流式聊天（子类需要实现）
   */
  abstract chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;

  /**
   * 获取支持的模型列表（子类需要实现）
   */
  abstract getSupportedModels(): Promise<ModelInfo[]>;

  /**
   * 健康检查（子类需要实现）
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * 检查指定模型是否可用
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    try {
      const models = await this.getSupportedModels();
      return models.some(model => model.id === modelId);
    } catch (error) {
      console.error(`Error checking model availability for ${modelId}:`, error);
      return false;
    }
  }

  /**
   * 获取当前使用的模型ID
   */
  getCurrentModel(): string {
    return this.currentModel;
  }

  /**
   * 设置当前使用的模型
   */
  setCurrentModel(modelId: string): void {
    if (!this.config.models.includes(modelId)) {
      throw new ChatServiceError(
        `Model ${modelId} is not supported by provider ${this.providerId}`,
        'UNSUPPORTED_MODEL',
        this.providerId,
        modelId
      );
    }
    this.currentModel = modelId;
  }

  /**
   * 获取适配器配置
   */
  getConfig(): ModelConfig {
    return { ...this.config };
  }

  /**
   * 更新适配器配置
   */
  async updateConfig(config: Partial<ModelConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // 如果更新了默认模型，则切换到新的默认模型
    if (config.defaultModel && config.defaultModel !== this.currentModel) {
      this.setCurrentModel(config.defaultModel);
    }
    
    // 重新初始化适配器
    await this.initialize(this.config);
  }

  /**
   * 清理资源（子类可以重写）
   */
  async dispose(): Promise<void> {
    this.isInitialized = false;
  }

  /**
   * 验证初始化状态
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ChatServiceError(
        `Adapter ${this.providerId} is not initialized`,
        'ADAPTER_NOT_INITIALIZED',
        this.providerId
      );
    }
  }

  /**
   * 验证和清理输入消息
   */
  protected validateAndCleanMessages(messages: ChatMessage[]): ChatMessage[] {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ChatServiceError(
        'Messages array cannot be empty',
        'INVALID_MESSAGES',
        this.providerId
      );
    }

    return messages.map(msg => ({
      role: msg.role,
      content: this.sanitizeContent(msg.content),
      timestamp: msg.timestamp || new Date()
    }));
  }

  /**
   * 清理消息内容
   */
  protected sanitizeContent(content: string): string {
    if (typeof content !== 'string') {
      throw new ChatServiceError(
        'Message content must be a string',
        'INVALID_CONTENT_TYPE',
        this.providerId
      );
    }

    // 基本的内容清理
    return content.trim();
  }

  /**
   * 合并聊天选项
   */
  protected mergeOptions(options?: ChatOptions): ChatOptions {
    const defaultOptions: ChatOptions = {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1.0,
      stream: false,
      timeout: this.config.timeout
    };

    return { ...defaultOptions, ...options };
  }

  /**
   * 创建带超时的 Promise
   */
  protected withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(this.providerId, this.currentModel, timeoutMs));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * 重试机制
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // 如果是最后一次尝试，直接抛出错误
        if (attempt === maxRetries) {
          break;
        }
        
        // 等待一段时间后重试（指数退避）
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * 记录错误日志
   */
  protected logError(error: Error, context?: string): void {
    const logContext = context ? `[${context}] ` : '';
    const message = `${logContext}${this.providerName} Error: ${error.message}`;
    
    // 使用可观测性管理器记录错误
    if (this.observabilityManager) {
      this.observabilityManager.error(message, {
        error: error.message,
        stack: error.stack,
        providerId: this.providerId,
        currentModel: this.currentModel,
        context
      }, this.getModelProvider());
    } else {
      // 回退到控制台日志
      console.error(message, {
        message: error.message,
        stack: error.stack,
        providerId: this.providerId,
        currentModel: this.currentModel
      });
    }
  }

  /**
   * 记录调试日志
   */
  protected logDebug(message: string, data?: unknown): void {
    if (this.observabilityManager) {
      this.observabilityManager.debug(`[${this.providerName}] ${message}`, 
        data ? { data } : undefined, 
        this.getModelProvider()
      );
    } else if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.providerName}] ${message}`, data);
    }
  }

  /**
   * 记录信息日志
   */
  protected logInfo(message: string, data?: unknown): void {
    if (this.observabilityManager) {
      this.observabilityManager.info(`[${this.providerName}] ${message}`, 
        data ? { data } : undefined, 
        this.getModelProvider()
      );
    } else {
      console.info(`[${this.providerName}] ${message}`, data);
    }
  }

  /**
   * 记录警告日志
   */
  protected logWarn(message: string, data?: unknown): void {
    if (this.observabilityManager) {
      this.observabilityManager.warn(`[${this.providerName}] ${message}`, 
        data ? { data } : undefined, 
        this.getModelProvider()
      );
    } else {
      console.warn(`[${this.providerName}] ${message}`, data);
    }
  }

  /**
   * 执行带性能监控的操作
   */
  protected async withPerformanceMonitoring<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    let isError = false;
    let traceId: string | undefined;

    // 开始跟踪
    if (this.observabilityManager) {
      traceId = this.observabilityManager.startTrace(operationName, {
        provider: this.providerId,
        model: this.currentModel
      });
    }

    try {
      this.logDebug(`Starting ${operationName}`);
      const result = await operation();
      this.logDebug(`${operationName} completed successfully`);
      return result;
    } catch (error) {
      isError = true;
      this.logError(error as Error, operationName);
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      
      // 记录性能指标
      this.performanceManager?.recordRequest(responseTime, isError);
      
      // 记录提供商指标
      if (this.observabilityManager) {
        this.observabilityManager.recordProviderMetrics(
          this.getModelProvider(), 
          responseTime, 
          isError
        );
      }
      
      // 结束跟踪
      if (traceId && this.observabilityManager) {
        this.observabilityManager.endSpan(traceId, isError ? 'error' : 'success', {
          responseTime,
          model: this.currentModel
        });
      }
      
      this.logDebug(`${operationName} completed in ${responseTime}ms`, { isError });
    }
  }

  /**
   * 获取缓存的数据
   */
  protected getCachedData<T>(key: string): T | null {
    if (!this.performanceManager) return null;
    
    const cached = this.performanceManager.getCache<T>(key);
    if (cached) {
      this.logDebug(`Cache hit for key: ${key}`);
    }
    return cached;
  }

  /**
   * 设置缓存数据
   */
  protected setCachedData<T>(key: string, data: T, ttl?: number): void {
    if (!this.performanceManager) return;
    
    this.performanceManager.setCache(key, data, ttl);
    this.logDebug(`Data cached for key: ${key}`);
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return this.performanceManager?.getMetrics() || null;
  }

  /**
   * 获取模型提供商枚举值
   */
  protected getModelProvider(): ModelProvider {
    switch (this.providerId.toLowerCase()) {
      case 'ollama':
        return ModelProvider.OLLAMA;
      case 'openai':
        return ModelProvider.OPENAI;
      case 'anthropic':
        return ModelProvider.ANTHROPIC;
      case 'google':
      case 'gemini':
        return ModelProvider.GOOGLE;
      default:
        return ModelProvider.OLLAMA; // 默认值
    }
  }

  /**
   * 获取可观测性指标
   */
  getObservabilityMetrics() {
    if (!this.observabilityManager) return null;
    
    return {
      logs: this.observabilityManager.getLogs(undefined, this.getModelProvider(), 50),
      providerMetrics: this.observabilityManager.getProviderMetrics(this.getModelProvider()),
      healthStatus: this.observabilityManager.getHealthStatus()
    };
  }
}