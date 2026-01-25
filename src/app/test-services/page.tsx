"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function TestServicesPage() {
    const [serviceStatus, setServiceStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkServices = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/services/init');
            const data = await response.json();

            if (data.success) {
                setServiceStatus(data.status);
            } else {
                setError(data.message || 'Failed to check services');
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
                setServiceStatus(data.status);
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
        checkServices();
    }, []);

    return (
        <div className="container mx-auto p-8 space-y-6">
            <h1 className="text-3xl font-bold">服务状态测试</h1>

            <div className="flex gap-4">
                <Button onClick={checkServices} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    检查服务状态
                </Button>
                <Button onClick={startServices} disabled={loading}>
                    启动服务
                </Button>
                <Link href="/admin/services">
                    <Button variant="outline">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        服务管理页面
                    </Button>
                </Link>
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

            {serviceStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>服务状态</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span>服务已启动:</span>
                                <Badge variant={serviceStatus.isStarted ? "default" : "destructive"}>
                                    {serviceStatus.isStarted ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                    {serviceStatus.isStarted ? "是" : "否"}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>服务已初始化:</span>
                                <Badge variant={serviceStatus.isInitialized ? "default" : "destructive"}>
                                    {serviceStatus.isInitialized ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                    {serviceStatus.isInitialized ? "是" : "否"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>任务调度器</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span>运行状态:</span>
                                <Badge variant={serviceStatus.taskScheduler?.isRunning ? "default" : "destructive"}>
                                    {serviceStatus.taskScheduler?.isRunning ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                    {serviceStatus.taskScheduler?.isRunning ? "运行中" : "已停止"}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>检查间隔:</span>
                                <span className="font-mono text-sm">
                                    {serviceStatus.taskScheduler?.checkInterval || 0}ms
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>活跃批次:</span>
                                <Badge variant="outline">
                                    {serviceStatus.activeBatches || 0}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>说明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">如果任务一直处于"等待中"状态：</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>确保上面显示的服务状态都是"是"或"运行中"</li>
                            <li>如果服务未启动，点击"启动服务"按钮</li>
                            <li>检查浏览器控制台和服务器日志是否有错误信息</li>
                            <li>任务调度器每5秒检查一次待处理任务</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">服务功能：</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li><strong>任务调度器</strong>: 自动检查数据库中的待处理任务并启动批量处理</li>
                            <li><strong>批量处理器</strong>: 将多张图片任务拆分为单独处理，支持并发控制</li>
                            <li><strong>模拟处理</strong>: 当前使用模拟的去雾处理（2-5秒延迟，90%成功率）</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}