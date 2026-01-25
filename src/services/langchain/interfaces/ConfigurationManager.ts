// ConfigurationManager 接口定义
import { 
  ChatServiceConfig, 
  ModelConfig, 
  ValidationResult 
} from '../../../types/langchain';

/**
 * 配置管理器接口
 * 负责管理整个聊天服务的配置
 */
export interface ConfigurationManager {
  /**
   * 加载配置
   * @returns Promise<ChatServiceConfig> 聊天服务配置
   */
  loadConfig(): Promise<ChatServiceConfig>;
  
  /**
   * 获取指定提供商的模型配置
   * @param providerId 提供商ID
   * @returns ModelConfig | null 模型配置或null
   */
  getModelConfig(providerId: string): ModelConfig | null;
  
  /**
   * 更新配置
   * @param config 部分配置更新
   */
  updateConfig(config: Partial<ChatServiceConfig>): void;
  
  /**
   * 验证配置
   * @param config 要验证的配置
   * @returns ValidationResult 验证结果
   */
  validateConfig(config: ChatServiceConfig): ValidationResult;
  
  /**
   * 监听配置变化
   * @param callback 配置变化回调函数
   */
  onConfigChange(callback: (config: ChatServiceConfig) => void): void;
  
  /**
   * 移除配置变化监听器
   * @param callback 要移除的回调函数
   */
  offConfigChange(callback: (config: ChatServiceConfig) => void): void;
  
  /**
   * 获取当前完整配置
   * @returns ChatServiceConfig 当前配置
   */
  getCurrentConfig(): ChatServiceConfig;
  
  /**
   * 重新加载配置
   * @returns Promise<void>
   */
  reloadConfig(): Promise<void>;
  
  /**
   * 保存配置到持久化存储
   * @param config 要保存的配置
   * @returns Promise<void>
   */
  saveConfig(config: ChatServiceConfig): Promise<void>;
}