import { Locale } from "@/dictionaries";
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/useLocale";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Play, 
  Settings,
  Activity,
  Clock
} from "lucide-react";

interface ServiceStatus {
  success: boolean;
  message: string;
  status: {
    isStarted: boolean;
    isInitialized: boolean;
    taskScheduler: {
      isRunning: boolean;
      checkInterval: number;
    };
    activeBatches: number;
  };
}

export default function ServicesPage() {
  const { dict } = useLocale();
const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/services/init');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      } else {
        setError(data.message || 'Failed to fetch status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const startServices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/services/init', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      } else {
        setError(data.message || 'Failed to start services');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // 每30秒自动刷新状态
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (isRunning: boolean) => {
    return (
      <Badge variant={isRunning ? "default" : "destructive"} className="flex items-center gap-1">
        {isRunning ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {isRunning ? "运行中" : "已停止"}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">服务管理</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchStatus} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新状态
          </Button>
          <Button 
            onClick={startServices} 
            disabled={loading || status?.status.isStarted}
          >
            <Play className="h-4 w-4 mr-2" />
            启动服务
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 总体状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                总体状态
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>服务状态:</span>
                {getStatusBadge(status.status.isStarted)}
              </div>
              <div className="flex justify-between items-center">
                <span>初始化状态:</span>
                {getStatusBadge(status.status.isInitialized)}
              </div>
              <div className="text-sm text-muted-foreground">
                {status.message}
              </div>
            </CardContent>
          </Card>

          {/* 任务调度器 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                任务调度器
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>运行状态:</span>
                {getStatusBadge(status.status.taskScheduler.isRunning)}
              </div>
              <div className="flex justify-between items-center">
                <span>检查间隔:</span>
                <span className="font-mono text-sm">
                  {status.status.taskScheduler.checkInterval}ms
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                自动检查待处理任务并启动批量处理
              </div>
            </CardContent>
          </Card>

          {/* 批量处理器 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                批量处理器
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>活跃批次:</span>
                <Badge variant="outline">
                  {status.status.activeBatches}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                当前正在处理的批量任务数量
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">服务功能:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>任务调度器</strong>: 每5秒检查数据库中的待处理任务，自动启动批量处理</li>
              <li><strong>批量处理器</strong>: 将多张图片的去雾任务拆分为单独处理，支持并发控制</li>
              <li><strong>进度监控</strong>: 实时跟踪任务处理进度和状态更新</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">故障排除:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>如果任务一直处于dict.tasks.status.pending状态，请确保任务调度器正在运行</li>
              <li>检查控制台日志查看详细的处理信息</li>
              <li>如果服务未启动，点击dict.services.startServices按钮手动启动</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}