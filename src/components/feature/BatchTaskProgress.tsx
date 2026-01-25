"use client";

import { useEffect, useState } from "react";
import { useDehazeTaskWebSocket, BatchTaskProgress as BatchProgress } from "@/hooks/useDehazeTaskWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface BatchTaskProgressProps {
  userId: string;
  appId: string;
  taskId: string;
  onTaskCompleted?: (taskId: string) => void;
  onTaskFailed?: (taskId: string, error: string) => void;
}

export function BatchTaskProgress({
  userId,
  appId,
  taskId,
  onTaskCompleted,
  onTaskFailed,
}: BatchTaskProgressProps) {
  const [currentBatch, setCurrentBatch] = useState<BatchProgress | null>(null);
  const [processingStats, setProcessingStats] = useState({
    avgProcessingTime: 0,
    totalProcessingTime: 0,
    imagesPerMinute: 0,
  });

  const {
    isConnected,
    isConnecting,
    isReconnecting,
    reconnectAttempts,
    subscribeToBatch,
    unsubscribeFromBatch,
    getBatchProgress,
    reconnect,
  } = useDehazeTaskWebSocket({
    userId,
    appId,
    onBatchProgress: (progress) => {
      setCurrentBatch(progress);
      updateProcessingStats(progress);
    },
    onBatchCompleted: (batchId) => {
      toast.success("批量任务处理完成！");
      onTaskCompleted?.(taskId);
    },
    onBatchFailed: (batchId, error) => {
      toast.error(`批量任务处理失败: ${error}`);
      onTaskFailed?.(taskId, error);
    },
  });

  const updateProcessingStats = (progress: BatchProgress) => {
    if (progress.completedTasks > 0) {
      const elapsedTime = Date.now() - progress.tasks[0]?.currentImage || 0;
      const avgTime = elapsedTime / progress.completedTasks;
      const imagesPerMinute = progress.completedTasks / (elapsedTime / 60000);
      
      setProcessingStats({
        avgProcessingTime: Math.round(avgTime / 1000),
        totalProcessingTime: Math.round(elapsedTime / 1000),
        imagesPerMinute: Math.round(imagesPerMinute * 10) / 10,
      });
    }
  };

  // 订阅批次进度（这里需要从任务ID获取批次ID，实际项目中可能需要额外的API）
  useEffect(() => {
    if (isConnected && taskId) {
      // 假设批次ID与任务ID相关，实际项目中需要通过API获取
      const batchId = `batch_${taskId}`;
      subscribeToBatch(batchId);
      
      return () => {
        unsubscribeFromBatch(batchId);
      };
    }
  }, [isConnected, taskId, subscribeToBatch, unsubscribeFromBatch]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-gray-500" />;
      case "processing":
        return <Play className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "processing":
        return "default";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      pending: "等待中",
      processing: "处理中",
      completed: "已完成",
      failed: "失败",
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  if (!isConnected && !isConnecting) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800">WebSocket 连接断开</span>
            </div>
            <Button variant="outline" size="sm" onClick={reconnect}>
              重新连接
            </Button>
          </div>
          {reconnectAttempts > 0 && (
            <p className="text-sm text-yellow-700 mt-2">
              重连尝试: {reconnectAttempts} 次
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isConnecting || isReconnecting) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-muted-foreground">
              {isReconnecting ? "重新连接中..." : "连接中..."}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentBatch) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">等待任务开始...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 主要进度卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              批量去雾处理
            </CardTitle>
            <Badge variant={getStatusColor(currentBatch.status) as "default" | "secondary" | "destructive"} className="flex items-center gap-1">
              {getStatusIcon(currentBatch.status)}
              {getStatusLabel(currentBatch.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 总体进度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>总体进度</span>
              <span>{currentBatch.overallProgress}%</span>
            </div>
            <Progress value={currentBatch.overallProgress} className="h-2" />
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentBatch.completedTasks}
              </div>
              <div className="text-muted-foreground">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentBatch.totalTasks - currentBatch.completedTasks}
              </div>
              <div className="text-muted-foreground">待处理</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {processingStats.imagesPerMinute}
              </div>
              <div className="text-muted-foreground">图片/分钟</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(processingStats.avgProcessingTime)}
              </div>
              <div className="text-muted-foreground">平均耗时</div>
            </div>
          </div>

          {/* 预估剩余时间 */}
          {currentBatch.status === "processing" && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  预估剩余时间: {formatTime(Math.round((processingStats.avgProcessingTime * (currentBatch.totalTasks - currentBatch.completedTasks)) / 60))}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详细任务进度 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            任务详情 ({currentBatch.tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {currentBatch.tasks.map((task, index) => (
              <div key={task.taskId} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                <div className="flex-shrink-0">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate">
                      图片 {task.currentImage}/{task.totalImages}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {task.progress}%
                    </span>
                  </div>
                  <Progress value={task.progress} className="h-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}