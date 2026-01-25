// LangChain 回退管理器实现
import { 
  FallbackManager, 
  FailureStats, 
  FallbackStrategy,
  ModelAdapter,
  ModelProvider,
  ChatMessage,
  ChatOptions,
  ChatServiceError,
  TimeoutError
} from '../interfaces';

/**
 * 回退配置
 */
export interface FallbackConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  healthCheckInterval: number;
}

/**
 * 适配器状态
 */
interface AdapterState {
  isHealthy: boolean;
  failureCount: number;
  lastFailureTime: number;
  circuitBreakerOpenTime?: number;
  totalRequests: number;
  successfulRequests: number;
}

/**
 * LangChain 回退管理器
 * 实现多模型提供商的回退和错误恢复策略
 */
export class LangChainFallbackManager implements FallbackManager {
  private config: FallbackConfig;
  private adapterStates: Map<ModelProvider, AdapterState> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      healthCheckInterval: 30000,
      ...config
    };

    this.startHealthCheckTimer();
  }

  /**
   * 执行带回退的操作
   */
  async executeWithFallback<T>(
    adapters: ModelAdapter[],
    operation: (adapter: ModelAdapter) => Promise<T>,
    strategy: FallbackStrategy = FallbackStrategy.SEQUENTIAL
  ): Promise<T> {
    if (adapters.length === 0) {
      throw new ChatServiceError(
        'No adapters provided for fallback execution',
        'NO_ADAPTERS_AVAILABLE'
      );
    }

    const sortedAdapters = this.sortAdaptersByStrategy(adapters, strategy);
    let lastError: Error | null = null;

    for (const adapter of sortedAdapters) {
      const providerId = adapter.providerId as ModelProvider;
      
      // 检查熔断器状态
      if (this.isCircuitBreakerOpen(providerId)) {
        this.logDebug(`Circuit breaker is open for provider ${providerId}, skipping`);
        continue;
      }

      try {
        // 更新统计信息
        this.updateStats(providerId, 'request');
        
        // 执行操作
        const result = await this.executeWithRetry(adapter, operation);
        
        // 操作成功，更新统计信息
        this.updateStats(providerId, 'success');
        this.resetFailureCount(providerId);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // 更新失败统计信息
        this.updateStats(providerId, 'failure');
        
        this.logError(error as Error, `Adapter ${providerId} failed`);
        
        // 如果这是最后一个适配器，不继续尝试
        if (adapter === sortedAdapters[sortedAdapters.length - 1]) {
          break;
        }
        
        // 等待一段时间后尝试下一个适配器
        await this.delay(this.config.baseDelay);
      }
    }

    // 所有适配器都失败了
    throw new ChatServiceError(
      `All adapters failed. Last error: ${lastError?.message || 'Unknown error'}`,
      'ALL_ADAPTERS_FAILED',
      undefined,
      undefined,
      lastError
    );
  }

  /**
   * 执行带回退的聊天操作
   */
  async executeChat(
    adapters: ModelAdapter[],
    messages: ChatMessage[],
    options?: ChatOptions,
    strategy: FallbackStrategy = FallbackStrategy.SEQUENTIAL
  ): Promise<string> {
    return this.executeWithFallback(
      adapters,
      (adapter) => adapter.chat(messages, options),
      strategy
    );
  }

  /**
   * 执行带回退的流式聊天操作
   */
  async *executeChatStream(
    adapters: ModelAdapter[],
    messages: ChatMessage[],
    options?: ChatOptions,
    strategy: FallbackStrategy = FallbackStrategy.SEQUENTIAL
  ): AsyncIterable<string> {
    const sortedAdapters = this.sortAdaptersByStrategy(adapters, strategy);
    let lastError: Error | null = null;

    for (const adapter of sortedAdapters) {
      const providerId = adapter.providerId as ModelProvider;
      
      // 检查熔断器状态
      if (this.isCircuitBreakerOpen(providerId)) {
        this.logDebug(`Circuit breaker is open for provider ${providerId}, skipping`);
        continue;
      }

      try {
        // 更新统计信息
        this.updateStats(providerId, 'request');
        
        // 执行流式操作
        let hasYieldedContent = false;
        for await (const chunk of adapter.chatStream(messages, options)) {
          hasYieldedContent = true;
          yield chunk;
        }
        
        // 如果成功产生了内容，更新统计信息并返回
        if (hasYieldedContent) {
          this.updateStats(providerId, 'success');
          this.resetFailureCount(providerId);
          return;
        }
      } catch (error) {
        lastError = error as Error;
        
        // 更新失败统计信息
        this.updateStats(providerId, 'failure');
        
        this.logError(error as Error, `Stream adapter ${providerId} failed`);
        
        // 如果这是最后一个适配器，不继续尝试
        if (adapter === sortedAdapters[sortedAdapters.length - 1]) {
          break;
        }
        
        // 等待一段时间后尝试下一个适配器
        await this.delay(this.config.baseDelay);
      }
    }

    // 所有适配器都失败了
    throw new ChatServiceError(
      `All stream adapters failed. Last error: ${lastError?.message || 'Unknown error'}`,
      'ALL_ADAPTERS_FAILED',
      undefined,
      undefined,
      lastError
    );
  }

  /**
   * 获取失败统计信息
   */
  getFailureStats(providerId: ModelProvider): FailureStats {
    const state = this.getAdapterState(providerId);
    
    return {
      providerId,
      failureCount: state.failureCount,
      lastFailureTime: state.lastFailureTime > 0 ? new Date(state.lastFailureTime) : undefined,
      isHealthy: state.isHealthy,
      successRate: state.totalRequests > 0 ? state.successfulRequests / state.totalRequests : 0,
      totalRequests: state.totalRequests,
      isCircuitBreakerOpen: this.isCircuitBreakerOpen(providerId)
    };
  }

  /**
   * 获取所有提供商的失败统计信息
   */
  getAllFailureStats(): FailureStats[] {
    return Array.from(this.adapterStates.keys()).map(providerId => 
      this.getFailureStats(providerId)
    );
  }

  /**
   * 重置失败统计信息
   */
  resetFailureStats(providerId?: ModelProvider): void {
    if (providerId) {
      this.resetFailureCount(providerId);
    } else {
      // 重置所有提供商的统计信息
      for (const providerId of this.adapterStates.keys()) {
        this.resetFailureCount(providerId);
      }
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(adapters: ModelAdapter[]): Promise<Map<ModelProvider, boolean>> {
    const healthResults = new Map<ModelProvider, boolean>();
    
    const healthCheckPromises = adapters.map(async (adapter) => {
      const providerId = adapter.providerId as ModelProvider;
      
      try {
        const isHealthy = await adapter.healthCheck();
        healthResults.set(providerId, isHealthy);
        
        // 更新适配器状态
        const state = this.getAdapterState(providerId);
        state.isHealthy = isHealthy;
        
        // 如果健康检查通过且熔断器是开启的，尝试关闭熔断器
        if (isHealthy && this.isCircuitBreakerOpen(providerId)) {
          this.closeCircuitBreaker(providerId);
        }
      } catch (error) {
        healthResults.set(providerId, false);
        
        // 更新适配器状态
        const state = this.getAdapterState(providerId);
        state.isHealthy = false;
        
        this.logError(error as Error, `Health check failed for provider ${providerId}`);
      }
    });
    
    await Promise.allSettled(healthCheckPromises);
    
    return healthResults;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.adapterStates.clear();
  }

  /**
   * 根据策略排序适配器
   */
  private sortAdaptersByStrategy(adapters: ModelAdapter[], strategy: FallbackStrategy): ModelAdapter[] {
    switch (strategy) {
      case FallbackStrategy.SEQUENTIAL:
        return [...adapters];
        
      case FallbackStrategy.PRIORITY:
        // 按成功率排序，成功率高的优先
        return [...adapters].sort((a, b) => {
          const statsA = this.getFailureStats(a.providerId as ModelProvider);
          const statsB = this.getFailureStats(b.providerId as ModelProvider);
          return statsB.successRate - statsA.successRate;
        });
        
      case FallbackStrategy.ROUND_ROBIN:
        // 简单的轮询实现，可以根据需要改进
        return [...adapters];
        
      default:
        return [...adapters];
    }
  }

  /**
   * 执行带重试的操作
   */
  private async executeWithRetry<T>(
    adapter: ModelAdapter,
    operation: (adapter: ModelAdapter) => Promise<T>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation(adapter);
      } catch (error) {
        lastError = error as Error;
        
        // 如果是最后一次尝试，直接抛出错误
        if (attempt === this.config.maxRetries) {
          break;
        }
        
        // 计算延迟时间（指数退避）
        const delay = Math.min(
          this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt),
          this.config.maxDelay
        );
        
        this.logDebug(`Retry attempt ${attempt + 1} for ${adapter.providerId} after ${delay}ms`);
        
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * 获取适配器状态
   */
  private getAdapterState(providerId: ModelProvider): AdapterState {
    if (!this.adapterStates.has(providerId)) {
      this.adapterStates.set(providerId, {
        isHealthy: true,
        failureCount: 0,
        lastFailureTime: 0,
        totalRequests: 0,
        successfulRequests: 0
      });
    }
    
    return this.adapterStates.get(providerId)!;
  }

  /**
   * 更新统计信息
   */
  private updateStats(providerId: ModelProvider, type: 'request' | 'success' | 'failure'): void {
    const state = this.getAdapterState(providerId);
    
    switch (type) {
      case 'request':
        state.totalRequests++;
        break;
        
      case 'success':
        state.successfulRequests++;
        break;
        
      case 'failure':
        state.failureCount++;
        state.lastFailureTime = Date.now();
        
        // 检查是否需要开启熔断器
        if (state.failureCount >= this.config.circuitBreakerThreshold) {
          this.openCircuitBreaker(providerId);
        }
        break;
    }
  }

  /**
   * 重置失败计数
   */
  private resetFailureCount(providerId: ModelProvider): void {
    const state = this.getAdapterState(providerId);
    state.failureCount = 0;
    state.lastFailureTime = 0;
    state.isHealthy = true;
    
    // 关闭熔断器
    this.closeCircuitBreaker(providerId);
  }

  /**
   * 检查熔断器是否开启
   */
  private isCircuitBreakerOpen(providerId: ModelProvider): boolean {
    const state = this.getAdapterState(providerId);
    
    if (!state.circuitBreakerOpenTime) {
      return false;
    }
    
    // 检查熔断器超时时间
    const now = Date.now();
    if (now - state.circuitBreakerOpenTime > this.config.circuitBreakerTimeout) {
      // 超时后自动关闭熔断器
      this.closeCircuitBreaker(providerId);
      return false;
    }
    
    return true;
  }

  /**
   * 开启熔断器
   */
  private openCircuitBreaker(providerId: ModelProvider): void {
    const state = this.getAdapterState(providerId);
    state.circuitBreakerOpenTime = Date.now();
    state.isHealthy = false;
    
    this.logDebug(`Circuit breaker opened for provider ${providerId}`);
  }

  /**
   * 关闭熔断器
   */
  private closeCircuitBreaker(providerId: ModelProvider): void {
    const state = this.getAdapterState(providerId);
    delete state.circuitBreakerOpenTime;
    
    this.logDebug(`Circuit breaker closed for provider ${providerId}`);
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheckTimer(): void {
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(() => {
        // 健康检查逻辑将在需要时由外部调用
        this.logDebug('Health check timer triggered');
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录调试日志
   */
  private logDebug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[FallbackManager] ${message}`, data);
    }
  }

  /**
   * 记录错误日志
   */
  private logError(error: Error, context?: string): void {
    const logContext = context ? `[${context}] ` : '';
    console.error(`${logContext}FallbackManager Error:`, {
      message: error.message,
      stack: error.stack
    });
  }
}