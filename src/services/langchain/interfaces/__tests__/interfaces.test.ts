// LangChain 接口测试
import { 
  ChatManager, 
  ModelAdapter, 
  ConfigurationManager, 
  FallbackManager,
  ChatMessage,
  ChatRequest,
  ChatOptions,
  ModelProvider
} from '../index';

describe('LangChain Interfaces', () => {
  describe('Type Definitions', () => {
    test('ChatMessage should have correct structure', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello, world!',
        timestamp: new Date()
      };
      
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, world!');
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    test('ChatRequest should have correct structure', () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        modelId: 'test-model',
        sessionId: 'test-session'
      };
      
      expect(request.messages).toHaveLength(1);
      expect(request.modelId).toBe('test-model');
      expect(request.sessionId).toBe('test-session');
    });

    test('ChatOptions should have correct structure', () => {
      const options: ChatOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        stream: true,
        timeout: 30000
      };
      
      expect(options.temperature).toBe(0.7);
      expect(options.maxTokens).toBe(1000);
      expect(options.stream).toBe(true);
      expect(options.timeout).toBe(30000);
    });
  });

  describe('Enums', () => {
    test('ModelProvider enum should have correct values', () => {
      expect(ModelProvider.OLLAMA).toBe('ollama');
      expect(ModelProvider.OPENAI).toBe('openai');
      expect(ModelProvider.ANTHROPIC).toBe('anthropic');
      expect(ModelProvider.GEMINI).toBe('gemini');
    });
  });

  describe('Interface Contracts', () => {
    test('ChatManager interface should define required methods', () => {
      // 这个测试验证接口定义的完整性
      const mockChatManager: Partial<ChatManager> = {
        sendMessage: jest.fn(),
        sendMessageStream: jest.fn(),
        getAvailableModels: jest.fn(),
        isModelAvailable: jest.fn(),
        setDefaultModel: jest.fn(),
        getDefaultModel: jest.fn(),
        getModelHealth: jest.fn(),
        refreshModels: jest.fn(),
        dispose: jest.fn()
      };

      // 验证所有必需的方法都存在
      expect(typeof mockChatManager.sendMessage).toBe('function');
      expect(typeof mockChatManager.sendMessageStream).toBe('function');
      expect(typeof mockChatManager.getAvailableModels).toBe('function');
      expect(typeof mockChatManager.isModelAvailable).toBe('function');
      expect(typeof mockChatManager.setDefaultModel).toBe('function');
      expect(typeof mockChatManager.getDefaultModel).toBe('function');
      expect(typeof mockChatManager.getModelHealth).toBe('function');
      expect(typeof mockChatManager.refreshModels).toBe('function');
      expect(typeof mockChatManager.dispose).toBe('function');
    });

    test('ModelAdapter interface should define required methods', () => {
      const mockAdapter: Partial<ModelAdapter> = {
        providerId: 'test',
        providerName: 'Test Provider',
        initialize: jest.fn(),
        chat: jest.fn(),
        chatStream: jest.fn(),
        getSupportedModels: jest.fn(),
        healthCheck: jest.fn(),
        isModelAvailable: jest.fn(),
        getCurrentModel: jest.fn(),
        setCurrentModel: jest.fn(),
        getConfig: jest.fn(),
        updateConfig: jest.fn(),
        dispose: jest.fn()
      };

      // 验证所有必需的属性和方法都存在
      expect(mockAdapter.providerId).toBe('test');
      expect(mockAdapter.providerName).toBe('Test Provider');
      expect(typeof mockAdapter.initialize).toBe('function');
      expect(typeof mockAdapter.chat).toBe('function');
      expect(typeof mockAdapter.chatStream).toBe('function');
      expect(typeof mockAdapter.getSupportedModels).toBe('function');
      expect(typeof mockAdapter.healthCheck).toBe('function');
      expect(typeof mockAdapter.isModelAvailable).toBe('function');
      expect(typeof mockAdapter.getCurrentModel).toBe('function');
      expect(typeof mockAdapter.setCurrentModel).toBe('function');
      expect(typeof mockAdapter.getConfig).toBe('function');
      expect(typeof mockAdapter.updateConfig).toBe('function');
      expect(typeof mockAdapter.dispose).toBe('function');
    });

    test('ConfigurationManager interface should define required methods', () => {
      const mockConfigManager: Partial<ConfigurationManager> = {
        loadConfig: jest.fn(),
        getModelConfig: jest.fn(),
        updateConfig: jest.fn(),
        validateConfig: jest.fn(),
        onConfigChange: jest.fn(),
        offConfigChange: jest.fn(),
        getCurrentConfig: jest.fn(),
        reloadConfig: jest.fn(),
        saveConfig: jest.fn()
      };

      // 验证所有必需的方法都存在
      expect(typeof mockConfigManager.loadConfig).toBe('function');
      expect(typeof mockConfigManager.getModelConfig).toBe('function');
      expect(typeof mockConfigManager.updateConfig).toBe('function');
      expect(typeof mockConfigManager.validateConfig).toBe('function');
      expect(typeof mockConfigManager.onConfigChange).toBe('function');
      expect(typeof mockConfigManager.offConfigChange).toBe('function');
      expect(typeof mockConfigManager.getCurrentConfig).toBe('function');
      expect(typeof mockConfigManager.reloadConfig).toBe('function');
      expect(typeof mockConfigManager.saveConfig).toBe('function');
    });

    test('FallbackManager interface should define required methods', () => {
      const mockFallbackManager: Partial<FallbackManager> = {
        executeWithFallback: jest.fn(),
        recordFailure: jest.fn(),
        recordSuccess: jest.fn(),
        isModelHealthy: jest.fn(),
        getNextAvailableModel: jest.fn(),
        getFailureStats: jest.fn(),
        resetFailureStats: jest.fn(),
        getAllHealthStatus: jest.fn(),
        setFallbackStrategy: jest.fn()
      };

      // 验证所有必需的方法都存在
      expect(typeof mockFallbackManager.executeWithFallback).toBe('function');
      expect(typeof mockFallbackManager.recordFailure).toBe('function');
      expect(typeof mockFallbackManager.recordSuccess).toBe('function');
      expect(typeof mockFallbackManager.isModelHealthy).toBe('function');
      expect(typeof mockFallbackManager.getNextAvailableModel).toBe('function');
      expect(typeof mockFallbackManager.getFailureStats).toBe('function');
      expect(typeof mockFallbackManager.resetFailureStats).toBe('function');
      expect(typeof mockFallbackManager.getAllHealthStatus).toBe('function');
      expect(typeof mockFallbackManager.setFallbackStrategy).toBe('function');
    });
  });
});