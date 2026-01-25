// 模型工厂类
import { 
  ModelAdapter, 
  ModelConfig, 
  ModelInfo,
  ModelProvider,
  ChatServiceError,
  ConfigurationError
} from '../interfaces';

/**
 * 模型适配器构造函数类型
 */
export type AdapterConstructor = new (config: ModelConfig) => ModelAdapter;

/**
 * 适配器注册信息
 */
export interface AdapterRegistration {
  constructor: AdapterConstructor;
  providerId: ModelProvider;
  providerName: string;
  isEnabled: boolean;
}

/**
 * 模型工厂类
 * 负责创建、管理和发现不同的模型适配器
 */
export class ModelFactory {
  private static instance: ModelFactory | null = null;
  private adapterRegistry: Map<ModelProvider, AdapterRegistration> = new Map();
  private activeAdapters: Map<ModelProvider, ModelAdapter> = new Map();

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  /**
   * 获取模型工厂单例实例
   */
  public static getInstance(): ModelFactory {
    if (!ModelFactory.instance) {
      ModelFactory.instance = new ModelFactory();
    }
    return ModelFactory.instance;
  }

  /**
   * 注册模型适配器
   */
  public registerAdapter(
    providerId: ModelProvider,
    constructor: AdapterConstructor,
    providerName: string,
    isEnabled: boolean = true
  ): void {
    if (this.adapterRegistry.has(providerId)) {
      throw new ConfigurationError(`Adapter for provider '${providerId}' is already registered`);
    }

    this.adapterRegistry.set(providerId, {
      constructor,
      providerId,
      providerName,
      isEnabled
    });

    console.log(`Registered adapter for provider: ${providerName} (${providerId})`);
  }

  /**
   * 取消注册模型适配器
   */
  public unregisterAdapter(providerId: ModelProvider): void {
    // 先清理活跃的适配器实例
    if (this.activeAdapters.has(providerId)) {
      const adapter = this.activeAdapters.get(providerId);
      if (adapter) {
        adapter.dispose().catch(error => {
          console.error(`Error disposing adapter for ${providerId}:`, error);
        });
      }
      this.activeAdapters.delete(providerId);
    }

    // 从注册表中移除
    this.adapterRegistry.delete(providerId);
    console.log(`Unregistered adapter for provider: ${providerId}`);
  }

  /**
   * 创建模型适配器实例
   */
  public async createAdapter(providerId: ModelProvider, config: ModelConfig): Promise<ModelAdapter> {
    const registration = this.adapterRegistry.get(providerId);
    if (!registration) {
      throw new ConfigurationError(`No adapter registered for provider '${providerId}'`);
    }

    if (!registration.isEnabled) {
      throw new ConfigurationError(`Adapter for provider '${providerId}' is disabled`);
    }

    try {
      // 创建适配器实例
      const adapter = new registration.constructor(config);
      
      // 初始化适配器
      await adapter.initialize(config);
      
      // 缓存活跃的适配器
      this.activeAdapters.set(providerId, adapter);
      
      console.log(`Created and initialized adapter for provider: ${providerId}`);
      return adapter;
    } catch (error) {
      console.error(`Failed to create adapter for provider '${providerId}':`, error);
      throw new ChatServiceError(
        `Failed to create adapter for provider '${providerId}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ADAPTER_CREATION_FAILED',
        providerId
      );
    }
  }

  /**
   * 获取或创建模型适配器实例
   */
  public async getOrCreateAdapter(providerId: ModelProvider, config: ModelConfig): Promise<ModelAdapter> {
    // 检查是否已有活跃的适配器
    const existingAdapter = this.activeAdapters.get(providerId);
    if (existingAdapter) {
      // 检查配置是否有变化
      const currentConfig = existingAdapter.getConfig();
      if (this.isConfigEqual(currentConfig, config)) {
        return existingAdapter;
      } else {
        // 配置有变化，更新适配器配置
        await existingAdapter.updateConfig(config);
        return existingAdapter;
      }
    }

    // 创建新的适配器实例
    return this.createAdapter(providerId, config);
  }

  /**
   * 获取活跃的适配器实例
   */
  public getActiveAdapter(providerId: ModelProvider): ModelAdapter | null {
    return this.activeAdapters.get(providerId) || null;
  }

  /**
   * 获取所有活跃的适配器
   */
  public getActiveAdapters(): Map<ModelProvider, ModelAdapter> {
    return new Map(this.activeAdapters);
  }

  /**
   * 检查适配器是否已注册
   */
  public isAdapterRegistered(providerId: ModelProvider): boolean {
    return this.adapterRegistry.has(providerId);
  }

  /**
   * 检查适配器是否启用
   */
  public isAdapterEnabled(providerId: ModelProvider): boolean {
    const registration = this.adapterRegistry.get(providerId);
    return registration?.isEnabled || false;
  }

  /**
   * 启用/禁用适配器
   */
  public setAdapterEnabled(providerId: ModelProvider, enabled: boolean): void {
    const registration = this.adapterRegistry.get(providerId);
    if (!registration) {
      throw new ConfigurationError(`No adapter registered for provider '${providerId}'`);
    }

    registration.isEnabled = enabled;

    // 如果禁用适配器，清理活跃实例
    if (!enabled && this.activeAdapters.has(providerId)) {
      const adapter = this.activeAdapters.get(providerId);
      if (adapter) {
        adapter.dispose().catch(error => {
          console.error(`Error disposing adapter for ${providerId}:`, error);
        });
      }
      this.activeAdapters.delete(providerId);
    }

    console.log(`${enabled ? 'Enabled' : 'Disabled'} adapter for provider: ${providerId}`);
  }

  /**
   * 获取所有注册的提供商
   */
  public getRegisteredProviders(): ModelProvider[] {
    return Array.from(this.adapterRegistry.keys());
  }

  /**
   * 获取所有启用的提供商
   */
  public getEnabledProviders(): ModelProvider[] {
    return Array.from(this.adapterRegistry.entries())
      .filter(([_, registration]) => registration.isEnabled)
      .map(([providerId, _]) => providerId);
  }

  /**
   * 获取适配器注册信息
   */
  public getAdapterRegistration(providerId: ModelProvider): AdapterRegistration | null {
    return this.adapterRegistry.get(providerId) || null;
  }

  /**
   * 获取所有适配器注册信息
   */
  public getAllAdapterRegistrations(): AdapterRegistration[] {
    return Array.from(this.adapterRegistry.values());
  }

  /**
   * 检查模型可用性
   */
  public async isModelAvailable(providerId: ModelProvider, modelId: string): Promise<boolean> {
    try {
      const adapter = this.getActiveAdapter(providerId);
      if (!adapter) {
        return false;
      }

      return await adapter.isModelAvailable(modelId);
    } catch (error) {
      console.error(`Error checking model availability for ${providerId}:${modelId}:`, error);
      return false;
    }
  }

  /**
   * 获取所有可用模型
   */
  public async getAvailableModels(): Promise<ModelInfo[]> {
    const allModels: ModelInfo[] = [];

    for (const [providerId, adapter] of this.activeAdapters) {
      try {
        const models = await adapter.getSupportedModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Error getting models from provider ${providerId}:`, error);
      }
    }

    return allModels;
  }

  /**
   * 执行所有适配器的健康检查
   */
  public async performHealthChecks(): Promise<Map<ModelProvider, boolean>> {
    const healthResults = new Map<ModelProvider, boolean>();

    for (const [providerId, adapter] of this.activeAdapters) {
      try {
        const isHealthy = await adapter.healthCheck();
        healthResults.set(providerId, isHealthy);
      } catch (error) {
        console.error(`Health check failed for provider ${providerId}:`, error);
        healthResults.set(providerId, false);
      }
    }

    return healthResults;
  }

  /**
   * 刷新所有适配器
   */
  public async refreshAdapters(): Promise<void> {
    const refreshPromises: Promise<void>[] = [];

    for (const [providerId, adapter] of this.activeAdapters) {
      refreshPromises.push(
        adapter.getSupportedModels()
          .then(() => {
            console.log(`Refreshed models for provider: ${providerId}`);
          })
          .catch(error => {
            console.error(`Failed to refresh models for provider ${providerId}:`, error);
          })
      );
    }

    await Promise.allSettled(refreshPromises);
  }

  /**
   * 清理所有适配器
   */
  public async dispose(): Promise<void> {
    const disposePromises: Promise<void>[] = [];

    for (const [providerId, adapter] of this.activeAdapters) {
      disposePromises.push(
        adapter.dispose().catch(error => {
          console.error(`Error disposing adapter for ${providerId}:`, error);
        })
      );
    }

    await Promise.allSettled(disposePromises);
    
    this.activeAdapters.clear();
    console.log('Disposed all model adapters');
  }

  /**
   * 重置工厂实例（主要用于测试）
   */
  public static reset(): void {
    if (ModelFactory.instance) {
      ModelFactory.instance.dispose().catch(error => {
        console.error('Error disposing ModelFactory:', error);
      });
      ModelFactory.instance = null;
    }
  }

  /**
   * 比较两个配置是否相等
   */
  private isConfigEqual(config1: ModelConfig, config2: ModelConfig): boolean {
    // 简单的深度比较，实际应用中可能需要更复杂的比较逻辑
    return JSON.stringify(config1) === JSON.stringify(config2);
  }

  /**
   * 获取工厂状态摘要
   */
  public getFactoryStatus(): {
    registeredProviders: number;
    enabledProviders: number;
    activeAdapters: number;
    providers: Array<{
      providerId: ModelProvider;
      providerName: string;
      isRegistered: boolean;
      isEnabled: boolean;
      isActive: boolean;
    }>;
  } {
    const providers = Array.from(this.adapterRegistry.entries()).map(([providerId, registration]) => ({
      providerId,
      providerName: registration.providerName,
      isRegistered: true,
      isEnabled: registration.isEnabled,
      isActive: this.activeAdapters.has(providerId)
    }));

    return {
      registeredProviders: this.adapterRegistry.size,
      enabledProviders: this.getEnabledProviders().length,
      activeAdapters: this.activeAdapters.size,
      providers
    };
  }
}