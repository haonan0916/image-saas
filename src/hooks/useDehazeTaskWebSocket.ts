"use client";

import { useCallback, useEffect, useState } from "react";
import { useWebSocket, WebSocketMessage } from "./useWebSocket";

export interface TaskProgress {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentImage: number;
  totalImages: number;
  processedImages: string[];
  errorMessage?: string;
  estimatedTimeRemaining?: number;
}

export interface BatchTaskProgress {
  batchId: string;
  tasks: TaskProgress[];
  overallProgress: number;
  completedTasks: number;
  totalTasks: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface DehazeTaskWebSocketOptions {
  userId: string;
  appId: string;
  onTaskProgress?: (progress: TaskProgress) => void;
  onBatchProgress?: (progress: BatchTaskProgress) => void;
  onTaskCompleted?: (taskId: string, outputImages: string[]) => void;
  onTaskFailed?: (taskId: string, error: string) => void;
  onBatchCompleted?: (batchId: string) => void;
  onBatchFailed?: (batchId: string, error: string) => void;
}

export function useDehazeTaskWebSocket(options: DehazeTaskWebSocketOptions) {
  const {
    userId,
    appId,
    onTaskProgress,
    onBatchProgress,
    onTaskCompleted,
    onTaskFailed,
    onBatchCompleted,
    onBatchFailed,
  } = options;

  const [taskProgresses, setTaskProgresses] = useState<Map<string, TaskProgress>>(new Map());
  const [batchProgresses, setBatchProgresses] = useState<Map<string, BatchTaskProgress>>(new Map());

  // WebSocket URL - 在实际项目中应该从环境变量获取
  const wsUrl = `${process.env.NODE_ENV === 'development' ? 'ws://localhost:3001' : 'wss://your-domain.com'}/ws/dehaze`;

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message);

    switch (message.type) {
      case 'task_progress':
        const taskProgress = message.data as TaskProgress;
        setTaskProgresses(prev => new Map(prev.set(taskProgress.taskId, taskProgress)));
        onTaskProgress?.(taskProgress);
        break;

      case 'batch_progress':
        const batchProgress = message.data as BatchTaskProgress;
        setBatchProgresses(prev => new Map(prev.set(batchProgress.batchId, batchProgress)));
        onBatchProgress?.(batchProgress);
        break;

      case 'task_completed':
        const { taskId, outputImages } = message.data;
        setTaskProgresses(prev => {
          const updated = new Map(prev);
          const task = updated.get(taskId);
          if (task) {
            updated.set(taskId, {
              ...task,
              status: 'completed',
              progress: 100,
              processedImages: outputImages,
            });
          }
          return updated;
        });
        onTaskCompleted?.(taskId, outputImages);
        break;

      case 'task_failed':
        const { taskId: failedTaskId, error } = message.data;
        setTaskProgresses(prev => {
          const updated = new Map(prev);
          const task = updated.get(failedTaskId);
          if (task) {
            updated.set(failedTaskId, {
              ...task,
              status: 'failed',
              errorMessage: error,
            });
          }
          return updated;
        });
        onTaskFailed?.(failedTaskId, error);
        break;

      case 'batch_completed':
        const { batchId } = message.data;
        setBatchProgresses(prev => {
          const updated = new Map(prev);
          const batch = updated.get(batchId);
          if (batch) {
            updated.set(batchId, {
              ...batch,
              status: 'completed',
              overallProgress: 100,
            });
          }
          return updated;
        });
        onBatchCompleted?.(batchId);
        break;

      case 'batch_failed':
        const { batchId: failedBatchId, error: batchError } = message.data;
        setBatchProgresses(prev => {
          const updated = new Map(prev);
          const batch = updated.get(failedBatchId);
          if (batch) {
            updated.set(failedBatchId, {
              ...batch,
              status: 'failed',
            });
          }
          return updated;
        });
        onBatchFailed?.(failedBatchId, batchError);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, [onTaskProgress, onBatchProgress, onTaskCompleted, onTaskFailed, onBatchCompleted, onBatchFailed]);

  const handleError = useCallback((error: Event) => {
    console.error('Dehaze WebSocket error:', error);
  }, []);

  const handleClose = useCallback((event: CloseEvent) => {
    console.log('Dehaze WebSocket closed:', event.code, event.reason);
  }, []);

  const handleReconnect = useCallback((attempt: number) => {
    console.log(`Dehaze WebSocket reconnecting... Attempt ${attempt}`);
  }, []);

  const {
    sendMessage,
    isConnected,
    isConnecting,
    isReconnecting,
    reconnectAttempts,
    disconnect,
    reconnect,
  } = useWebSocket({
    url: wsUrl,
    onOpen: () => {
      console.log('Dehaze WebSocket connected');
    },
    onMessage: handleMessage,
    onError: handleError,
    onClose: handleClose,
    onReconnect: handleReconnect,
    reconnectInterval: 1000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  });

  // Send auth message when connected
  useEffect(() => {
    if (isConnected && sendMessage) {
      sendMessage({
        type: 'auth',
        data: { userId, appId },
      });
    }
  }, [isConnected, sendMessage, userId, appId]);

  // 订阅任务进度
  const subscribeToTask = useCallback((taskId: string) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_task',
        data: { taskId },
      });
    }
  }, [isConnected, sendMessage]);

  // 取消订阅任务进度
  const unsubscribeFromTask = useCallback((taskId: string) => {
    if (isConnected) {
      sendMessage({
        type: 'unsubscribe_task',
        data: { taskId },
      });
    }
    // 清理本地状态
    setTaskProgresses(prev => {
      const updated = new Map(prev);
      updated.delete(taskId);
      return updated;
    });
  }, [isConnected, sendMessage]);

  // 订阅批次进度
  const subscribeToBatch = useCallback((batchId: string) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_batch',
        data: { batchId },
      });
    }
  }, [isConnected, sendMessage]);

  // 取消订阅批次进度
  const unsubscribeFromBatch = useCallback((batchId: string) => {
    if (isConnected) {
      sendMessage({
        type: 'unsubscribe_batch',
        data: { batchId },
      });
    }
    // 清理本地状态
    setBatchProgresses(prev => {
      const updated = new Map(prev);
      updated.delete(batchId);
      return updated;
    });
  }, [isConnected, sendMessage]);

  // 获取任务进度
  const getTaskProgress = useCallback((taskId: string): TaskProgress | undefined => {
    return taskProgresses.get(taskId);
  }, [taskProgresses]);

  // 获取批次进度
  const getBatchProgress = useCallback((batchId: string): BatchTaskProgress | undefined => {
    return batchProgresses.get(batchId);
  }, [batchProgresses]);

  // 清理所有进度数据
  const clearAllProgress = useCallback(() => {
    setTaskProgresses(new Map());
    setBatchProgresses(new Map());
  }, []);

  return {
    // WebSocket 状态
    isConnected,
    isConnecting,
    isReconnecting,
    reconnectAttempts,
    
    // 连接控制
    disconnect,
    reconnect,
    
    // 订阅管理
    subscribeToTask,
    unsubscribeFromTask,
    subscribeToBatch,
    unsubscribeFromBatch,
    
    // 进度数据
    taskProgresses: Array.from(taskProgresses.values()),
    batchProgresses: Array.from(batchProgresses.values()),
    getTaskProgress,
    getBatchProgress,
    clearAllProgress,
    
    // 原始发送消息方法
    sendMessage,
  };
}