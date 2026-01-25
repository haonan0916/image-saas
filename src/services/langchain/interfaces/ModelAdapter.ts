// ModelAdapter 接口定义
import { 
  ChatMessage, 
  ChatOptions, 
  ModelInfo, 
  ModelConfig 
} from '../../../types/langchain';

/**
 * 模型适配器接口
 * 每个模型提供商都需要实现此接口
 */
export interface ModelAdapter {
  /**
   * 适配器唯一标识符
   */
  readonly providerId: string;
  
  /**
   * 适配器显示名称
   */
  readonly providerName: string;
  
  /**
   * 初始化适配器
   * @param config 模型配置
   * @returns Promise<void>
   */
  initialize(config: ModelConfig): Promise<void>;
  
  /**
   * 发送聊天请求
   * @param messages 消息历史
   * @param options 聊天选项
   * @returns Promise<string> AI 回复内容
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  
  /**
   * 流式聊天
   * @param messages 消息历史
   * @param options 聊天选项
   * @returns AsyncIterable<string> 流式响应内容
   */
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
  
  /**
   * 获取支持的模型列表
   * @returns Promise<ModelInfo[]> 模型信息列表
   */
  getSupportedModels(): Promise<ModelInfo[]>;
  
  /**
   * 检查适配器健康状态
   * @returns Promise<boolean> 是否健康
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * 检查指定模型是否可用
   * @param modelId 模型ID
   * @returns Promise<boolean> 是否可用
   */
  isModelAvailable(modelId: string): Promise<boolean>;
  
  /**
   * 获取当前使用的模型ID
   * @returns string 模型ID
   */
  getCurrentModel(): string;
  
  /**
   * 设置当前使用的模型
   * @param modelId 模型ID
   */
  setCurrentModel(modelId: string): void;
  
  /**
   * 获取适配器配置
   * @returns ModelConfig 配置信息
   */
  getConfig(): ModelConfig;
  
  /**
   * 更新适配器配置
   * @param config 新配置
   * @returns Promise<void>
   */
  updateConfig(config: Partial<ModelConfig>): Promise<void>;
  
  /**
   * 清理资源
   * @returns Promise<void>
   */
  dispose(): Promise<void>;
}