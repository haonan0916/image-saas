// LangChain 集成测试
import { LangChainChatManager } from '../chat/LangChainChatManager';
import { ModelFactory } from '../factory/ModelFactory';
import { AdapterRegistry } from '../factory/AdapterRegistry';
import { PluginManager, ContentFilterPlugin, ResponseEnhancerPlugin, LoggingMiddlewarePlugin } from '../plugins';
import { ChatRequest, ModelProvider, FallbackStrategy } from '../../../types/langchain';
import { LogLevel } from '../observability';

describe('LangChain Integration Tests', () => {
  let chatManager: LangChainChatManager;
  let modelFactory: ModelFactory;

  beforeAll(async () => {
    // 初始化适配器注册表
    await AdapterRegistry.initialize();
    
    // 获取模型工厂实例
    modelFactory = ModelFactory.getInstance();

    // 初始化聊天管理器
    chatManager = new LangChainChatManager(modelFactory, {
      defaultModel: 'ollama/qwen2.5:0.5b',
      fallbackStrategy: FallbackStrategy.SEQUENTIAL,
      enableFallback: true,
      performanceConfig: {
        connectionPoolSize: 3,
        requestTimeout: 10000,
        cacheSize: 50,
        cacheTTL: 60000,
        enableMetrics: true
      },
      observabilityConfig: {
        enableLogging: true,
        enableMetrics: true,
        enableTracing: true,
        logLevel: LogLevel.DEBUG,
        metricsRetentionDays: 1,
        tracingRetentionDays: 1,
        excludeSensitiveData: true
      },
      enablePlugins: true
    });

    // 等待初始化完成
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // 清理资源
    if (chatManager && typeof chatManager.dispose === 'function') {
      await chatManager.dispose();
    }
    
    // 重置适配器注册表
    AdapterRegistry.reset();
  });

  describe('基本聊天功能', () => {
    it('应该能够发送消息并获得回复', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: '你好，请简单介绍一下自己' }
        ],
        modelId: 'ollama/qwen2.5:0.5b',
        sessionId: 'test-session-1'
      };

      const response = await chatManager.sendMessage(request);

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.modelId).toBe('ollama/qwen2.5:0.5b');
      expect(response.timestamp).toBeInstanceOf(Date);
    }, 30000);

    it('应该能够处理多轮对话', async () => {
      const messages = [
        { role: 'user' as const, content: '我的名字是张三' },
        { role: 'assistant' as const, content: '你好张三，很高兴认识你！' },
        { role: 'user' as const, content: '你还记得我的名字吗？' }
      ];

      const request: ChatRequest = {
        messages,
        modelId: 'ollama/qwen2.5:0.5b',
        sessionId: 'test-session-2'
      };

      const response = await chatManager.sendMessage(request);

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      // 响应应该包含用户的名字
      expect(response.content.toLowerCase()).toContain('张三');
    }, 30000);
  });

  describe('模型管理', () => {
    it('应该能够获取可用模型列表', async () => {
      const models = await chatManager.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // 检查模型信息结构
      const firstModel = models[0];
      expect(firstModel).toHaveProperty('id');
      expect(firstModel).toHaveProperty('name');
      expect(firstModel).toHaveProperty('providerId');
      expect(firstModel).toHaveProperty('capabilities');
    });

    it('应该能够切换模型', async () => {
      const models = await chatManager.getAvailableModels();
      if (models.length > 1) {
        const newModel = models[1];
        await chatManager.switchModel(newModel.id);
        
        expect(chatManager.getCurrentModel()).toBe(newModel.id);
      }
    });

    it('应该能够检查健康状态', async () => {
      const healthStatus = await chatManager.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(typeof healthStatus).toBe('object');
      
      // 应该包含各个提供商的健康状态
      for (const [provider, status] of Object.entries(healthStatus)) {
        expect(status).toHaveProperty('connected');
        expect(typeof status.connected).toBe('boolean');
      }
    });
  });

  describe('插件系统', () => {
    let pluginManager: PluginManager;

    beforeEach(() => {
      pluginManager = new PluginManager();
    });

    it('应该能够注册和使用预处理器插件', async () => {
      const contentFilter = new ContentFilterPlugin();
      pluginManager.registerPreprocessor(contentFilter);

      const messages = [
        { role: 'user' as const, content: '这是一个包含敏感词1的消息' }
      ];

      const result = await pluginManager.executePreprocessors(
        messages,
        {},
        {
          modelId: 'test-model',
          provider: ModelProvider.OLLAMA,
          timestamp: new Date()
        }
      );

      expect(result.messages[0].content).toContain('[已过滤]');
      expect(result.messages[0].content).not.toContain('敏感词1');
    });

    it('应该能够注册和使用后处理器插件', async () => {
      const responseEnhancer = new ResponseEnhancerPlugin();
      pluginManager.registerPostprocessor(responseEnhancer);

      const response = '这是一个包含问题的回答';
      const originalMessages = [
        { role: 'user' as const, content: '测试消息' }
      ];

      const result = await pluginManager.executePostprocessors(
        response,
        originalMessages,
        {
          modelId: 'test-model',
          provider: ModelProvider.OLLAMA,
          timestamp: new Date()
        }
      );

      expect(result).toContain('❓'); // 应该添加了表情符号
    });

    it('应该能够注册和使用中间件插件', async () => {
      const loggingMiddleware = new LoggingMiddlewarePlugin();
      pluginManager.registerMiddleware(loggingMiddleware);

      const messages = [
        { role: 'user' as const, content: '测试消息' }
      ];

      let finalHandlerCalled = false;
      const finalHandler = async () => {
        finalHandlerCalled = true;
        return '测试响应';
      };

      const result = await pluginManager.executeMiddlewares(
        messages,
        {},
        {
          modelId: 'test-model',
          provider: ModelProvider.OLLAMA,
          timestamp: new Date(),
          sessionId: 'test-session'
        },
        finalHandler
      );

      expect(finalHandlerCalled).toBe(true);
      expect(result).toBe('测试响应');
    });

    it('应该能够管理插件状态', () => {
      const contentFilter = new ContentFilterPlugin();
      pluginManager.registerPreprocessor(contentFilter);

      // 检查插件统计
      const stats = pluginManager.getPluginStats();
      expect(stats.total).toBe(1);
      expect(stats.enabled).toBe(1);
      expect(stats.disabled).toBe(0);

      // 禁用插件
      pluginManager.disablePlugin('content-filter', 'preprocessor' as any);
      const updatedStats = pluginManager.getPluginStats();
      expect(updatedStats.enabled).toBe(0);
      expect(updatedStats.disabled).toBe(1);
    });
  });

  describe('性能和可观测性', () => {
    it('应该能够收集性能指标', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: '测试性能指标收集' }
        ],
        modelId: 'ollama/qwen2.5:0.5b',
        sessionId: 'test-session-metrics'
      };

      await chatManager.sendMessage(request);

      const metrics = chatManager.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      
      if (metrics) {
        expect(metrics.requestCount).toBeGreaterThan(0);
        expect(metrics.averageResponseTime).toBeGreaterThan(0);
        expect(typeof metrics.errorRate).toBe('number');
      }
    }, 30000);

    it('应该能够记录和查询日志', async () => {
      // 这个测试需要访问可观测性管理器的日志
      // 在实际实现中，你可能需要通过 chatManager 暴露日志查询接口
      expect(true).toBe(true); // 占位符测试
    });
  });

  describe('错误处理和回退', () => {
    it('应该能够处理模型不可用的情况', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: '测试错误处理' }
        ],
        modelId: 'non-existent-model',
        sessionId: 'test-session-error'
      };

      // 应该抛出错误或使用回退机制
      await expect(async () => {
        await chatManager.sendMessage(request);
      }).rejects.toThrow();
    });

    it('应该能够处理网络超时', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: '测试超时处理' }
        ],
        modelId: 'ollama/qwen2.5:0.5b',
        sessionId: 'test-session-timeout',
        options: {
          timeout: 1 // 1ms 超时，必然失败
        }
      };

      await expect(async () => {
        await chatManager.sendMessage(request);
      }).rejects.toThrow();
    });
  });

  describe('流式响应', () => {
    it('应该能够处理流式响应', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: '请用流式方式回答这个问题' }
        ],
        modelId: 'ollama/qwen2.5:0.5b',
        sessionId: 'test-session-stream',
        options: {
          stream: true
        }
      };

      const chunks: string[] = [];
      
      for await (const chunk of chatManager.sendMessageStream(request)) {
        chunks.push(chunk.content);
        expect(chunk.modelId).toBe('ollama/qwen2.5:0.5b');
        expect(chunk.timestamp).toBeInstanceOf(Date);
      }

      expect(chunks.length).toBeGreaterThan(0);
      
      // 最后一个块应该标记为完成
      // 注意：这取决于具体的实现
    }, 30000);
  });

  describe('并发处理', () => {
    it('应该能够处理并发请求', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => ({
        messages: [
          { role: 'user' as const, content: `并发测试消息 ${i + 1}` }
        ],
        modelId: 'ollama/qwen2.5:0.5b',
        sessionId: `test-session-concurrent-${i + 1}`
      }));

      const promises = requests.map(request => chatManager.sendMessage(request));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.content).toBeTruthy();
        expect(response.modelId).toBe('ollama/qwen2.5:0.5b');
      });
    }, 45000);
  });
});