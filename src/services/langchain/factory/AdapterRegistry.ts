// 适配器注册器
import { ModelFactory } from './ModelFactory';
import { ModelProvider } from '../interfaces';

/**
 * 适配器注册器
 * 负责自动注册所有可用的模型适配器
 */
export class AdapterRegistry {
  private static isInitialized = false;

  /**
   * 初始化并注册所有适配器
   */
  public static async initialize(): Promise<void> {
    if (AdapterRegistry.isInitialized) {
      return;
    }

    const factory = ModelFactory.getInstance();

    try {
      // 注册 Ollama 适配器
      await AdapterRegistry.registerOllamaAdapter(factory);

      // 注册 OpenAI 适配器
      await AdapterRegistry.registerOpenAIAdapter(factory);

      // 注册 Anthropic 适配器
      await AdapterRegistry.registerAnthropicAdapter(factory);

      // 注册 Gemini 适配器
      await AdapterRegistry.registerGeminiAdapter(factory);

      AdapterRegistry.isInitialized = true;
      console.log('All model adapters registered successfully');
    } catch (error) {
      console.error('Failed to register model adapters:', error);
      throw error;
    }
  }

  /**
   * 注册 Ollama 适配器
   */
  private static async registerOllamaAdapter(factory: ModelFactory): Promise<void> {
    try {
      // 动态导入 Ollama 适配器
      const { OllamaAdapter } = await import('../adapters/OllamaAdapter');
      
      factory.registerAdapter(
        ModelProvider.OLLAMA,
        OllamaAdapter,
        'Ollama Local Models',
        true
      );
    } catch (error) {
      console.warn('Ollama adapter not available:', error);
      // Ollama 适配器不可用时不抛出错误，因为它可能是可选的
    }
  }

  /**
   * 注册 OpenAI 适配器
   */
  private static async registerOpenAIAdapter(factory: ModelFactory): Promise<void> {
    try {
      // 动态导入 OpenAI 适配器
      const { OpenAIAdapter } = await import('../adapters/OpenAIAdapter');
      
      factory.registerAdapter(
        ModelProvider.OPENAI,
        OpenAIAdapter,
        'OpenAI GPT Models',
        !!process.env.OPENAI_API_KEY
      );
    } catch (error) {
      console.warn('OpenAI adapter not available:', error);
    }
  }

  /**
   * 注册 Anthropic 适配器
   */
  private static async registerAnthropicAdapter(factory: ModelFactory): Promise<void> {
    try {
      // 动态导入 Anthropic 适配器
      const { AnthropicAdapter } = await import('../adapters/AnthropicAdapter');
      
      factory.registerAdapter(
        ModelProvider.ANTHROPIC,
        AnthropicAdapter,
        'Anthropic Claude Models',
        !!process.env.ANTHROPIC_API_KEY
      );
    } catch (error) {
      console.warn('Anthropic adapter not available:', error);
    }
  }

  /**
   * 注册 Gemini 适配器
   */
  private static async registerGeminiAdapter(factory: ModelFactory): Promise<void> {
    try {
      // 动态导入 Gemini 适配器
      const { GeminiAdapter } = await import('../adapters/GeminiAdapter');
      
      factory.registerAdapter(
        ModelProvider.GEMINI,
        GeminiAdapter,
        'Google Gemini Models',
        !!process.env.GOOGLE_API_KEY
      );
    } catch (error) {
      console.warn('Gemini adapter not available:', error);
    }
  }

  /**
   * 重新初始化注册器
   */
  public static async reinitialize(): Promise<void> {
    AdapterRegistry.isInitialized = false;
    await AdapterRegistry.initialize();
  }

  /**
   * 检查是否已初始化
   */
  public static isReady(): boolean {
    return AdapterRegistry.isInitialized;
  }

  /**
   * 重置注册器状态（主要用于测试）
   */
  public static reset(): void {
    AdapterRegistry.isInitialized = false;
  }
}