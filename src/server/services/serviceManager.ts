import { taskScheduler } from './taskScheduler';
import { batchTaskProcessor } from './batchTaskProcessor';

export class ServiceManager {
  private static instance: ServiceManager;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * 初始化所有服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Services already initialized');
      return;
    }

    console.log('🚀 Initializing services...');

    try {
      // 设置批量处理器事件监听
      this.setupBatchProcessorEvents();

      // 启动任务调度器
      taskScheduler.start();

      this.isInitialized = true;
      console.log('✅ All services initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * 关闭所有服务
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ Services not initialized');
      return;
    }

    console.log('🛑 Shutting down services...');

    try {
      // 停止任务调度器
      taskScheduler.stop();

      this.isInitialized = false;
      console.log('✅ All services shut down successfully');

    } catch (error) {
      console.error('❌ Error during service shutdown:', error);
      throw error;
    }
  }

  /**
   * 设置批量处理器事件监听
   */
  private setupBatchProcessorEvents(): void {
    // 监听批量处理进度
    batchTaskProcessor.on('progress', (progress) => {
      console.log(`📊 Batch progress: ${progress.batchId} - ${progress.progress}%`);
    });

    // 监听批量处理完成
    batchTaskProcessor.on('batchCompleted', (data) => {
      console.log(`✅ Batch completed: ${data.batchId} for task ${data.taskId}`);
    });

    // 监听批量处理取消
    batchTaskProcessor.on('batchCancelled', (data) => {
      console.log(`🚫 Batch cancelled: ${data.batchId} for task ${data.taskId}`);
    });

    console.log('📡 Batch processor event listeners set up');
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    isInitialized: boolean;
    taskScheduler: { isRunning: boolean; checkInterval: number };
    activeBatches: number;
  } {
    return {
      isInitialized: this.isInitialized,
      taskScheduler: taskScheduler.getStatus(),
      activeBatches: batchTaskProcessor.getActiveBatches().length,
    };
  }
}

// 导出单例实例
export const serviceManager = ServiceManager.getInstance();