// LangChain 插件管理器
import { ChatMessage, ChatOptions, ModelProvider } from '../../../types/langchain';

/**
 * 插件类型
 */
export enum PluginType {
  PREPROCESSOR = 'preprocessor',
  POSTPROCESSOR = 'postprocessor',
  MIDDLEWARE = 'middleware',
  ADAPTER = 'adapter'
}

/**
 * 插件优先级
 */
export enum PluginPriority {
  HIGHEST = 1000,
  HIGH = 750,
  NORMAL = 500,
  LOW = 250,
  LOWEST = 100
}

/**
 * 插件上下文
 */
export interface PluginContext {
  sessionId?: string;
  userId?: string;
  modelId: string;
  provider: ModelProvider;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 预处理器插件接口
 */
export interface PreprocessorPlugin {
  name: string;
  version: string;
  priority: PluginPriority;
  enabled: boolean;
  
  /**
   * 预处理消息
   */
  preprocess(
    messages: ChatMessage[], 
    options: ChatOptions, 
    context: PluginContext
  ): Promise<{ messages: ChatMessage[]; options: ChatOptions }>;
}

/**
 * 后处理器插件接口
 */
export interface PostprocessorPlugin {
  name: string;
  version: string;
  priority: PluginPriority;
  enabled: boolean;
  
  /**
   * 后处理响应
   */
  postprocess(
    response: string, 
    originalMessages: ChatMessage[], 
    context: PluginContext
  ): Promise<string>;
}

/**
 * 中间件插件接口
 */
export interface MiddlewarePlugin {
  name: string;
  version: string;
  priority: PluginPriority;
  enabled: boolean;
  
  /**
   * 中间件处理
   */
  execute(
    messages: ChatMessage[],
    options: ChatOptions,
    context: PluginContext,
    next: () => Promise<string>
  ): Promise<string>;
}

/**
 * 自定义适配器插件接口
 */
export interface AdapterPlugin {
  name: string;
  version: string;
  providerId: string;
  providerName: string;
  enabled: boolean;
  
  /**
   * 创建适配器实例
   */
  createAdapter(config: any): any; // 返回 ModelAdapter 实例
  
  /**
   * 获取支持的模型
   */
  getSupportedModels(): string[];
  
  /**
   * 验证配置
   */
  validateConfig(config: any): boolean;
}

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  plugin: PreprocessorPlugin | PostprocessorPlugin | MiddlewarePlugin | AdapterPlugin;
  type: PluginType;
  registeredAt: Date;
}

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, PluginRegistration> = new Map();
  private preprocessors: PreprocessorPlugin[] = [];
  private postprocessors: PostprocessorPlugin[] = [];
  private middlewares: MiddlewarePlugin[] = [];
  private adapters: AdapterPlugin[] = [];

  /**
   * 注册预处理器插件
   */
  registerPreprocessor(plugin: PreprocessorPlugin): void {
    this.registerPlugin(plugin, PluginType.PREPROCESSOR);
    this.preprocessors.push(plugin);
    this.sortPluginsByPriority(this.preprocessors);
  }

  /**
   * 注册后处理器插件
   */
  registerPostprocessor(plugin: PostprocessorPlugin): void {
    this.registerPlugin(plugin, PluginType.POSTPROCESSOR);
    this.postprocessors.push(plugin);
    this.sortPluginsByPriority(this.postprocessors);
  }

  /**
   * 注册中间件插件
   */
  registerMiddleware(plugin: MiddlewarePlugin): void {
    this.registerPlugin(plugin, PluginType.MIDDLEWARE);
    this.middlewares.push(plugin);
    this.sortPluginsByPriority(this.middlewares);
  }

  /**
   * 注册适配器插件
   */
  registerAdapter(plugin: AdapterPlugin): void {
    this.registerPlugin(plugin, PluginType.ADAPTER);
    this.adapters.push(plugin);
  }

  /**
   * 注册插件
   */
  private registerPlugin(
    plugin: PreprocessorPlugin | PostprocessorPlugin | MiddlewarePlugin | AdapterPlugin,
    type: PluginType
  ): void {
    const key = `${type}:${plugin.name}`;
    
    if (this.plugins.has(key)) {
      throw new Error(`Plugin ${plugin.name} of type ${type} is already registered`);
    }

    this.plugins.set(key, {
      plugin,
      type,
      registeredAt: new Date()
    });

    console.log(`Plugin registered: ${plugin.name} (${type}) v${plugin.version}`);
  }

  /**
   * 注销插件
   */
  unregisterPlugin(name: string, type: PluginType): boolean {
    const key = `${type}:${name}`;
    const registration = this.plugins.get(key);
    
    if (!registration) {
      return false;
    }

    this.plugins.delete(key);

    // 从对应的数组中移除
    switch (type) {
      case PluginType.PREPROCESSOR:
        this.preprocessors = this.preprocessors.filter(p => p.name !== name);
        break;
      case PluginType.POSTPROCESSOR:
        this.postprocessors = this.postprocessors.filter(p => p.name !== name);
        break;
      case PluginType.MIDDLEWARE:
        this.middlewares = this.middlewares.filter(p => p.name !== name);
        break;
      case PluginType.ADAPTER:
        this.adapters = this.adapters.filter(p => p.name !== name);
        break;
    }

    console.log(`Plugin unregistered: ${name} (${type})`);
    return true;
  }

  /**
   * 启用插件
   */
  enablePlugin(name: string, type: PluginType): boolean {
    const key = `${type}:${name}`;
    const registration = this.plugins.get(key);
    
    if (!registration) {
      return false;
    }

    registration.plugin.enabled = true;
    console.log(`Plugin enabled: ${name} (${type})`);
    return true;
  }

  /**
   * 禁用插件
   */
  disablePlugin(name: string, type: PluginType): boolean {
    const key = `${type}:${name}`;
    const registration = this.plugins.get(key);
    
    if (!registration) {
      return false;
    }

    registration.plugin.enabled = false;
    console.log(`Plugin disabled: ${name} (${type})`);
    return true;
  }

  /**
   * 执行预处理
   */
  async executePreprocessors(
    messages: ChatMessage[],
    options: ChatOptions,
    context: PluginContext
  ): Promise<{ messages: ChatMessage[]; options: ChatOptions }> {
    let result = { messages: [...messages], options: { ...options } };

    for (const plugin of this.preprocessors) {
      if (!plugin.enabled) continue;

      try {
        result = await plugin.preprocess(result.messages, result.options, context);
      } catch (error) {
        console.error(`Preprocessor plugin ${plugin.name} failed:`, error);
        // 继续执行其他插件
      }
    }

    return result;
  }

  /**
   * 执行后处理
   */
  async executePostprocessors(
    response: string,
    originalMessages: ChatMessage[],
    context: PluginContext
  ): Promise<string> {
    let result = response;

    for (const plugin of this.postprocessors) {
      if (!plugin.enabled) continue;

      try {
        result = await plugin.postprocess(result, originalMessages, context);
      } catch (error) {
        console.error(`Postprocessor plugin ${plugin.name} failed:`, error);
        // 继续执行其他插件
      }
    }

    return result;
  }

  /**
   * 执行中间件
   */
  async executeMiddlewares(
    messages: ChatMessage[],
    options: ChatOptions,
    context: PluginContext,
    finalHandler: () => Promise<string>
  ): Promise<string> {
    let index = 0;

    const next = async (): Promise<string> => {
      if (index >= this.middlewares.length) {
        return finalHandler();
      }

      const plugin = this.middlewares[index++];
      
      if (!plugin.enabled) {
        return next();
      }

      try {
        return await plugin.execute(messages, options, context, next);
      } catch (error) {
        console.error(`Middleware plugin ${plugin.name} failed:`, error);
        return next(); // 继续执行下一个中间件
      }
    };

    return next();
  }

  /**
   * 获取自定义适配器
   */
  getCustomAdapters(): AdapterPlugin[] {
    return this.adapters.filter(adapter => adapter.enabled);
  }

  /**
   * 获取插件信息
   */
  getPluginInfo(name: string, type: PluginType): PluginRegistration | undefined {
    const key = `${type}:${name}`;
    return this.plugins.get(key);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): PluginRegistration[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取指定类型的插件
   */
  getPluginsByType(type: PluginType): PluginRegistration[] {
    return Array.from(this.plugins.values()).filter(reg => reg.type === type);
  }

  /**
   * 获取插件统计信息
   */
  getPluginStats(): Record<string, any> {
    const stats = {
      total: this.plugins.size,
      enabled: 0,
      disabled: 0,
      byType: {} as Record<PluginType, number>
    };

    for (const registration of this.plugins.values()) {
      if (registration.plugin.enabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      stats.byType[registration.type] = (stats.byType[registration.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 按优先级排序插件
   */
  private sortPluginsByPriority<T extends { priority: PluginPriority }>(plugins: T[]): void {
    plugins.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 清理所有插件
   */
  clear(): void {
    this.plugins.clear();
    this.preprocessors = [];
    this.postprocessors = [];
    this.middlewares = [];
    this.adapters = [];
    console.log('All plugins cleared');
  }
}