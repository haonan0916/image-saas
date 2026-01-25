// ChatManager 接口定义
import { 
  ChatRequest, 
  ChatResponse, 
  ChatStreamChunk, 
  ModelInfo, 
  ModelHealthStatus 
} from '../../../types/langchain';

/**
 * 统一聊天管理器接口
 * 提供跨所有模型提供商的统一聊天功能
 */
export interface ChatManager {
  /**
   * 发送消息并获取完整响应
   * @param request 聊天请求
   * @returns Promise<ChatResponse> 聊天响应
   */
  sendMessage(request: ChatRequest): Promise<ChatResponse>;
  
  /**
   * 发送消息并获取流式响应
   * @param request 聊天请求
   * @returns AsyncIterable<ChatStreamChunk> 流式响应块
   */
  sendMessageStream(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
  
  /**
   * 获取所有可用模型列表
   * @returns Promise<ModelInfo[]> 模型信息列表
   */
  getAvailableModels(): Promise<ModelInfo[]>;
  
  /**
   * 检查指定模型是否可用
   * @param modelId 模型ID
   * @returns Promise<boolean> 是否可用
   */
  isModelAvailable(modelId: string): Promise<boolean>;
  
  /**
   * 设置默认模型
   * @param modelId 模型ID
   */
  setDefaultModel(modelId: string): void;
  
  /**
   * 获取当前默认模型
   * @returns string 默认模型ID
   */
  getDefaultModel(): string;
  
  /**
   * 获取所有模型的健康状态
   * @returns Promise<ModelHealthStatus[]> 健康状态列表
   */
  getModelHealth(): Promise<ModelHealthStatus[]>;
  
  /**
   * 刷新模型列表和状态
   * @returns Promise<void>
   */
  refreshModels(): Promise<void>;
  
  /**
   * 清理资源
   * @returns Promise<void>
   */
  dispose(): Promise<void>;
}