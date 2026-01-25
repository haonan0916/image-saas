// FallbackManager 接口定义
import { ModelAdapter, ModelProvider, ChatMessage, ChatOptions, FailureStats, FallbackStrategy } from '../../../types/langchain';

/**
 * 回退管理器接口
 * 处理模型故障和回退逻辑
 */
export interface FallbackManager {
  /**
   * 执行带回退的操作
   */
  executeWithFallback<T>(
    adapters: ModelAdapter[],
    operation: (adapter: ModelAdapter) => Promise<T>,
    strategy?: FallbackStrategy
  ): Promise<T>;

  /**
   * 执行带回退的聊天操作
   */
  executeChat(
    adapters: ModelAdapter[],
    messages: ChatMessage[],
    options?: ChatOptions,
    strategy?: FallbackStrategy
  ): Promise<string>;

  /**
   * 执行带回退的流式聊天操作
   */
  executeChatStream(
    adapters: ModelAdapter[],
    messages: ChatMessage[],
    options?: ChatOptions,
    strategy?: FallbackStrategy
  ): AsyncIterable<string>;

  /**
   * 获取失败统计信息
   */
  getFailureStats(providerId: ModelProvider): FailureStats;

  /**
   * 获取所有提供商的失败统计信息
   */
  getAllFailureStats(): FailureStats[];

  /**
   * 重置失败统计信息
   */
  resetFailureStats(providerId?: ModelProvider): void;

  /**
   * 执行健康检查
   */
  performHealthCheck(adapters: ModelAdapter[]): Promise<Map<ModelProvider, boolean>>;

  /**
   * 清理资源
   */
  dispose(): void;
}