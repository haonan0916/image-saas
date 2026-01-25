// LangChain 配置管理
import { ChatServiceConfig, ModelConfig, ModelProvider } from '../types/langchain';
import { ConfigurationFactory } from '../services/langchain/config';

export class LangChainConfig {
  private static instance: LangChainConfig;
  private config: ChatServiceConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): LangChainConfig {
    if (!LangChainConfig.instance) {
      LangChainConfig.instance = new LangChainConfig();
    }
    return LangChainConfig.instance;
  }

  private loadConfig(): ChatServiceConfig {
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
          models: [process.env.OLLAMA_DEFAULT_MODEL || 'qwen3:0.6b']
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
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
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
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
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
          models: ['gemini-pro', 'gemini-pro-vision']
        }
      },
      performance: {
        connectionPoolSize: 10,
        cacheEnabled: true,
        cacheTTL: 300000, // 5 minutes
        requestTimeout: requestTimeout
      },
      security: {
        validateInput: true,
        sanitizeOutput: true,
        logSensitiveData: false,
        rateLimitEnabled: true
      }
    };
  }

  public getConfig(): ChatServiceConfig {
    return this.config;
  }

  public getProviderConfig(providerId: string): ModelConfig | null {
    return this.config.providers[providerId] || null;
  }

  public getEnabledProviders(): string[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config.enabled)
      .map(([providerId, _]) => providerId);
  }

  public isProviderEnabled(providerId: string): boolean {
    const config = this.getProviderConfig(providerId);
    return config?.enabled || false;
  }

  public updateConfig(updates: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查是否至少有一个提供商启用
    const enabledProviders = this.getEnabledProviders();
    if (enabledProviders.length === 0) {
      errors.push('At least one model provider must be enabled');
    }

    // 检查默认模型是否在启用的提供商中
    if (!enabledProviders.includes(this.config.defaultModel)) {
      errors.push(`Default model provider '${this.config.defaultModel}' is not enabled`);
    }

    // 检查 API 密钥
    Object.entries(this.config.providers).forEach(([providerId, config]) => {
      if (config.enabled && providerId !== ModelProvider.OLLAMA) {
        if (!config.apiKey) {
          errors.push(`API key is required for provider '${providerId}'`);
        }
      }
    });

    // 检查超时配置
    if (this.config.performance.requestTimeout <= 0) {
      errors.push('Request timeout must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public reload(): void {
    this.config = this.loadConfig();
  }
}

// 导出单例实例
export const langChainConfig = LangChainConfig.getInstance();

// 导出新的配置管理器工厂（推荐使用）
export { ConfigurationFactory };