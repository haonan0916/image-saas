"use client";

import { useState } from "react";
import { trpcClientReact } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DehazeDetailDialog } from "./DehazeDetailDialog";
import { BatchTaskProgress } from "./BatchTaskProgress";
import { useLocale } from "@/hooks/useLocale";
import {
    ArrowLeft,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Image as ImageIcon,
    Download,
    Eye,
    Zap
} from "lucide-react";

interface TaskDetailProps {
    taskId: string;
    onBack: () => void;
}

export function TaskDetail({ taskId, onBack }: TaskDetailProps) {
  const { dict } = useLocale();
    const [showDehazeDetail, setShowDehazeDetail] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    // 获取任务详情
    const { data: task, isLoading, refetch } = trpcClientReact.dehazeTasks.getDehazeTask.useQuery(taskId);

    const handleTaskCompleted = (completedTaskId: string) => {
        if (completedTaskId === taskId) {
            refetch();
        }
    };

    const handleTaskFailed = (failedTaskId: string, error: string) => {
        if (failedTaskId === taskId) {
            refetch();
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending":
                return <Clock className="h-5 w-5" />;
            case "processing":
                return <AlertCircle className="h-5 w-5" />;
            case "completed":
                return <CheckCircle className="h-5 w-5" />;
            case "failed":
                return <XCircle className="h-5 w-5" />;
            default:
                return <AlertCircle className="h-5 w-5" />;
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
            pending: dict.tasks.status.pending,
            processing: dict.tasks.status.processing,
            completed: dict.tasks.status.completed,
            failed: dict.tasks.status.failed,
        };
        return statusMap[status as keyof typeof statusMap] || status;
    };

    const formatProcessingTime = (seconds: number | null) => {
        if (!seconds) return dict.tasks.unknown;
        if (seconds < 60) return `${seconds}秒`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds}秒`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">加载中...</div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">任务不存在</p>
                <Button onClick={onBack} className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 头部信息 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        返回
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-semibold">{task.name}</h2>
                            <Badge variant={getStatusColor(task.status) as "default" | "secondary" | "destructive"} className="flex items-center gap-1">
                                {getStatusIcon(task.status)}
                                {getStatusLabel(task.status)}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            数据集: {task.dataset?.name} | 模型: {task.model?.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* 批量任务进度 */}
            {task.status === "processing" && (
                <BatchTaskProgress
                    userId={task.userId}
                    appId={task.appId}
                    taskId={task.id}
                    onTaskCompleted={handleTaskCompleted}
                    onTaskFailed={handleTaskFailed}
                />
            )}

            {/* 任务信息卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle>任务信息</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">输入图片</p>
                            <p className="text-2xl font-bold">{task.inputImages?.length || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">输出图片</p>
                            <p className="text-2xl font-bold">{task.outputImages?.length || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">处理时间</p>
                            <p className="text-lg font-bold">{formatProcessingTime(task.processingTime)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">创建时间</p>
                            <p className="text-sm font-medium">
                                {task.createdAt ? new Date(task.createdAt).toLocaleString() : dict.tasks.unknown}
                            </p>
                        </div>
                    </div>

                    {/* 进度条 */}
                    {task.status === "processing" && (
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>处理进度</span>
                                <span>处理中...</span>
                            </div>
                            <Progress value={50} className="h-2" />
                        </div>
                    )}

                    {/* 错误信息 */}
                    {task.status === "failed" && task.errorMessage && (
                        <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                            <h4 className="font-medium text-destructive mb-2">错误信息</h4>
                            <p className="text-sm text-destructive">{task.errorMessage}</p>
                        </div>
                    )}

                    {/* 完成信息 */}
                    {task.status === "completed" && task.completedAt && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-green-700 mb-2">任务完成</h4>
                                    <p className="text-sm text-green-700">
                                        完成时间: {new Date(task.completedAt).toLocaleString()}
                                    </p>
                                </div>
                                {task.outputImages && task.outputImages.length > 0 && (
                                    <Button
                                        onClick={() => setShowDehazeDetail(true)}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Zap className="h-4 w-4 mr-2" />
                                        查看去雾对比
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 输入图片 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        输入图片 ({task.inputImages?.length || 0})
                    </CardTitle>
                    <CardDescription>用于处理的原始图片</CardDescription>
                </CardHeader>
                <CardContent>
                    {task.inputImages && task.inputImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {task.inputImages.map((image) => (
                                <div key={image.id} className="aspect-square relative group border rounded-lg overflow-hidden">
                                    <img
                                        src={image.originalUrl}
                                        alt={image.name || "Input image"}
                                        className="w-full h-full object-cover"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            if (process.env.NODE_ENV === 'development') {
                                                console.error('Failed to load input image:', image.originalUrl);
                                            }
                                            const img = e.target as HTMLImageElement;

                                            // 如果还没有尝试过不带crossOrigin的加载，则重试
                                            if (img.crossOrigin) {
                                                if (process.env.NODE_ENV === 'development') {
                                                    console.log('Retrying input image without crossOrigin...');
                                                }
                                                img.crossOrigin = '';
                                                img.src = image.originalUrl;
                                            } else {
                                                // 最终回退到占位符
                                                img.src = "/placeholder-image.svg";
                                            }
                                        }}
                                        onLoad={() => {
                                            if (process.env.NODE_ENV === 'development') {
                                                console.log('Successfully loaded input image:', image.originalUrl);
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => window.open(image.originalUrl, '_blank')}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => window.open(image.originalUrl, '_blank')}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">暂无输入图片</p>
                    )}
                </CardContent>
            </Card>

            {/* 输出图片 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        输出图片 ({task.outputImages?.length || 0})
                    </CardTitle>
                    <CardDescription>处理后的去雾图片</CardDescription>
                </CardHeader>
                <CardContent>
                    {task.outputImages && task.outputImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {task.outputImages.map((image, index) => (
                                <div key={image.id} className="aspect-square relative group border rounded-lg overflow-hidden">
                                    <img
                                        src={image.processedUrl || image.originalUrl}
                                        alt={image.name || "Output image"}
                                        className="w-full h-full object-cover cursor-pointer"
                                        crossOrigin="anonymous"
                                        onClick={() => {
                                            setSelectedImageIndex(index);
                                            setShowDehazeDetail(true);
                                        }}
                                        onError={(e) => {
                                            if (process.env.NODE_ENV === 'development') {
                                                console.error('Failed to load output image:', image.processedUrl || image.originalUrl);
                                            }
                                            const img = e.target as HTMLImageElement;

                                            // 如果还没有尝试过不带crossOrigin的加载，则重试
                                            if (img.crossOrigin) {
                                                if (process.env.NODE_ENV === 'development') {
                                                    console.log('Retrying output image without crossOrigin...');
                                                }
                                                img.crossOrigin = '';
                                                img.src = image.processedUrl || image.originalUrl;
                                            } else {
                                                // 最终回退到占位符
                                                img.src = "/placeholder-image.svg";
                                            }
                                        }}
                                        onLoad={() => {
                                            if (process.env.NODE_ENV === 'development') {
                                                console.log('Successfully loaded output image:', image.processedUrl || image.originalUrl);
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageIndex(index);
                                                setShowDehazeDetail(true);
                                            }}
                                        >
                                            <Zap className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(image.processedUrl || image.originalUrl, '_blank');
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(image.processedUrl || image.originalUrl, '_blank');
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                {task.status === "completed" ? "暂无输出图片" : "等待任务完成"}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 去雾详情对话框 */}
            <DehazeDetailDialog
                taskId={taskId}
                imageIndex={selectedImageIndex}
                open={showDehazeDetail}
                onOpenChange={setShowDehazeDetail}
            />
        </div>
    );
}