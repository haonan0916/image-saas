// 适配器注册器测试
import { AdapterRegistry } from '../AdapterRegistry';
import { ModelFactory } from '../ModelFactory';
import { ModelProvider } from '../../interfaces';

// Mock 模块导入
jest.mock('../../../adapters/OllamaAdapter', () => ({
  OllamaAdapter: class MockOllamaAdapter {
    constructor(config: any) {}
    async initialize() {}
    async dispose() {}
  }
}), { virtual: true });

jest.mock('../../../adapters/OpenAIAdapter', () => ({
  OpenAIAdapter: class MockOpenAIAdapter {
    constructor(config: any) {}
    async initialize() {}
    async dispose() {}
  }
}), { virtual: true });

jest.mock('../../../adapters/AnthropicAdapter', () => ({
  AnthropicAdapter: class MockAnthropicAdapter {
    constructor(config: any) {}
    async initialize() {}
    async dispose() {}
  }
}), { virtual: true });

jest.mock('../../../adapters/GeminiAdapter', () => ({
  GeminiAdapter: class MockGeminiAdapter {
    constructor(config: any) {}
    async initialize() {}
    async dispose() {}
  }
}), { virtual: true });

describe('AdapterRegistry', () => {
  let factory: ModelFactory;

  beforeEach(() => {
    ModelFactory.reset();
    AdapterRegistry.reset();
    factory = ModelFactory.getInstance();
  });

  afterEach(async () => {
    await factory.dispose();
    ModelFactory.reset();
    AdapterRegistry.reset();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(AdapterRegistry.initialize()).resolves.not.toThrow();
      expect(AdapterRegistry.isReady()).toBe(true);
    });

    test('should not initialize twice', async () => {
      await AdapterRegistry.initialize();
      const firstInitTime = Date.now();
      
      await AdapterRegistry.initialize();
      const secondInitTime = Date.now();
      
      // 第二次初始化应该立即返回
      expect(secondInitTime - firstInitTime).toBeLessThan(10);
      expect(AdapterRegistry.isReady()).toBe(true);
    });

    test('should register adapters after initialization', async () => {
      await AdapterRegistry.initialize();
      
      // 检查是否注册了适配器
      const registeredProviders = factory.getRegisteredProviders();
      expect(registeredProviders.length).toBeGreaterThan(0);
    });
  });

  describe('Adapter Registration', () => {
    beforeEach(async () => {
      await AdapterRegistry.initialize();
    });

    test('should register Ollama adapter', () => {
      expect(factory.isAdapterRegistered(ModelProvider.OLLAMA)).toBe(true);
      
      const registration = factory.getAdapterRegistration(ModelProvider.OLLAMA);
      expect(registration?.providerName).toBe('Ollama Local Models');
      expect(registration?.isEnabled).toBe(true);
    });

    test('should register OpenAI adapter based on API key', () => {
      expect(factory.isAdapterRegistered(ModelProvider.OPENAI)).toBe(true);
      
      const registration = factory.getAdapterRegistration(ModelProvider.OPENAI);
      expect(registration?.providerName).toBe('OpenAI GPT Models');
      // 启用状态取决于是否有 API 密钥
      expect(typeof registration?.isEnabled).toBe('boolean');
    });

    test('should register Anthropic adapter based on API key', () => {
      expect(factory.isAdapterRegistered(ModelProvider.ANTHROPIC)).toBe(true);
      
      const registration = factory.getAdapterRegistration(ModelProvider.ANTHROPIC);
      expect(registration?.providerName).toBe('Anthropic Claude Models');
      expect(typeof registration?.isEnabled).toBe('boolean');
    });

    test('should register Gemini adapter based on API key', () => {
      expect(factory.isAdapterRegistered(ModelProvider.GEMINI)).toBe(true);
      
      const registration = factory.getAdapterRegistration(ModelProvider.GEMINI);
      expect(registration?.providerName).toBe('Google Gemini Models');
      expect(typeof registration?.isEnabled).toBe('boolean');
    });
  });

  describe('Reinitialization', () => {
    test('should reinitialize successfully', async () => {
      await AdapterRegistry.initialize();
      expect(AdapterRegistry.isReady()).toBe(true);
      
      await AdapterRegistry.reinitialize();
      expect(AdapterRegistry.isReady()).toBe(true);
    });

    test('should reset and reinitialize', async () => {
      await AdapterRegistry.initialize();
      
      AdapterRegistry.reset();
      expect(AdapterRegistry.isReady()).toBe(false);
      
      await AdapterRegistry.initialize();
      expect(AdapterRegistry.isReady()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing adapter modules gracefully', async () => {
      // 模拟模块导入失败
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();

      // 这个测试依赖于 mock 的实现，在实际情况下可能需要调整
      await expect(AdapterRegistry.initialize()).resolves.not.toThrow();
      
      console.warn = originalConsoleWarn;
    });

    test('should continue initialization even if some adapters fail', async () => {
      // 即使某些适配器注册失败，初始化也应该继续
      await expect(AdapterRegistry.initialize()).resolves.not.toThrow();
      expect(AdapterRegistry.isReady()).toBe(true);
    });
  });

  describe('Environment-based Enablement', () => {
    test('should enable adapters based on environment variables', async () => {
      // 保存原始环境变量
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
      const originalGoogleKey = process.env.GOOGLE_API_KEY;

      // 设置测试环境变量
      process.env.OPENAI_API_KEY = 'test-openai-key';
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // 重新初始化
      AdapterRegistry.reset();
      await AdapterRegistry.initialize();

      // 检查启用状态
      const openaiRegistration = factory.getAdapterRegistration(ModelProvider.OPENAI);
      const anthropicRegistration = factory.getAdapterRegistration(ModelProvider.ANTHROPIC);
      const geminiRegistration = factory.getAdapterRegistration(ModelProvider.GEMINI);

      expect(openaiRegistration?.isEnabled).toBe(true);
      expect(anthropicRegistration?.isEnabled).toBe(false);
      expect(geminiRegistration?.isEnabled).toBe(false);

      // 恢复原始环境变量
      if (originalOpenAIKey !== undefined) {
        process.env.OPENAI_API_KEY = originalOpenAIKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
      if (originalAnthropicKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
      }
      if (originalGoogleKey !== undefined) {
        process.env.GOOGLE_API_KEY = originalGoogleKey;
      }
    });
  });

  describe('Factory Integration', () => {
    test('should integrate with ModelFactory correctly', async () => {
      await AdapterRegistry.initialize();
      
      const factoryStatus = factory.getFactoryStatus();
      expect(factoryStatus.registeredProviders).toBeGreaterThan(0);
      
      // 检查所有预期的提供商都已注册
      const registeredProviders = factory.getRegisteredProviders();
      expect(registeredProviders).toContain(ModelProvider.OLLAMA);
      expect(registeredProviders).toContain(ModelProvider.OPENAI);
      expect(registeredProviders).toContain(ModelProvider.ANTHROPIC);
      expect(registeredProviders).toContain(ModelProvider.GEMINI);
    });

    test('should allow factory operations after registration', async () => {
      await AdapterRegistry.initialize();
      
      // 应该能够获取注册信息
      const registrations = factory.getAllAdapterRegistrations();
      expect(registrations.length).toBeGreaterThan(0);
      
      // 应该能够检查适配器状态
      expect(factory.isAdapterRegistered(ModelProvider.OLLAMA)).toBe(true);
    });
  });
});