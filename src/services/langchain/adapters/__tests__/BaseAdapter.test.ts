// BaseAdapter 测试
import { BaseAdapter } from '../BaseAdapter';
import { 
  ModelConfig, 
  ChatMessage, 
  ChatOptions, 
  ModelInfo, 
  ModelProvider,
  ChatServiceError 
} from '../../interfaces';

// 创建一个测试用的具体适配器类
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
    const cleanMessages = this.validateAndCleanMessages(messages);
    const mergedOptions = this.mergeOptions(options);
    
    // 模拟聊天响应
    return `Test response for ${cleanMessages.length} messages with model ${this.currentModel}`;
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    this.ensureInitialized();
    const cleanMessages = this.validateAndCleanMessages(messages);
    
    // 模拟流式响应
    const chunks = ['Hello', ' ', 'world', '!'];
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  async getSupportedModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'test-model-1',
        name: 'Test Model 1',
        providerId: this.providerId,
        capabilities: {
          supportsStreaming: true,
          supportsFunctions: false,
          maxTokens: 4096,
          supportedLanguages: ['en', 'zh']
        }
      }
    ];
  }

  async healthCheck(): Promise<boolean> {
    return this.isInitialized;
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;
  let config: ModelConfig;

  beforeEach(() => {
    config = {
      enabled: true,
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
    
    adapter = new TestAdapter(config);
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  describe('Initialization', () => {
    test('should initialize with correct provider info', () => {
      expect(adapter.providerId).toBe(ModelProvider.OLLAMA);
      expect(adapter.providerName).toBe('Test Adapter');
    });

    test('should set default model from config', () => {
      expect(adapter.getCurrentModel()).toBe('test-model-1');
    });

    test('should initialize successfully', async () => {
      await adapter.initialize(config);
      expect(adapter['isInitialized']).toBe(true);
    });
  });

  describe('Model Management', () => {
    beforeEach(async () => {
      await adapter.initialize(config);
    });

    test('should get current model', () => {
      expect(adapter.getCurrentModel()).toBe('test-model-1');
    });

    test('should set current model', () => {
      adapter.setCurrentModel('test-model-2');
      expect(adapter.getCurrentModel()).toBe('test-model-2');
    });

    test('should throw error for unsupported model', () => {
      expect(() => {
        adapter.setCurrentModel('unsupported-model');
      }).toThrow(ChatServiceError);
    });

    test('should check model availability', async () => {
      const isAvailable = await adapter.isModelAvailable('test-model-1');
      expect(isAvailable).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    test('should get config', () => {
      const adapterConfig = adapter.getConfig();
      expect(adapterConfig).toEqual(config);
      expect(adapterConfig).not.toBe(config); // 应该是副本
    });

    test('should update config', async () => {
      await adapter.initialize(config);
      
      const newConfig = { timeout: 60000, defaultModel: 'test-model-2' };
      await adapter.updateConfig(newConfig);
      
      const updatedConfig = adapter.getConfig();
      expect(updatedConfig.timeout).toBe(60000);
      expect(adapter.getCurrentModel()).toBe('test-model-2');
    });
  });

  describe('Message Validation', () => {
    beforeEach(async () => {
      await adapter.initialize(config);
    });

    test('should validate and clean messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '  Hello world  ' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const cleanedMessages = adapter['validateAndCleanMessages'](messages);
      
      expect(cleanedMessages).toHaveLength(2);
      expect(cleanedMessages[0].content).toBe('Hello world'); // 应该去除空格
      expect(cleanedMessages[0].timestamp).toBeInstanceOf(Date);
    });

    test('should throw error for empty messages', () => {
      expect(() => {
        adapter['validateAndCleanMessages']([]);
      }).toThrow(ChatServiceError);
    });

    test('should throw error for invalid content type', () => {
      const invalidMessages = [
        { role: 'user', content: 123 as any }
      ];

      expect(() => {
        adapter['validateAndCleanMessages'](invalidMessages);
      }).toThrow(ChatServiceError);
    });
  });

  describe('Options Merging', () => {
    test('should merge options with defaults', () => {
      const options: ChatOptions = { temperature: 0.5 };
      const mergedOptions = adapter['mergeOptions'](options);
      
      expect(mergedOptions.temperature).toBe(0.5);
      expect(mergedOptions.maxTokens).toBe(2048); // 默认值
      expect(mergedOptions.timeout).toBe(config.timeout);
    });

    test('should use defaults when no options provided', () => {
      const mergedOptions = adapter['mergeOptions']();
      
      expect(mergedOptions.temperature).toBe(0.7);
      expect(mergedOptions.maxTokens).toBe(2048);
      expect(mergedOptions.topP).toBe(1.0);
      expect(mergedOptions.stream).toBe(false);
    });
  });

  describe('Chat Functionality', () => {
    beforeEach(async () => {
      await adapter.initialize(config);
    });

    test('should send chat message', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const response = await adapter.chat(messages);
      expect(response).toContain('Test response');
      expect(response).toContain('test-model-1');
    });

    test('should stream chat messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const chunks: string[] = [];
      for await (const chunk of adapter.chatStream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' ', 'world', '!']);
    });

    test('should throw error when not initialized', async () => {
      const uninitializedAdapter = new TestAdapter(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(uninitializedAdapter.chat(messages)).rejects.toThrow(ChatServiceError);
    });
  });

  describe('Utility Methods', () => {
    test('should handle timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 2000));
      
      await expect(
        adapter['withTimeout'](slowPromise, 100)
      ).rejects.toThrow('Request timeout');
    });

    test('should retry on failure', async () => {
      let attempts = 0;
      const flakyOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await adapter['withRetry'](flakyOperation, 3);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('should fail after max retries', async () => {
      const alwaysFailOperation = async () => {
        throw new Error('Permanent failure');
      };

      await expect(
        adapter['withRetry'](alwaysFailOperation, 2)
      ).rejects.toThrow('Permanent failure');
    });
  });

  describe('Cleanup', () => {
    test('should dispose properly', async () => {
      await adapter.initialize(config);
      expect(adapter['isInitialized']).toBe(true);
      
      await adapter.dispose();
      expect(adapter['isInitialized']).toBe(false);
    });
  });
});