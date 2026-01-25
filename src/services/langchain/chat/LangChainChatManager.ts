// LangChain 聊天管理器实现
import { 
  ChatManager,
  ModelAdapter,
  FallbackManager
} from '../interfaces';
import { 
  ChatRequest, 
  ChatResponse, 
  ChatStreamChunk, 
  ModelInfo, 
  ModelHealthStatus,
  ModelProvider,
  FallbackStrategy,
  ChatServiceError,
  ChatEventType
} from '../../../types/langchain';
import { LangChainFallbackManager } from '../fallback/LangChainFallbackManager';
import { ModelFactory } from '../factory/ModelFactory';
import { PerformanceManager, PerformanceConfig } from '../performance';
import { ObservabilityManager, ObservabilityConfig } from '../observability';
import { PluginManager } from '../plugins';

/**
 * ChatManager 配置
 */
export interface ChatManagerConfig {
  defaultModel: string;
  fallbackStrategy: FallbackStrategy;
  enableFallback: boolean;
  healthCheckInterval: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
  performanceConfig?: PerformanceConfig;
  observabilityConfig?: ObservabilityConfig;
  enablePlugins?: boolean;
}

/**
 * LangChain 聊天管理器
 * 协调所有模型适配器，提供统一的聊天接口
 */
export class LangChainChatManager implements ChatManager {
  private config: ChatManagerConfig;
  private modelFactory: ModelFactory;
  private fallbackManager: FallbackManager;
  private performanceManager?: PerformanceManager;
  private observabilityManager?: ObservabilityManager;
  private pluginManager?: PluginManager;
  private healthCheckTimer?: NodeJS.Timeout;
  private modelHealthCache: Map<string, ModelHealthStatus> = new Map();
  private lastHealthCheck: Date = new Date(0);

  constructor(
    modelFactory: ModelFactory,
    config: Partial<ChatManagerConfig> = {}
  ) {
    this.modelFactory = modelFactory;
    this.config = {
      defaultModel: 'ollama/llama2',
      fallbackStrategy: FallbackStrategy.SEQUENTIAL,
      enableFallback: true,
      healthCheckInterval: 300000, // 5 minutes
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
      ...config
    };

    // 初始化性能管理器
    if (this.config.performanceConfig) {
      this.performanceManager = new PerformanceManager(this.config.performanceConfig);
    }

    // 初始化可观测性管理器
    if (this.config.observabilityConfig) {
      this.observabilityManager = new ObservabilityManager(this.config.observabilityConfig);
      this.observabilityManager.info('LangChainChatManager initialized', {
        defaultModel: this.config.defaultModel,
        fallbackStrategy: this.config.fallbackStrategy,
        enableFallback: this.config.enableFallback
      });
    }

    // 初始化插件管理器
    if (this.config.enablePlugins !== false) { // 默认启用插件
      this.pluginManager = new PluginManager();
      this.observabilityManager?.info('PluginManager initialized', {
        enablePlugins: true
      });
    }

    this.fallbackManager = new LangChainFallbackManager({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      healthCheckInterval: this.config.healthCheckInterval
    });

    this.startHealthCheckTimer();
  }

  /**
   * 发送消息并获取完整响应
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.withPerformanceMonitoring(async () => {
      const startTime = Date.now();
      
      try {
        // 确定要使用的模型
        const modelId = request.modelId || this.config.defaultModel;
        
        // 获取适配器
        const adapters = await this.getAdaptersForModel(modelId);
        
        if (adapters.length === 0) {
          throw new ChatServiceError(
            `No available adapters for model ${modelId}`,
            'NO_ADAPTERS_AVAILABLE'
          );
        }

        // 执行聊天请求
        let response: string;
        if (this.config.enableFallback && adapters.length > 1) {
          response = await this.fallbackManager.executeChat(
            adapters,
            request.messages,
            request.options,
            this.config.fallbackStrategy
          );
        } else {
          response = await adapters[0].chat(request.messages, request.options);
        }

        // 构建响应
        const chatResponse: ChatResponse = {
          content: response,
          modelId: modelId,
          timestamp: new Date(),
          metadata: {
            responseTime: Date.now() - startTime,
            provider: adapters[0].providerId
          }
        };

        this.emitEvent(ChatEventType.MESSAGE_END, {
          request,
          response: chatResponse,
          duration: Date.now() - startTime
        });

        return chatResponse;
      } catch (error) {
        this.emitEvent(ChatEventType.ERROR, {
          request,
          error: error as Error,
          duration: Date.now() - startTime
        });
        
        throw error;
      }
    }, 'sendMessage');
  }

  /**
   * 发送消息并获取流式响应
   */
  async *sendMessageStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const startTime = Date.now();
    
    try {
      // 确定要使用的模型
      const modelId = request.modelId || this.config.defaultModel;
      
      // 获取适配器
      const adapters = await this.getAdaptersForModel(modelId);
      
      if (adapters.length === 0) {
        throw new ChatServiceError(
          `No available adapters for model ${modelId}`,
          'NO_ADAPTERS_AVAILABLE'
        );
      }

      this.emitEvent(ChatEventType.MESSAGE_START, {
        request,
        modelId
      });

      // 执行流式聊天请求
      let streamGenerator: AsyncIterable<string>;
      if (this.config.enableFallback && adapters.length > 1) {
        streamGenerator = this.fallbackManager.executeChatStream(
          adapters,
          request.messages,
          request.options,
          this.config.fallbackStrategy
        );
      } else {
        streamGenerator = adapters[0].chatStream(request.messages, request.options);
      }

      // 转换为 ChatStreamChunk 格式
      let isFirst = true;
      for await (const chunk of streamGenerator) {
        const streamChunk: ChatStreamChunk = {
          content: chunk,
          isComplete: false,
          modelId: modelId,
          timestamp: new Date()
        };

        if (isFirst) {
          this.emitEvent(ChatEventType.MESSAGE_CHUNK, {
            request,
            chunk: streamChunk,
            isFirst: true
          });
          isFirst = false;
        } else {
          this.emitEvent(ChatEventType.MESSAGE_CHUNK, {
            request,
            chunk: streamChunk,
            isFirst: false
          });
        }

        yield streamChunk;
      }

      // 发送完成标记
      const finalChunk: ChatStreamChunk = {
        content: '',
        isComplete: true,
        modelId: modelId,
        timestamp: new Date()
      };

      this.emitEvent(ChatEventType.MESSAGE_END, {
        request,
        chunk: finalChunk,
        duration: Date.now() - startTime
      });

      yield finalChunk;
    } catch (error) {
      this.emitEvent(ChatEventType.ERROR, {
        request,
        error: error as Error,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * 获取所有可用模型列表
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    return this.modelFactory.getAvailableModels();
  }

  /**
   * 检查指定模型是否可用
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    try {
      const adapters = await this.getAdaptersForModel(modelId);
      return adapters.length > 0;
    } catch (_error) {
      return false;
    }
  }

  /**
   * 设置默认模型
   */
  setDefaultModel(modelId: string): void {
    this.config.defaultModel = modelId;
  }

  /**
   * 获取当前默认模型
   */
  getDefaultModel(): string {
    return this.config.defaultModel;
  }

  /**
   * 获取所有模型的健康状态
   */
  async getModelHealth(): Promise<ModelHealthStatus[]> {
    // 如果缓存还新鲜，直接返回缓存
    const cacheAge = Date.now() - this.lastHealthCheck.getTime();
    if (cacheAge < 60000 && this.modelHealthCache.size > 0) { // 1分钟缓存
      return Array.from(this.modelHealthCache.values());
    }

    const healthStatuses: ModelHealthStatus[] = [];
    const activeAdapters = this.modelFactory.getActiveAdapters();

    // 执行健康检查
    const healthResults = await this.modelFactory.performHealthChecks();

    for (const [providerId, adapter] of activeAdapters) {
      const isHealthy = healthResults.get(providerId) || false;
      
      try {
        const models = await adapter.getSupportedModels();
        
        for (const model of models) {
          const healthStatus: ModelHealthStatus = {
            modelId: model.id,
            providerId: adapter.providerId,
            isHealthy,
            lastChecked: new Date(),
            availability: isHealthy ? 100 : 0
          };
          
          healthStatuses.push(healthStatus);
          this.modelHealthCache.set(model.id, healthStatus);
        }
      } catch (error) {
        // 如果获取模型列表失败，创建一个通用的健康状态
        const healthStatus: ModelHealthStatus = {
          modelId: `${adapter.providerId}/unknown`,
          providerId: adapter.providerId,
          isHealthy: false,
          lastChecked: new Date(),
          errorMessage: (error as Error).message,
          availability: 0
        };
        
        healthStatuses.push(healthStatus);
        this.modelHealthCache.set(healthStatus.modelId, healthStatus);
      }
    }

    this.lastHealthCheck = new Date();
    return healthStatuses;
  }

  /**
   * 刷新模型列表和状态
   */
  async refreshModels(): Promise<void> {
    // 清除缓存
    this.modelHealthCache.clear();
    this.lastHealthCheck = new Date(0);
    
    // 刷新模型工厂
    await this.modelFactory.refreshAdapters();
    
    // 重新获取健康状态
    await this.getModelHealth();
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.fallbackManager.dispose();
    this.modelHealthCache.clear();
  }

  /**
   * 根据模型ID获取适配器
   */
  private async getAdaptersForModel(modelId: string): Promise<ModelAdapter[]> {
    // 解析模型ID (格式: provider/model 或 provider:model)
    const [providerId, modelName] = modelId.split(/[\/:]/, 2);
    
    if (!providerId) {
      throw new ChatServiceError(
        `Invalid model ID format: ${modelId}. Expected format: provider/model`,
        'INVALID_MODEL_ID'
      );
    }

    // 获取指定提供商的适配器
    const adapter = this.modelFactory.getActiveAdapter(providerId as ModelProvider);
    if (!adapter) {
      throw new ChatServiceError(
        `No active adapter found for provider: ${providerId}`,
        'ADAPTER_NOT_FOUND'
      );
    }

    // 检查适配器是否支持指定模型
    if (modelName) {
      try {
        const supportedModels = await adapter.getSupportedModels();
        const modelExists = supportedModels.some((model: ModelInfo) => 
          model.id === modelName || model.id === modelId
        );
        
        if (!modelExists) {
          throw new ChatServiceError(
            `Model ${modelName} not supported by provider ${providerId}`,
            'MODEL_NOT_SUPPORTED'
          );
        }
      } catch (error) {
        console.warn(`Could not verify model support for ${modelId}:`, error);
      }
    }

    return [adapter];
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheckTimer(): void {
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(async () => {
        try {
          await this.getModelHealth();
        } catch (error) {
          console.error('Health check failed:', error);
        }
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(type: ChatEventType, data: Record<string, unknown>): void {
    // 这里可以集成事件系统，比如 EventEmitter
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[ChatManager] Event: ${type}`, data);
    }
  }

  /**
   * 执行带性能监控的操作
   */
  private async withPerformanceMonitoring<T>(
    operation: () => Promise<T>,
    _operationName: string
  ): Promise<T> {
    if (!this.performanceManager) {
      return operation();
    }

    return this.performanceManager.withTimeout(operation, this.config.requestTimeout);
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return this.performanceManager?.getMetrics() || null;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.performanceManager?.getCacheStats() || null;
  }

  /**
   * 重置性能指标
   */
  resetPerformanceMetrics(): void {
    this.performanceManager?.resetMetrics();
  }
}