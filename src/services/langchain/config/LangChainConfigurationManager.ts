// LangChain 配置管理器实现
import { EventEmitter } from 'events';
import { 
  ConfigurationManager, 
  ChatServiceConfig, 
  ModelConfig, 
  ValidationResult,
  ModelProvider,
  ConfigurationError
} from '../interfaces';

/**
 * LangChain 配置管理器
 * 负责加载、验证、更新和监听配置变化
 */
export class LangChainConfigurationManager extends EventEmitter implements ConfigurationManager {
  private config: ChatServiceConfig;
  private configListeners: Set<(config: ChatServiceConfig) => void> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.config = this.createDefaultConfig();
  }

  /**
   * 加载配置
   */
  async loadConfig(): Promise<ChatServiceConfig> {
    try {
      this.config = this.loadFromEnvironment();
      const validation = this.validateConfig(this.config);
      
      if (!validation.isValid) {
        throw new ConfigurationError(
          `Configuration validation failed: ${validation.errors.join(', ')}`
        );
      }

      this.isInitialized = true;
      this.emit('configLoaded', this.config);
      
      return this.config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * 获取指定提供商的模型配置
   */
  getModelConfig(providerId: string): ModelConfig | null {
    return this.config.providers[providerId] || null;
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<ChatServiceConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    // 如果提供商配置有更新，需要合并而不是替换
    if (updates.providers) {
      this.config.providers = { ...oldConfig.providers, ...updates.providers };
    }

    // 验证更新后的配置
    const validation = this.validateConfig(this.config);
    if (!validation.isValid) {
      // 如果验证失败，回滚配置
      this.config = oldConfig;
      throw new ConfigurationError(
        `Configuration update failed: ${validation.errors.join(', ')}`
      );
    }

    // 通知配置变化
    this.notifyConfigChange();
  }

  /**
   * 验证配置
   */
  validateConfig(config: ChatServiceConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证默认模型
    if (!config.defaultModel) {
      errors.push('Default model is required');
    }

    // 验证回退链
    if (!Array.isArray(config.fallbackChain) || config.fallbackChain.length === 0) {
      errors.push('Fallback chain must contain at least one provider');
    }

    // 验证提供商配置
    const enabledProviders: string[] = [];
    for (const [providerId, providerConfig] of Object.entries(config.providers)) {
      const providerErrors = this.validateProviderConfig(providerId, providerConfig);
      errors.push(...providerErrors);

      if (providerConfig.enabled) {
        enabledProviders.push(providerId);
      }
    }

    // 检查是否至少有一个提供商启用
    if (enabledProviders.length === 0) {
      errors.push('At least one provider must be enabled');
    }

    // 检查默认模型是否在启用的提供商中
    if (config.defaultModel && !enabledProviders.includes(config.defaultModel)) {
      errors.push(`Default model provider '${config.defaultModel}' is not enabled`);
    }

    // 检查回退链中的提供商是否都启用
    for (const provider of config.fallbackChain) {
      if (!enabledProviders.includes(provider)) {
        warnings.push(`Fallback provider '${provider}' is not enabled`);
      }
    }

    // 验证性能配置
    if (config.performance.requestTimeout <= 0) {
      errors.push('Request timeout must be greater than 0');
    }

    if (config.performance.connectionPoolSize <= 0) {
      errors.push('Connection pool size must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证单个提供商配置
   */
  private validateProviderConfig(providerId: string, config: ModelConfig): string[] {
    const errors: string[] = [];

    // 检查必需的 API 密钥
    if (config.enabled && providerId !== ModelProvider.OLLAMA) {
      if (!config.apiKey) {
        errors.push(`API key is required for provider '${providerId}'`);
      }
    }

    // 检查超时配置
    if (config.timeout <= 0) {
      errors.push(`Timeout for provider '${providerId}' must be greater than 0`);
    }

    // 检查重试次数
    if (config.retryAttempts < 0) {
      errors.push(`Retry attempts for provider '${providerId}' cannot be negative`);
    }

    // 检查模型列表
    if (!Array.isArray(config.models) || config.models.length === 0) {
      errors.push(`Provider '${providerId}' must have at least one model`);
    }

    // 检查速率限制配置
    if (config.rateLimits.requestsPerMinute <= 0) {
      errors.push(`Requests per minute for provider '${providerId}' must be greater than 0`);
    }

    return errors;
  }

  /**
   * 监听配置变化
   */
  onConfigChange(callback: (config: ChatServiceConfig) => void): void {
    this.configListeners.add(callback);
  }

  /**
   * 移除配置变化监听器
   */
  offConfigChange(callback: (config: ChatServiceConfig) => void): void {
    this.configListeners.delete(callback);
  }

  /**
   * 获取当前完整配置
   */
  getCurrentConfig(): ChatServiceConfig {
    return { ...this.config };
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * 保存配置到持久化存储
   */
  async saveConfig(config: ChatServiceConfig): Promise<void> {
    // 验证配置
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new ConfigurationError(
        `Cannot save invalid configuration: ${validation.errors.join(', ')}`
      );
    }

    // 在实际应用中，这里可以保存到数据库或文件
    // 目前只更新内存中的配置
    this.config = { ...config };
    this.notifyConfigChange();
  }

  /**
   * 获取启用的提供商列表
   */
  getEnabledProviders(): string[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config.enabled)
      .map(([providerId, _]) => providerId);
  }

  /**
   * 检查提供商是否启用
   */
  isProviderEnabled(providerId: string): boolean {
    const config = this.getModelConfig(providerId);
    return config?.enabled || false;
  }

  /**
   * 更新提供商配置
   */
  updateProviderConfig(providerId: string, updates: Partial<ModelConfig>): void {
    const currentConfig = this.getModelConfig(providerId);
    if (!currentConfig) {
      throw new ConfigurationError(`Provider '${providerId}' not found`);
    }

    const updatedProviderConfig = { ...currentConfig, ...updates };
    
    this.updateConfig({
      providers: {
        [providerId]: updatedProviderConfig
      }
    });
  }

  /**
   * 启用/禁用提供商
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    const currentConfig = this.getModelConfig(providerId);
    if (!currentConfig) {
      throw new ConfigurationError(`Provider '${providerId}' not found`);
    }

    // 如果要禁用的是默认提供商，需要先切换默认提供商
    if (!enabled && this.config.defaultModel === providerId) {
      const enabledProviders = this.getEnabledProviders().filter(p => p !== providerId);
      if (enabledProviders.length === 0) {
        throw new ConfigurationError('Cannot disable the last enabled provider');
      }
      
      // 切换到第一个可用的提供商
      this.config.defaultModel = enabledProviders[0];
    }

    this.updateProviderConfig(providerId, { enabled });
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnvironment(): ChatServiceConfig {
    const defaultProvider = process.env.LANGCHAIN_DEFAULT_PROVIDER || ModelProvider.OLLAMA;
    const fallbackProviders = process.env.LANGCHAIN_FALLBACK_PROVIDERS?.split(',') || [ModelProvider.OLLAMA];
    const requestTimeout = parseInt(process.env.LANGCHAIN_REQUEST_TIMEOUT || '30000');
    const maxRetries = parseInt(process.env.LANGCHAIN_MAX_RETRIES || '3');

    return {
      defaultModel: defaultProvider,
      fallbackChain: fallbackProviders,
      providers: {
        [ModelProvider.OLLAMA]: {
          enabled: true,
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          timeout: requestTimeout,
          retryAttempts: maxRetries,
          rateLimits: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            burstLimit: 10
          },
          models: [process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:0.5b'],
          defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:0.5b'
        },
        [ModelProvider.OPENAI]: {
          enabled: !!process.env.OPENAI_API_KEY,
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          timeout: requestTimeout,
          retryAttempts: maxRetries,
          rateLimits: {
            requestsPerMinute: 50,
            requestsPerHour: 500,
            burstLimit: 5
          },
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
          defaultModel: 'gpt-4'
        },
        [ModelProvider.ANTHROPIC]: {
          enabled: !!process.env.ANTHROPIC_API_KEY,
          apiKey: process.env.ANTHROPIC_API_KEY,
          timeout: requestTimeout,
          retryAttempts: maxRetries,
          rateLimits: {
            requestsPerMinute: 40,
            requestsPerHour: 400,
            burstLimit: 5
          },
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
          defaultModel: 'claude-3-sonnet-20240229'
        },
        [ModelProvider.GEMINI]: {
          enabled: !!process.env.GOOGLE_API_KEY,
          apiKey: process.env.GOOGLE_API_KEY,
          timeout: requestTimeout,
          retryAttempts: maxRetries,
          rateLimits: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            burstLimit: 10
          },
          models: ['gemini-pro', 'gemini-pro-vision'],
          defaultModel: 'gemini-pro'
        }
      },
      performance: {
        connectionPoolSize: parseInt(process.env.LANGCHAIN_CONNECTION_POOL_SIZE || '10'),
        cacheEnabled: process.env.LANGCHAIN_CACHE_ENABLED !== 'false',
        cacheTTL: parseInt(process.env.LANGCHAIN_CACHE_TTL || '300000'), // 5 minutes
        requestTimeout: requestTimeout
      },
      security: {
        validateInput: process.env.LANGCHAIN_VALIDATE_INPUT !== 'false',
        sanitizeOutput: process.env.LANGCHAIN_SANITIZE_OUTPUT !== 'false',
        logSensitiveData: process.env.LANGCHAIN_LOG_SENSITIVE_DATA === 'true',
        rateLimitEnabled: process.env.LANGCHAIN_RATE_LIMIT_ENABLED !== 'false'
      }
    };
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(): ChatServiceConfig {
    return {
      defaultModel: ModelProvider.OLLAMA,
      fallbackChain: [ModelProvider.OLLAMA],
      providers: {},
      performance: {
        connectionPoolSize: 10,
        cacheEnabled: true,
        cacheTTL: 300000,
        requestTimeout: 30000
      },
      security: {
        validateInput: true,
        sanitizeOutput: true,
        logSensitiveData: false,
        rateLimitEnabled: true
      }
    };
  }

  /**
   * 通知配置变化
   */
  private notifyConfigChange(): void {
    const config = this.getCurrentConfig();
    
    // 通知所有监听器
    for (const listener of this.configListeners) {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    }

    // 发出事件
    this.emit('configChanged', config);
  }

  /**
   * 获取配置摘要（用于日志记录）
   */
  getConfigSummary(): object {
    const enabledProviders = this.getEnabledProviders();
    return {
      defaultModel: this.config.defaultModel,
      enabledProviders,
      fallbackChain: this.config.fallbackChain,
      performanceSettings: {
        connectionPoolSize: this.config.performance.connectionPoolSize,
        cacheEnabled: this.config.performance.cacheEnabled,
        requestTimeout: this.config.performance.requestTimeout
      },
      securitySettings: {
        validateInput: this.config.security.validateInput,
        sanitizeOutput: this.config.security.sanitizeOutput,
        rateLimitEnabled: this.config.security.rateLimitEnabled
      }
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.configListeners.clear();
    this.removeAllListeners();
  }
}