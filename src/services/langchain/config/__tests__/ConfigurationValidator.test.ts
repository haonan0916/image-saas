// 配置验证器测试
import { ConfigurationValidator } from '../ConfigurationValidator';
import { 
  ChatServiceConfig, 
  ModelConfig, 
  ModelProvider 
} from '../../interfaces';

describe('ConfigurationValidator', () => {
  let validConfig: ChatServiceConfig;
  let validModelConfig: ModelConfig;

  beforeEach(() => {
    validModelConfig = {
      enabled: true,
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      timeout: 30000,
      retryAttempts: 3,
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        burstLimit: 10
      },
      models: ['test-model-1', 'test-model-2'],
      defaultModel: 'test-model-1'
    };

    validConfig = {
      defaultModel: ModelProvider.OLLAMA,
      fallbackChain: [ModelProvider.OLLAMA, ModelProvider.OPENAI],
      providers: {
        [ModelProvider.OLLAMA]: {
          enabled: true,
          baseUrl: 'http://localhost:11434',
          timeout: 30000,
          retryAttempts: 3,
          rateLimits: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            burstLimit: 10
          },
          models: ['qwen2.5:0.5b'],
          defaultModel: 'qwen2.5:0.5b'
        },
        [ModelProvider.OPENAI]: validModelConfig
      },
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
  });

  describe('Chat Service Configuration Validation', () => {
    test('should validate valid configuration', () => {
      const result = ConfigurationValidator.validateChatServiceConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject null/undefined configuration', () => {
      const result = ConfigurationValidator.validateChatServiceConfig(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration is required');
    });

    test('should validate default model', () => {
      const invalidConfig = { ...validConfig, defaultModel: '' };
      const result = ConfigurationValidator.validateChatServiceConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Default model'))).toBe(true);
    });

    test('should validate fallback chain', () => {
      const invalidConfig = { ...validConfig, fallbackChain: [] };
      const result = ConfigurationValidator.validateChatServiceConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Fallback chain'))).toBe(true);
    });

    test('should detect duplicate providers in fallback chain', () => {
      const invalidConfig = { 
        ...validConfig, 
        fallbackChain: [ModelProvider.OLLAMA, ModelProvider.OLLAMA] 
      };
      const result = ConfigurationValidator.validateChatServiceConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('duplicate'))).toBe(true);
    });

    test('should validate performance configuration', () => {
      const invalidConfig = {
        ...validConfig,
        performance: {
          connectionPoolSize: -1,
          cacheEnabled: true,
          cacheTTL: -1,
          requestTimeout: -1
        }
      };
      const result = ConfigurationValidator.validateChatServiceConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('connectionPoolSize'))).toBe(true);
      expect(result.errors.some(error => error.includes('cacheTTL'))).toBe(true);
      expect(result.errors.some(error => error.includes('requestTimeout'))).toBe(true);
    });

    test('should validate security configuration', () => {
      const invalidConfig = {
        ...validConfig,
        security: {
          validateInput: 'true' as any,
          sanitizeOutput: 'false' as any,
          logSensitiveData: 1 as any,
          rateLimitEnabled: 'yes' as any
        }
      };
      const result = ConfigurationValidator.validateChatServiceConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('validateInput'))).toBe(true);
      expect(result.errors.some(error => error.includes('sanitizeOutput'))).toBe(true);
      expect(result.errors.some(error => error.includes('logSensitiveData'))).toBe(true);
      expect(result.errors.some(error => error.includes('rateLimitEnabled'))).toBe(true);
    });
  });

  describe('Model Configuration Validation', () => {
    test('should validate valid model configuration', () => {
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, validModelConfig);
      
      expect(errors).toHaveLength(0);
    });

    test('should require API key for non-Ollama providers', () => {
      const configWithoutApiKey = { ...validModelConfig, apiKey: undefined };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, configWithoutApiKey);
      
      expect(errors.some(error => error.includes('API key'))).toBe(true);
    });

    test('should not require API key for Ollama', () => {
      const ollamaConfig = { ...validModelConfig, apiKey: undefined };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OLLAMA, ollamaConfig);
      
      expect(errors.some(error => error.includes('API key'))).toBe(false);
    });

    test('should validate timeout', () => {
      const invalidConfig = { ...validModelConfig, timeout: -1 };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, invalidConfig);
      
      expect(errors.some(error => error.includes('timeout'))).toBe(true);
    });

    test('should validate retry attempts', () => {
      const invalidConfig = { ...validModelConfig, retryAttempts: -1 };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, invalidConfig);
      
      expect(errors.some(error => error.includes('retryAttempts'))).toBe(true);
    });

    test('should validate models array', () => {
      const invalidConfig = { ...validModelConfig, models: [] };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, invalidConfig);
      
      expect(errors.some(error => error.includes('models'))).toBe(true);
    });

    test('should validate default model is in models list', () => {
      const invalidConfig = { ...validModelConfig, defaultModel: 'non-existent-model' };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, invalidConfig);
      
      expect(errors.some(error => error.includes('defaultModel'))).toBe(true);
    });

    test('should validate rate limits', () => {
      const invalidConfig = {
        ...validModelConfig,
        rateLimits: {
          requestsPerMinute: -1,
          requestsPerHour: -1,
          burstLimit: -1
        }
      };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, invalidConfig);
      
      expect(errors.some(error => error.includes('requestsPerMinute'))).toBe(true);
      expect(errors.some(error => error.includes('requestsPerHour'))).toBe(true);
      expect(errors.some(error => error.includes('burstLimit'))).toBe(true);
    });

    test('should validate rate limit logic', () => {
      const invalidConfig = {
        ...validModelConfig,
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 50, // 小于每分钟请求数
          burstLimit: 10
        }
      };
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, invalidConfig);
      
      expect(errors.some(error => error.includes('requestsPerHour should be >= requestsPerMinute'))).toBe(true);
    });
  });

  describe('Cross Validation', () => {
    test('should warn about disabled providers in fallback chain', () => {
      const configWithDisabledProvider = {
        ...validConfig,
        providers: {
          ...validConfig.providers,
          [ModelProvider.OPENAI]: {
            ...validConfig.providers[ModelProvider.OPENAI],
            enabled: false
          }
        }
      };
      
      const result = ConfigurationValidator.validateChatServiceConfig(configWithDisabledProvider);
      
      expect(result.warnings.some(warning => warning.includes('not enabled'))).toBe(true);
    });

    test('should error if default model provider is disabled', () => {
      const configWithDisabledDefault = {
        ...validConfig,
        defaultModel: ModelProvider.OPENAI,
        providers: {
          ...validConfig.providers,
          [ModelProvider.OPENAI]: {
            ...validConfig.providers[ModelProvider.OPENAI],
            enabled: false
          }
        }
      };
      
      const result = ConfigurationValidator.validateChatServiceConfig(configWithDisabledDefault);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('is not enabled'))).toBe(true);
    });

    test('should warn about performance settings', () => {
      const configWithLowTimeout = {
        ...validConfig,
        performance: {
          ...validConfig.performance,
          requestTimeout: 500 // 很低的超时
        }
      };
      
      const result = ConfigurationValidator.validateChatServiceConfig(configWithLowTimeout);
      
      expect(result.warnings.some(warning => warning.includes('very low'))).toBe(true);
    });

    test('should warn about high connection pool size', () => {
      const configWithHighPoolSize = {
        ...validConfig,
        performance: {
          ...validConfig.performance,
          connectionPoolSize: 100 // 很高的连接池大小
        }
      };
      
      const result = ConfigurationValidator.validateChatServiceConfig(configWithHighPoolSize);
      
      expect(result.warnings.some(warning => warning.includes('very high'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing configuration sections', () => {
      const incompleteConfig = {
        defaultModel: ModelProvider.OLLAMA,
        fallbackChain: [ModelProvider.OLLAMA]
        // 缺少 providers, performance, security
      } as any;
      
      const result = ConfigurationValidator.validateChatServiceConfig(incompleteConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle invalid provider IDs', () => {
      const configWithInvalidProvider = {
        ...validConfig,
        providers: {
          ...validConfig.providers,
          'invalid-provider': validModelConfig
        }
      };
      
      const result = ConfigurationValidator.validateChatServiceConfig(configWithInvalidProvider);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid provider ID'))).toBe(true);
    });

    test('should handle null model configuration', () => {
      const errors = ConfigurationValidator.validateModelConfig(ModelProvider.OPENAI, null as any);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('configuration is required');
    });
  });
});