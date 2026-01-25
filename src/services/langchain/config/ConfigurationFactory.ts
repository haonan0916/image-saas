// 配置工厂类
import { LangChainConfigurationManager } from './LangChainConfigurationManager';
import { ConfigurationManager } from '../interfaces';

/**
 * 配置工厂类
 * 管理配置管理器的单例实例
 */
export class ConfigurationFactory {
  private static instance: ConfigurationManager | null = null;
  private static isInitializing: boolean = false;

  /**
   * 获取配置管理器单例实例
   */
  static async getInstance(): Promise<ConfigurationManager> {
    if (this.instance) {
      return this.instance;
    }

    if (this.isInitializing) {
      // 如果正在初始化，等待初始化完成
      return new Promise((resolve) => {
        const checkInstance = () => {
          if (this.instance) {
            resolve(this.instance);
          } else {
            setTimeout(checkInstance, 10);
          }
        };
        checkInstance();
      });
    }

    this.isInitializing = true;

    try {
      const manager = new LangChainConfigurationManager();
      await manager.loadConfig();
      
      this.instance = manager;
      this.isInitializing = false;
      
      return this.instance;
    } catch (error) {
      this.isInitializing = false;
      throw error;
    }
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static reset(): void {
    if (this.instance && typeof (this.instance as any).dispose === 'function') {
      (this.instance as any).dispose();
    }
    this.instance = null;
    this.isInitializing = false;
  }

  /**
   * 创建新的配置管理器实例（不使用单例）
   */
  static async createInstance(): Promise<ConfigurationManager> {
    const manager = new LangChainConfigurationManager();
    await manager.loadConfig();
    return manager;
  }
}