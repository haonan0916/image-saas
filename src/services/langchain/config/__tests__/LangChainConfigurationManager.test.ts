// LangChain 配置管理器测试
import { LangChainConfigurationManager } from '../LangChainConfigurationManager';
import { 
  ChatServiceConfig, 
  ModelConfig, 
  ModelProvider,
  ConfigurationError 
} from '../../interfaces';

describe('LangChainConfigurationManager', () => {
  let configManager: LangChainConfigurationManager;

  beforeEach(() => {
    configManager = new LangChainConfigurationManager();
  });

  afterEach(() => {
    configManager.dispose();
  });

  describe('Configuration Loading', () => {
    test('should load configuration from environment', async () => {
      const config = await configManager.loadConfig();
      
      expect(config).toBeDefined();
      expect(config.defaultModel).toBeDefined();
      expect(config.providers).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.security).toBeDefined();
    });

    test('should have Ollama provider enabled by default', async () => {
      await configManager.loadConfig();
      
      const ollamaConfig = configManager.getModelConfig(ModelProvider.OLLAMA);
      expect(ollamaConfig).toBeDefined();
      expect(ollamaConfig?.enabled).toBe(true);
    });

    test('should validate configuration on load', async () => {
      await expect(configManager.loadConfig()).resolves.not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    test('should validate valid configuration', async () => {
      await configManager.loadConfig();
      const config = configManager.getCurrentConfig();
      
      const validation = configManager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid configuration', () => {
      const invalidConfig: ChatServiceConfig = {
        defaultModel: '',
        fallbackChain: [],
        providers: {},
        performance: {
          connectionPoolSize: -1,
          cacheEnabled: true,
          cacheTTL: 300000,
          requestTimeout: -1000
        },
        security: {
          validateInput: true,
          sanitizeOutput: true,
          logSensitiveData: false,
          rateLimitEnabled: true
        }
      };

      const validation = configManager.validateConfig(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should validate provider configurations', () => {
      const invalidProviderConfig: ModelConfig = {
        enabled: true,
        timeout: -1,
        retryAttempts: -1,
        rateLimits: {
          requestsPerMinute: -1,
          requestsPerHour: -1,
          burstLimit: -1
        },
        models: []
      };

      const validation = configManager.validateConfig({
        defaultModel: ModelProvider.OPENAI,
        fallbackChain: [ModelProvider.OPENAI],
        providers: {
          [ModelProvider.OPENAI]: invalidProviderConfig
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
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      // 检查是否包含预期的错误（不区分大小写）
      const errorString = validation.errors.join(' ').toLowerCase();
      expect(errorString).toContain('timeout');
      expect(errorString).toContain('retry');
      expect(errorString).toContain('model');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    test('should update configuration successfully', () => {
      const updates = {
        defaultModel: ModelProvider.OPENAI
      };

      expect(() => {
        configManager.updateConfig(updates);
      }).not.toThrow();

      const config = configManager.getCurrentConfig();
      expect(config.defaultModel).toBe(ModelProvider.OPENAI);
    });

    test('should reject invalid configuration updates', () => {
      const invalidUpdates = {
        defaultModel: 'invalid-provider' as any
      };

      expect(() => {
        configManager.updateConfig(invalidUpdates);
      }).toThrow(ConfigurationError);
    });

    test('should update provider configuration', () => {
      const providerUpdates = {
        timeout: 60000,
        retryAttempts: 5
      };

      expect(() => {
        configManager.updateProviderConfig(ModelProvider.OLLAMA, providerUpdates);
      }).not.toThrow();

      const ollamaConfig = configManager.getModelConfig(ModelProvider.OLLAMA);
      expect(ollamaConfig?.timeout).toBe(60000);
      expect(ollamaConfig?.retryAttempts).toBe(5);
    });

    test('should enable/disable providers', async () => {
      // 首先确保有多个提供商启用
      configManager.updateProviderConfig(ModelProvider.OPENAI, { 
        enabled: true,
        apiKey: 'test-key'
      });
      
      // 现在可以安全地禁用 Ollama
      configManager.setProviderEnabled(ModelProvider.OLLAMA, false);
      
      const ollamaConfig = configManager.getModelConfig(ModelProvider.OLLAMA);
      expect(ollamaConfig?.enabled).toBe(false);
      expect(configManager.isProviderEnabled(ModelProvider.OLLAMA)).toBe(false);
      
      // 默认模型应该已经切换
      expect(configManager.getCurrentConfig().defaultModel).not.toBe(ModelProvider.OLLAMA);
    });
  });

  describe('Configuration Listeners', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    test('should notify listeners on configuration change', (done) => {
      const listener = jest.fn((config: ChatServiceConfig) => {
        expect(config.defaultModel).toBe(ModelProvider.OPENAI);
        done();
      });

      configManager.onConfigChange(listener);
      configManager.updateConfig({ defaultModel: ModelProvider.OPENAI });
    });

    test('should remove listeners', () => {
      const listener = jest.fn();

      configManager.onConfigChange(listener);
      configManager.offConfigChange(listener);
      configManager.updateConfig({ defaultModel: ModelProvider.OPENAI });

      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle listener errors gracefully', () => {
      const faultyListener = () => {
        throw new Error('Listener error');
      };

      configManager.onConfigChange(faultyListener);
      
      expect(() => {
        configManager.updateConfig({ defaultModel: ModelProvider.OPENAI });
      }).not.toThrow();
    });
  });

  describe('Provider Management', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    test('should get enabled providers', () => {
      const enabledProviders = configManager.getEnabledProviders();
      expect(Array.isArray(enabledProviders)).toBe(true);
      expect(enabledProviders.length).toBeGreaterThan(0);
      expect(enabledProviders).toContain(ModelProvider.OLLAMA);
    });

    test('should check provider availability', () => {
      expect(configManager.isProviderEnabled(ModelProvider.OLLAMA)).toBe(true);
      expect(configManager.isProviderEnabled('non-existent' as any)).toBe(false);
    });

    test('should get provider configuration', () => {
      const ollamaConfig = configManager.getModelConfig(ModelProvider.OLLAMA);
      expect(ollamaConfig).toBeDefined();
      expect(ollamaConfig?.enabled).toBe(true);

      const nonExistentConfig = configManager.getModelConfig('non-existent' as any);
      expect(nonExistentConfig).toBeNull();
    });
  });

  describe('Configuration Persistence', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    test('should save valid configuration', async () => {
      const config = configManager.getCurrentConfig();
      
      await expect(configManager.saveConfig(config)).resolves.not.toThrow();
    });

    test('should reject invalid configuration for saving', async () => {
      const invalidConfig: ChatServiceConfig = {
        defaultModel: '',
        fallbackChain: [],
        providers: {},
        performance: {
          connectionPoolSize: -1,
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

      await expect(configManager.saveConfig(invalidConfig)).rejects.toThrow(ConfigurationError);
    });
  });

  describe('Configuration Summary', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    test('should generate configuration summary', () => {
      const summary = configManager.getConfigSummary();
      
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('defaultModel');
      expect(summary).toHaveProperty('enabledProviders');
      expect(summary).toHaveProperty('fallbackChain');
      expect(summary).toHaveProperty('performanceSettings');
      expect(summary).toHaveProperty('securitySettings');
    });
  });

  describe('Cleanup', () => {
    test('should dispose properly', async () => {
      await configManager.loadConfig();
      
      const listener = jest.fn();
      configManager.onConfigChange(listener);
      
      configManager.dispose();
      
      // 验证监听器被清理
      configManager.updateConfig({ defaultModel: ModelProvider.OPENAI });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});