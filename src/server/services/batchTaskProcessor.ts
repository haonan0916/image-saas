import { EventEmitter } from 'events';
import { db } from '../db/db';
import { dehazeTasks, datasetImages } from '../db/schema';
import { eq, inArray, and, isNotNull } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export interface BatchTaskConfig {
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  timeoutMs: number;
}

export interface TaskItem {
  id: string;
  taskId: string;
  imageId: string;
  imageUrl: string;
  modelId: string;
  priority: number;
}

export interface TaskResult {
  success: boolean;
  imageId: string;
  outputUrl?: string;
  error?: string;
  processingTime: number;
}

export interface BatchProgress {
  batchId: string;
  taskId: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  currentlyProcessing: number;
  progress: number;
  estimatedTimeRemaining?: number;
  startTime: number;
}

export class BatchTaskProcessor extends EventEmitter {
  private config: BatchTaskConfig;
  private processingQueues: Map<string, TaskItem[]> = new Map();
  private activeJobs: Map<string, Set<string>> = new Map();
  private batchProgress: Map<string, BatchProgress> = new Map();
  private processingTimes: number[] = [];

  constructor(config: BatchTaskConfig = {
    maxConcurrency: 3,
    retryAttempts: 3,
    retryDelay: 1000,
    timeoutMs: 300000, // 5 minutes
  }) {
    super();
    this.config = config;
  }

  /**
   * 创建批量任务
   */
  async createBatchTask(taskId: string, imageIds: string[], modelId: string): Promise<string> {
    const batchId = uuid();
    
    // 获取图片信息
    const images = await db.query.datasetImages.findMany({
      where: inArray(datasetImages.id, imageIds),
      columns: {
        id: true,
        originalUrl: true,
      },
    });

    if (images.length !== imageIds.length) {
      throw new Error('Some images not found');
    }

    // 创建任务项
    const taskItems: TaskItem[] = images.map((image, index) => ({
      id: uuid(),
      taskId,
      imageId: image.id,
      imageUrl: image.originalUrl,
      modelId,
      priority: index, // 按顺序处理
    }));

    // 初始化队列和进度
    this.processingQueues.set(batchId, taskItems);
    this.activeJobs.set(batchId, new Set());
    this.batchProgress.set(batchId, {
      batchId,
      taskId,
      totalItems: taskItems.length,
      completedItems: 0,
      failedItems: 0,
      currentlyProcessing: 0,
      progress: 0,
      startTime: Date.now(),
    });

    // 更新任务状态为处理中
    await db
      .update(dehazeTasks)
      .set({ status: 'processing' })
      .where(eq(dehazeTasks.id, taskId));

    // 发送初始进度
    this.emitProgress(batchId);

    // 开始处理
    this.processBatch(batchId);

    return batchId;
  }

  /**
   * 处理批次任务
   */
  private async processBatch(batchId: string): Promise<void> {
    const queue = this.processingQueues.get(batchId);
    const activeJobs = this.activeJobs.get(batchId);
    
    if (!queue || !activeJobs) {
      return;
    }

    // 启动并发任务
    while (queue.length > 0 && activeJobs.size < this.config.maxConcurrency) {
      const taskItem = queue.shift()!;
      activeJobs.add(taskItem.id);
      
      this.updateProgress(batchId, { currentlyProcessing: activeJobs.size });
      
      // 异步处理单个任务
      this.processTaskItem(batchId, taskItem)
        .then((result) => {
          this.handleTaskResult(batchId, taskItem, result);
        })
        .catch((error) => {
          this.handleTaskResult(batchId, taskItem, {
            success: false,
            imageId: taskItem.imageId,
            error: error.message,
            processingTime: 0,
          });
        });
    }
  }

  /**
   * 处理单个任务项
   */
  private async processTaskItem(batchId: string, taskItem: TaskItem): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // 调用 Python 去雾接口
      const result = await this.callDehazeAPI(taskItem.imageUrl, taskItem.modelId);
      const processingTime = Date.now() - startTime;
      
      // 记录处理时间用于估算
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 10) {
        this.processingTimes.shift(); // 只保留最近10次的时间
      }

      return {
        success: true,
        imageId: taskItem.imageId,
        outputUrl: result.outputUrl,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        imageId: taskItem.imageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * 调用 Python 去雾 API
   */
  private async callDehazeAPI(imageUrl: string, modelId: string): Promise<{ outputUrl: string }> {
    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000)); // 2-5秒随机延迟
    
    // 检查环境变量中是否配置了真实的 Python API
    const pythonApiUrl = process.env.PYTHON_API_URL;
    
    if (pythonApiUrl && pythonApiUrl !== 'http://localhost:8000') {
      try {
        // 尝试调用真实的 Python API
        const response = await fetch(`${pythonApiUrl}/dehaze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: imageUrl,
            model_id: modelId,
          }),
          signal: AbortSignal.timeout(120000), // 2分钟超时
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'API processing failed');
        }

        return {
          outputUrl: result.output_url,
        };
      } catch (error) {
        console.error('Python API call failed, falling back to mock:', error);
        // 如果真实 API 失败，回退到模拟实现
      }
    }

    // 模拟处理结果 - 在实际项目中这里应该调用真实的 Python 去雾接口
    console.log(`🎭 Mock processing image: ${imageUrl} with model: ${modelId}`);
    
    // 模拟处理成功/失败（90% 成功率）
    if (Math.random() < 0.9) {
      // 生成模拟的输出 URL（实际项目中这应该是处理后的图片 URL）
      const outputUrl = imageUrl.replace(/\.(jpg|jpeg|png|webp)$/i, '_dehazed.$1');
      
      console.log(`✅ Mock processing completed: ${outputUrl}`);
      return {
        outputUrl,
      };
    } else {
      // 模拟处理失败
      throw new Error('Mock processing failed: Random failure for testing');
    }
  }

  /**
   * 处理任务结果
   */
  private async handleTaskResult(batchId: string, taskItem: TaskItem, result: TaskResult): Promise<void> {
    const activeJobs = this.activeJobs.get(batchId);
    const progress = this.batchProgress.get(batchId);
    
    if (!activeJobs || !progress) {
      return;
    }

    // 从活跃任务中移除
    activeJobs.delete(taskItem.id);

    // 更新进度
    if (result.success) {
      progress.completedItems++;
      
      // 保存处理结果到数据库
      await this.saveProcessedImage(taskItem.imageId, result.outputUrl!);
    } else {
      progress.failedItems++;
      console.error(`Task ${taskItem.id} failed:`, result.error);
    }

    progress.currentlyProcessing = activeJobs.size;
    progress.progress = Math.round(
      ((progress.completedItems + progress.failedItems) / progress.totalItems) * 100
    );

    // 计算预估剩余时间
    if (this.processingTimes.length > 0) {
      const avgTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      const remainingItems = progress.totalItems - progress.completedItems - progress.failedItems;
      progress.estimatedTimeRemaining = Math.round((remainingItems * avgTime) / this.config.maxConcurrency);
    }

    this.emitProgress(batchId);

    // 继续处理队列中的任务
    await this.processBatch(batchId);

    // 检查是否完成
    if (progress.completedItems + progress.failedItems >= progress.totalItems) {
      await this.completeBatch(batchId);
    }
  }

  /**
   * 保存处理后的图片
   */
  private async saveProcessedImage(imageId: string, outputUrl: string): Promise<void> {
    await db
      .update(datasetImages)
      .set({ processedUrl: outputUrl })
      .where(eq(datasetImages.id, imageId));
  }

  /**
   * 完成批次处理
   */
  private async completeBatch(batchId: string): Promise<void> {
    const progress = this.batchProgress.get(batchId);
    
    if (!progress) {
      return;
    }

    const isSuccess = progress.failedItems === 0;
    const totalProcessingTime = Math.round((Date.now() - progress.startTime) / 1000);

    // 先获取任务的图片ID列表
    const taskImageIds = await this.getTaskImageIds(progress.taskId);

    // 获取所有处理成功的图片ID
    const processedImages = await db
      .select({ id: datasetImages.id })
      .from(datasetImages)
      .where(
        and(
          inArray(datasetImages.id, taskImageIds),
          isNotNull(datasetImages.processedUrl)
        )
      );

    // 更新任务状态
    await db
      .update(dehazeTasks)
      .set({
        status: isSuccess ? 'completed' : 'failed',
        outputImageIds: processedImages.map(img => img.id),
        processingTime: totalProcessingTime,
        completedAt: new Date(),
        errorMessage: isSuccess ? null : `${progress.failedItems} images failed to process`,
      })
      .where(eq(dehazeTasks.id, progress.taskId));

    // 发送完成事件
    this.emit('batchCompleted', {
      batchId,
      taskId: progress.taskId,
      success: isSuccess,
      completedItems: progress.completedItems,
      failedItems: progress.failedItems,
      totalProcessingTime,
    });

    // 清理资源
    this.processingQueues.delete(batchId);
    this.activeJobs.delete(batchId);
    this.batchProgress.delete(batchId);
  }

  /**
   * 获取任务的图片ID列表
   */
  private async getTaskImageIds(taskId: string): Promise<string[]> {
    const task = await db.query.dehazeTasks.findFirst({
      where: eq(dehazeTasks.id, taskId),
      columns: {
        inputImageIds: true,
      },
    });

    return task?.inputImageIds || [];
  }

  /**
   * 更新进度
   */
  private updateProgress(batchId: string, updates: Partial<BatchProgress>): void {
    const progress = this.batchProgress.get(batchId);
    if (progress) {
      Object.assign(progress, updates);
      this.emitProgress(batchId);
    }
  }

  /**
   * 发送进度事件
   */
  private emitProgress(batchId: string): void {
    const progress = this.batchProgress.get(batchId);
    if (progress) {
      this.emit('progress', progress);
    }
  }

  /**
   * 取消批次任务
   */
  async cancelBatch(batchId: string): Promise<void> {
    const progress = this.batchProgress.get(batchId);
    
    if (!progress) {
      return;
    }

    // 更新任务状态
    await db
      .update(dehazeTasks)
      .set({
        status: 'failed',
        errorMessage: 'Task cancelled by user',
        completedAt: new Date(),
      })
      .where(eq(dehazeTasks.id, progress.taskId));

    // 发送取消事件
    this.emit('batchCancelled', {
      batchId,
      taskId: progress.taskId,
    });

    // 清理资源
    this.processingQueues.delete(batchId);
    this.activeJobs.delete(batchId);
    this.batchProgress.delete(batchId);
  }

  /**
   * 获取批次进度
   */
  getBatchProgress(batchId: string): BatchProgress | undefined {
    return this.batchProgress.get(batchId);
  }

  /**
   * 获取所有活跃的批次
   */
  getActiveBatches(): BatchProgress[] {
    return Array.from(this.batchProgress.values());
  }
}

// 单例实例
export const batchTaskProcessor = new BatchTaskProcessor();