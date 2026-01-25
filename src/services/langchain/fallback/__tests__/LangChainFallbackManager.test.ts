// LangChain 回退管理器测试
import { LangChainFallbackManager } from '../LangChainFallbackManager';
import { BaseAdapter } from '../../adapters/BaseAdapter';
import { 
  ModelConfig, 
  ModelProvider, 
  ChatMessage, 
  ModelInfo,
  FallbackStrategy,
  ChatServiceError
} from '../../interfaces';

// 创建测试用的适配器类
class TestAdapter extends BaseAdapter {
  private shouldFail: boolean = false;
  private failureCount: number = 0;
  private healthStatus: boolean = true;

  constructor(
    providerId: string,
    providerName: string,
    config: ModelConfig,
    options: {
      shouldFail?: boolean;
      healthStatus?: boolean;
    } = {}
  ) {
    super(providerId, providerName, config);
    this.shouldFail = options.shouldFail || false;
    this.healthStatus = options.healthStatus !== undefined ? options.healthStatus : true;
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    if (this.shouldFail) {
      this.failureCount++;
      throw new ChatServiceError(
        `Test adapter ${this.providerId} failed`,
        'TEST_FAILURE',
        this.providerId
      );
    }
    return `Response from ${this.providerId}`;
  }

  async *chatStream(messages: ChatMessage[]): AsyncIterable<string> {
    if (this.shouldFail) {
      this.failureCount++;
      throw new ChatServiceError(
        `Test stream adapter ${this.providerId} failed`,
        'TEST_STREAM_FAILURE',
        this.providerId
      );
    }

    const chunks = ['Hello', ' ', 'World'];
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  async getSupportedModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'test-model',
        name: 'Test Model',
        providerId: this.providerId as ModelProvider,
        capabilities: {
          supportsStreaming: true,
          supportsFunctions: false,
          maxTokens: 4096,
          supportedLanguages: ['en']
        }
      }
    ];
  }

  async healthCheck(): Promise<boolean> {
    return this.healthStatus;
  }

  // 测试辅助方法
  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
    this.failureCount = 0;
  }

  setHealthStatus(status: boolean): void {
    this.healthStatus = status;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * **Feature: langchain-multi-model-integration, Property 5: Fallback Strategy Effectiveness**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 * 
 * Property-based test for fallback strategy effectiveness.
 * For any model failure scenario, the system should attempt configured fallback models 
 * and provide meaningful error messages when all options are exhausted.
 */
describe('LangChainFallbackManager - Property 5: Fallback Strategy Effectiveness', () => {
  let fallbackManager: LangChainFallbackManager;
  
  beforeEach(() => {
    fallbackManager = new LangChainFallbackManager({
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 5000,
      healthCheckInterval: 0 // 禁用定时器以避免测试干扰
    });
  });

  afterEach(() => {
    fallbackManager.dispose();
  });

  /**
   * Property: Fallback execution with working adapter
   * For any list of adapters where at least one works, 
   * the fallback manager should return a successful result
   */
  test('should succeed when at least one adapter works', async () => {
    // 创建一个失败的适配器和一个工作的适配器
    const failingAdapter = new TestAdapter(
      'failing-provider',
      'Failing Provider',
      { enabled: true, timeout: 5000, retryAttempts: 1, models: ['test'] } as ModelConfig,
      { shouldFail: true }
    );
    
    const workingAdapter = new TestAdapter(
      'working-provider',
      'Working Provider',
      { enabled: true, timeout: 5000, retryAttempts: 1, models: ['test'] } as ModelConfig,
      { shouldFail: false }
    );

    const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
    
    // 执行测试
    const result = await fallbackManager.executeWithFallback(
      [failingAdapter, workingAdapter],
      (adapter) => adapter.chat(messages),
      FallbackStrategy.SEQUENTIAL
    );
    
    // 验证：应该得到成功的结果
    expect(result).toBeDefined();
    expect(result).toBe('Response from working-provider');
    
    // 验证：失败的适配器应该被尝试过
    expect(failingAdapter.getFailureCount()).toBeGreaterThan(0);
  });

  /**
   * Property: All adapters fail scenario
   * For any list of adapters where all fail,
   * the fallback manager should throw a meaningful error
   */
  test('should throw meaningful error when all adapters fail', async () => {
    // 创建多个都会失败的适配器
    const adapters = [
      new TestAdapter(
        'failing-provider-1',
        'Failing Provider 1',
        { enabled: true, timeout: 5000, retryAttempts: 1, models: ['test'] } as ModelConfig,
        { shouldFail: true }
      ),
      new TestAdapter(
        'failing-provider-2',
        'Failing Provider 2',
        { enabled: true, timeout: 5000, retryAttempts: 1, models: ['test'] } as ModelConfig,
        { shouldFail: true }
      )
    ];

    const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
    
    // 执行测试并验证错误
    await expect(
      fallbackManager.executeWithFallback(
        adapters,
        (adapter) => adapter.chat(messages),
        FallbackStrategy.SEQUENTIAL
      )
    ).rejects.toThrow(ChatServiceError);
    
    // 验证所有适配器都被尝试过
    for (const adapter of adapters) {
      expect(adapter.getFailureCount()).toBeGreaterThan(0);
    }
  });

  /**
   * Property: Circuit breaker effectiveness
   * For any adapter that fails repeatedly,
   * the circuit breaker should open and skip the adapter
   */
  test('should open circuit breaker after repeated failures', async () => {
    const adapter = new TestAdapter(
      'circuit-test-provider',
      'Circuit Test Provider',
      { enabled: true, timeout: 5000, retryAttempts: 1, models: ['test'] } as ModelConfig,
      { shouldFail: true }
    );

    const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
    
    // 触发足够多的失败以开启熔断器
    const failureThreshold = 3;
    for (let i = 0; i < failureThreshold; i++) {
      try {
        await fallbackManager.executeWithFallback(
          [adapter],
          (adapter) => adapter.chat(messages),
          FallbackStrategy.SEQUENTIAL
        );
      } catch (error) {
        // 预期的失败
      }
    }
    
    // 验证熔断器状态
    const stats = fallbackManager.getFailureStats('circuit-test-provider' as ModelProvider);
    expect(stats.isCircuitBreakerOpen).toBe(true);
    expect(stats.failureCount).toBeGreaterThanOrEqual(failureThreshold);
  });
});