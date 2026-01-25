// 模型工厂测试
import { ModelFactory } from '../ModelFactory';
import { BaseAdapter } from '../../adapters/BaseAdapter';
import { 
  ModelConfig, 
  ModelProvider, 
  ChatMessage, 
  ChatOptions, 
  ModelInfo,
  ConfigurationError,
  ChatServiceError
} from '../../interfaces';

// 创建测试用的适配器类
class TestAdapter extends BaseAdapter {
  constructor(config: ModelConfig) {
    super(ModelProvider.OLLAMA, 'Test Adapter', config);
  }

  async initialize(config: ModelConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    this.ensureInitialized();
    return `Test response for ${messages.length} messages`;
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    this.ensureInitialized();
    yield 'Test';
    yield ' stream';
    yield ' response';
  }

  async getSupportedModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'test-model',
        name: 'Test Model',
        providerId: this.providerId,
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
    return this.isInitialized;
  }
}

class FailingAdapter extends BaseAdapter {
  constructor(config: ModelConfig) {
    super(ModelProvider.OPENAI, 'Failing Adapter', config);
  }

  async initialize(config: ModelConfig): Promise<void> {
    throw new Error('Initialization failed');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    throw new Error('Not implemented');
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    throw new Error('Not implemented');
  }

  async getSupportedModels(): Promise<ModelInfo[]> {
    throw new Error('Not implemented');
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}

describe('ModelFactory', () => {
  let factory: ModelFactory;
  let testConfig: ModelConfig;

  beforeEach(() => {
    ModelFactory.reset();
    factory = ModelFactory.getInstance();
    
    testConfig = {
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        burstLimit: 10
      },
      models: ['test-model'],
      defaultModel: 'test-model'
    };
  });

  afterEach(async () => {
    await factory.dispose();
    ModelFactory.reset();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const factory1 = ModelFactory.getInstance();
      const factory2 = ModelFactory.getInstance();
      
      expect(factory1).toBe(factory2);
    });

    test('should reset instance', () => {
      const factory1 = ModelFactory.getInstance();
      ModelFactory.reset();
      const factory2 = ModelFactory.getInstance();
      
      expect(factory1).not.toBe(factory2);
    });
  });

  describe('Adapter Registration', () => {
    test('should register adapter successfully', () => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );

      expect(factory.isAdapterRegistered(ModelProvider.OLLAMA)).toBe(true);
      expect(factory.isAdapterEnabled(ModelProvider.OLLAMA)).toBe(true);
    });

    test('should prevent duplicate registration', () => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );

      expect(() => {
        factory.registerAdapter(
          ModelProvider.OLLAMA,
          TestAdapter,
          'Duplicate Adapter',
          true
        );
      }).toThrow(ConfigurationError);
    });

    test('should unregister adapter', async () => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );

      // 创建适配器实例
      await factory.createAdapter(ModelProvider.OLLAMA, testConfig);
      expect(factory.getActiveAdapter(ModelProvider.OLLAMA)).toBeDefined();

      // 取消注册
      factory.unregisterAdapter(ModelProvider.OLLAMA);
      
      expect(factory.isAdapterRegistered(ModelProvider.OLLAMA)).toBe(false);
      expect(factory.getActiveAdapter(ModelProvider.OLLAMA)).toBeNull();
    });

    test('should enable/disable adapter', () => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );

      expect(factory.isAdapterEnabled(ModelProvider.OLLAMA)).toBe(true);

      factory.setAdapterEnabled(ModelProvider.OLLAMA, false);
      expect(factory.isAdapterEnabled(ModelProvider.OLLAMA)).toBe(false);

      factory.setAdapterEnabled(ModelProvider.OLLAMA, true);
      expect(factory.isAdapterEnabled(ModelProvider.OLLAMA)).toBe(true);
    });
  });

  describe('Adapter Creation', () => {
    beforeEach(() => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );
    });

    test('should create adapter successfully', async () => {
      const adapter = await factory.createAdapter(ModelProvider.OLLAMA, testConfig);
      
      expect(adapter).toBeInstanceOf(TestAdapter);
      expect(adapter.providerId).toBe(ModelProvider.OLLAMA);
      expect(factory.getActiveAdapter(ModelProvider.OLLAMA)).toBe(adapter);
    });

    test('should fail to create adapter for unregistered provider', async () => {
      await expect(
        factory.createAdapter(ModelProvider.OPENAI, testConfig)
      ).rejects.toThrow(ConfigurationError);
    });

    test('should fail to create adapter for disabled provider', async () => {
      factory.setAdapterEnabled(ModelProvider.OLLAMA, false);
      
      await expect(
        factory.createAdapter(ModelProvider.OLLAMA, testConfig)
      ).rejects.toThrow(ConfigurationError);
    });

    test('should handle adapter initialization failure', async () => {
      factory.registerAdapter(
        ModelProvider.OPENAI,
        FailingAdapter,
        'Failing Adapter',
        true
      );

      await expect(
        factory.createAdapter(ModelProvider.OPENAI, testConfig)
      ).rejects.toThrow(ChatServiceError);
    });

    test('should get or create adapter', async () => {
      const adapter1 = await factory.getOrCreateAdapter(ModelProvider.OLLAMA, testConfig);
      const adapter2 = await factory.getOrCreateAdapter(ModelProvider.OLLAMA, testConfig);
      
      expect(adapter1).toBe(adapter2);
    });

    test('should update adapter config when changed', async () => {
      const adapter = await factory.getOrCreateAdapter(ModelProvider.OLLAMA, testConfig);
      
      const newConfig = { ...testConfig, timeout: 60000 };
      const updatedAdapter = await factory.getOrCreateAdapter(ModelProvider.OLLAMA, newConfig);
      
      expect(adapter).toBe(updatedAdapter);
      expect(adapter.getConfig().timeout).toBe(60000);
    });
  });

  describe('Provider Management', () => {
    beforeEach(() => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );
      factory.registerAdapter(
        ModelProvider.OPENAI,
        TestAdapter,
        'OpenAI Adapter',
        false
      );
    });

    test('should get registered providers', () => {
      const providers = factory.getRegisteredProviders();
      
      expect(providers).toContain(ModelProvider.OLLAMA);
      expect(providers).toContain(ModelProvider.OPENAI);
      expect(providers).toHaveLength(2);
    });

    test('should get enabled providers', () => {
      const enabledProviders = factory.getEnabledProviders();
      
      expect(enabledProviders).toContain(ModelProvider.OLLAMA);
      expect(enabledProviders).not.toContain(ModelProvider.OPENAI);
      expect(enabledProviders).toHaveLength(1);
    });

    test('should get adapter registration info', () => {
      const registration = factory.getAdapterRegistration(ModelProvider.OLLAMA);
      
      expect(registration).toBeDefined();
      expect(registration?.providerId).toBe(ModelProvider.OLLAMA);
      expect(registration?.providerName).toBe('Test Adapter');
      expect(registration?.isEnabled).toBe(true);
    });

    test('should get all adapter registrations', () => {
      const registrations = factory.getAllAdapterRegistrations();
      
      expect(registrations).toHaveLength(2);
      expect(registrations.some(r => r.providerId === ModelProvider.OLLAMA)).toBe(true);
      expect(registrations.some(r => r.providerId === ModelProvider.OPENAI)).toBe(true);
    });
  });

  describe('Model Operations', () => {
    beforeEach(async () => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );
      await factory.createAdapter(ModelProvider.OLLAMA, testConfig);
    });

    test('should check model availability', async () => {
      const isAvailable = await factory.isModelAvailable(ModelProvider.OLLAMA, 'test-model');
      expect(isAvailable).toBe(true);

      const isNotAvailable = await factory.isModelAvailable(ModelProvider.OLLAMA, 'non-existent-model');
      expect(isNotAvailable).toBe(false);
    });

    test('should get available models', async () => {
      const models = await factory.getAvailableModels();
      
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('test-model');
      expect(models[0].providerId).toBe(ModelProvider.OLLAMA);
    });

    test('should perform health checks', async () => {
      const healthResults = await factory.performHealthChecks();
      
      expect(healthResults.get(ModelProvider.OLLAMA)).toBe(true);
    });

    test('should refresh adapters', async () => {
      await expect(factory.refreshAdapters()).resolves.not.toThrow();
    });
  });

  describe('Factory Status', () => {
    beforeEach(async () => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );
      factory.registerAdapter(
        ModelProvider.OPENAI,
        TestAdapter,
        'OpenAI Adapter',
        false
      );
      await factory.createAdapter(ModelProvider.OLLAMA, testConfig);
    });

    test('should get factory status', () => {
      const status = factory.getFactoryStatus();
      
      expect(status.registeredProviders).toBe(2);
      expect(status.enabledProviders).toBe(1);
      expect(status.activeAdapters).toBe(1);
      expect(status.providers).toHaveLength(2);
      
      const ollamaProvider = status.providers.find(p => p.providerId === ModelProvider.OLLAMA);
      expect(ollamaProvider?.isRegistered).toBe(true);
      expect(ollamaProvider?.isEnabled).toBe(true);
      expect(ollamaProvider?.isActive).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should dispose all adapters', async () => {
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        TestAdapter,
        'Test Adapter',
        true
      );
      
      const adapter = await factory.createAdapter(ModelProvider.OLLAMA, testConfig);
      const disposeSpy = jest.spyOn(adapter, 'dispose');
      
      await factory.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
      expect(factory.getActiveAdapters().size).toBe(0);
    });
  });
});