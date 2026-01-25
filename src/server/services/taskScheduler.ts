import { db } from '../db/db';
import { dehazeTasks } from '../db/schema';
import { eq } from 'drizzle-orm';
import { batchTaskProcessor } from './batchTaskProcessor';

export class TaskScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 5000; // 每5秒检查一次

  constructor() {
    console.log('🕐 Task Scheduler initialized');
  }

  /**
   * 启动任务调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Task Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Task Scheduler...');

    // 立即执行一次检查
    this.checkPendingTasks();

    // 设置定期检查
    this.intervalId = setInterval(() => {
      this.checkPendingTasks();
    }, this.checkInterval);

    console.log(`✅ Task Scheduler started (checking every ${this.checkInterval}ms)`);
  }

  /**
   * 停止任务调度器
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Task Scheduler is not running');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('🛑 Task Scheduler stopped');
  }

  /**
   * 检查待处理的任务
   */
  private async checkPendingTasks(): Promise<void> {
    try {
      // 查找所有待处理的任务
      const pendingTasks = await db.query.dehazeTasks.findMany({
        where: eq(dehazeTasks.status, 'pending'),
        limit: 10, // 一次最多处理10个任务
        orderBy: (dehazeTasks, { asc }) => [asc(dehazeTasks.createdAt)], // 按创建时间排序
      });

      if (pendingTasks.length === 0) {
        return; // 没有待处理的任务
      }

      console.log(`📋 Found ${pendingTasks.length} pending tasks`);

      // 处理每个待处理的任务
      for (const task of pendingTasks) {
        try {
          await this.processTask(task);
        } catch (error) {
          console.error(`❌ Failed to process task ${task.id}:`, error);
          
          // 更新任务状态为失败
          await db
            .update(dehazeTasks)
            .set({
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              completedAt: new Date(),
            })
            .where(eq(dehazeTasks.id, task.id));
        }
      }
    } catch (error) {
      console.error('❌ Error checking pending tasks:', error);
    }
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: {
    id: string;
    name: string;
    inputImageIds: string[];
    modelId: string;
  }): Promise<void> {
    console.log(`🔄 Processing task: ${task.name} (${task.id})`);

    try {
      // 检查任务是否有输入图片
      if (!task.inputImageIds || task.inputImageIds.length === 0) {
        throw new Error('No input images found for task');
      }

      // 启动批量处理
      const batchId = await batchTaskProcessor.createBatchTask(
        task.id,
        task.inputImageIds,
        task.modelId
      );

      console.log(`✅ Started batch processing for task ${task.id} with batch ${batchId}`);

    } catch (error) {
      console.error(`❌ Failed to start batch processing for task ${task.id}:`, error);
      throw error;
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean; checkInterval: number } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
    };
  }
}

// 创建单例实例
export const taskScheduler = new TaskScheduler();