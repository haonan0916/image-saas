// 日志中间件插件示例
import { MiddlewarePlugin, PluginPriority, PluginContext } from '../PluginManager';
import { ChatMessage, ChatOptions } from '../../../../types/langchain';

/**
 * 日志中间件插件
 * 记录所有聊天请求和响应的详细信息
 */
export class LoggingMiddlewarePlugin implements MiddlewarePlugin {
  name = 'logging-middleware';
  version = '1.0.0';
  priority = PluginPriority.HIGHEST; // 最高优先级，确保记录所有请求
  enabled = true;

  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private includeContent = true;
  private maxContentLength = 500;

  async execute(
    messages: ChatMessage[],
    options: ChatOptions,
    context: PluginContext,
    next: () => Promise<string>
  ): Promise<string> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // 记录请求开始
    this.logRequest(requestId, messages, options, context);

    try {
      // 执行下一个中间件或最终处理器
      const response = await next();
      const duration = Date.now() - startTime;

      // 记录成功响应
      this.logResponse(requestId, response, duration, context, false);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 记录错误响应
      this.logError(requestId, error as Error, duration, context);

      throw error; // 重新抛出错误
    }
  }

  private logRequest(
    requestId: string,
    messages: ChatMessage[],
    options: ChatOptions,
    context: PluginContext
  ): void {
    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      userId: context.userId,
      modelId: context.modelId,
      provider: context.provider,
      messageCount: messages.length,
      options: {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: options.stream
      }
    };

    if (this.includeContent) {
      logData['messages'] = messages.map(msg => ({
        role: msg.role,
        content: this.truncateContent(msg.content),
        timestamp: msg.timestamp
      }));
    }

    this.log('info', `[REQUEST] ${requestId}`, logData);
  }

  private logResponse(
    requestId: string,
    response: string,
    duration: number,
    context: PluginContext,
    isError: boolean
  ): void {
    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      sessionId: context.sessionId,
      modelId: context.modelId,
      provider: context.provider,
      responseLength: response.length,
      isError
    };

    if (this.includeContent && !isError) {
      logData['response'] = this.truncateContent(response);
    }

    const level = isError ? 'error' : 'info';
    this.log(level, `[RESPONSE] ${requestId}`, logData);
  }

  private logError(
    requestId: string,
    error: Error,
    duration: number,
    context: PluginContext
  ): void {
    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      sessionId: context.sessionId,
      modelId: context.modelId,
      provider: context.provider,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };

    this.log('error', `[ERROR] ${requestId}`, logData);
  }

  private log(level: string, message: string, data: any): void {
    if (this.shouldLog(level)) {
      console[level as keyof Console](message, data);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private truncateContent(content: string): string {
    if (content.length <= this.maxContentLength) {
      return content;
    }
    return content.substring(0, this.maxContentLength) + '...';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 设置日志级别
   */
  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  /**
   * 设置是否包含内容
   */
  setIncludeContent(include: boolean): void {
    this.includeContent = include;
  }

  /**
   * 设置最大内容长度
   */
  setMaxContentLength(length: number): void {
    this.maxContentLength = Math.max(0, length);
  }
}