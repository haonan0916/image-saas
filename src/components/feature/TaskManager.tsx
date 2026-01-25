"use client";

import { useState } from "react";
import { trpcClientReact } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { DehazeDetailDialog } from "./DehazeDetailDialog";
import {
    Plus,
    Play,
    Pause,
    RotateCcw,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Image,
    Brain,
    Database,
    Eye,
    Zap
} from "lucide-react";
import { toast } from "sonner";

interface TaskManagerProps {
    appId: string;
    onViewTask?: (taskId: string) => void;
}

export function TaskManager({ appId, onViewTask }: TaskManagerProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [showDehazeDetail, setShowDehazeDetail] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [newTask, setNewTask] = useState({
        name: "",
        datasetId: "",
        modelId: "",
        inputImageIds: [] as string[],
    });

    const utils = trpcClientReact.useUtils();

    // 获取任务列表
    const { data: tasksData, isLoading } = trpcClientReact.dehazeTasks.listDehazeTasks.useQuery({
        appId,
        status: selectedStatus as "pending" | "processing" | "completed" | "failed" | "all",
        limit: 20,
        offset: 0,
    });

    // 获取服务状态
    const { data: serviceStatus } = trpcClientReact.dehazeTasks.getServiceStatus.useQuery(undefined, {
        refetchInterval: 30000, // 每30秒刷新一次
    });

    // 获取数据集列表（用于创建任务）
    const { data: datasets } = trpcClientReact.datasets.listDatasets.useQuery({
        appId,
        type: "all",
    });

    // 获取模型列表（用于创建任务）
    const { data: models } = trpcClientReact.models.listModels.useQuery({
        appId,
        type: "all",
        category: "all",
    });

    // 获取任务状态选项
    const { data: taskStatuses } = trpcClientReact.dehazeTasks.getTaskStatuses.useQuery();

    // 获取任务统计
    const { data: taskStats } = trpcClientReact.dehazeTasks.getTaskStats.useQuery(appId);

    // 创建任务
    const createTaskMutation = trpcClientReact.dehazeTasks.createDehazeTask.useMutation({
        onSuccess: () => {
            toast.success("任务创建成功");
            setShowCreateDialog(false);
            setNewTask({ name: "", datasetId: "", modelId: "", inputImageIds: [] });
            utils.dehazeTasks.listDehazeTasks.invalidate({ appId });
            utils.dehazeTasks.getTaskStats.invalidate(appId);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // 取消任务
    const cancelTaskMutation = trpcClientReact.dehazeTasks.cancelTask.useMutation({
        onSuccess: () => {
            toast.success("任务已取消");
            utils.dehazeTasks.listDehazeTasks.invalidate({ appId });
            utils.dehazeTasks.getTaskStats.invalidate(appId);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // 重试任务
    const retryTaskMutation = trpcClientReact.dehazeTasks.retryTask.useMutation({
        onSuccess: () => {
            toast.success("任务已重新启动");
            utils.dehazeTasks.listDehazeTasks.invalidate({ appId });
            utils.dehazeTasks.getTaskStats.invalidate(appId);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleCreateTask = () => {
        if (!newTask.name.trim()) {
            toast.error("请输入任务名称");
            return;
        }
        if (!newTask.datasetId) {
            toast.error("请选择数据集");
            return;
        }
        if (!newTask.modelId) {
            toast.error("请选择模型");
            return;
        }

        // 获取选中数据集的所有图片作为输入
        const selectedDataset = datasets?.find(d => d.id === newTask.datasetId);
        if (!selectedDataset || !selectedDataset.images || selectedDataset.images.length === 0) {
            toast.error("选中的数据集没有图片");
            return;
        }

        const inputImageIds = selectedDataset.images.map(img => img.id);

        createTaskMutation.mutate({
            name: newTask.name,
            datasetId: newTask.datasetId,
            modelId: newTask.modelId,
            inputImageIds,
            appId,
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending":
                return <Clock className="h-4 w-4" />;
            case "processing":
                return <Play className="h-4 w-4" />;
            case "completed":
                return <CheckCircle className="h-4 w-4" />;
            case "failed":
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
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

    const formatProcessingTime = (seconds: number | null) => {
        if (!seconds) return "未知";
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

    return (
        <div className="space-y-6">
            {/* 头部操作栏和统计 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">任务管理</h2>
                    {/* 服务状态指示器 */}
                    {serviceStatus && (
                        <Badge
                            variant={serviceStatus.isStarted && serviceStatus.taskScheduler.isRunning ? "default" : "destructive"}
                            className="ml-2"
                        >
                            {serviceStatus.isStarted && serviceStatus.taskScheduler.isRunning ? "服务运行中" : "服务未启动"}
                        </Badge>
                    )}
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            创建任务
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>创建去雾任务</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="taskName">任务名称</Label>
                                <Input
                                    id="taskName"
                                    value={newTask.name}
                                    onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="输入任务名称"
                                />
                            </div>
                            <div>
                                <Label htmlFor="dataset">选择数据集</Label>
                                <Select
                                    value={newTask.datasetId}
                                    onValueChange={(value: string) => setNewTask(prev => ({ ...prev, datasetId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择数据集" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {datasets?.map((dataset) => (
                                            <SelectItem key={dataset.id} value={dataset.id}>
                                                <div className="flex items-center gap-2">
                                                    <Database className="h-4 w-4" />
                                                    <span>{dataset.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({dataset.imageCount} 张图片)
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="model">选择模型</Label>
                                <Select
                                    value={newTask.modelId}
                                    onValueChange={(value: string) => setNewTask(prev => ({ ...prev, modelId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择模型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {models?.map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                <div className="flex items-center gap-2">
                                                    <Brain className="h-4 w-4" />
                                                    <span>{model.name}</span>
                                                    {model.isDefault && (
                                                        <Badge variant="outline" className="text-xs">默认</Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                    取消
                                </Button>
                                <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                                    {createTaskMutation.isPending ? "创建中..." : "创建"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 统计卡片 */}
            {taskStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Play className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">总任务</p>
                                    <p className="text-2xl font-bold">{taskStats.totalTasks}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">已完成</p>
                                    <p className="text-2xl font-bold">{taskStats.statusCounts.completed || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Image className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">处理图片</p>
                                    <p className="text-2xl font-bold">{taskStats.processedImages}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Clock className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">平均耗时</p>
                                    <p className="text-2xl font-bold">{taskStats.avgProcessingTime}s</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 状态筛选 */}
            <div className="flex items-center gap-4">
                <Label>状态筛选:</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        {taskStatuses?.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                                {status.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 任务列表 */}
            {tasksData && tasksData.tasks.length > 0 ? (
                <div className="space-y-4">
                    {tasksData.tasks.map((task) => (
                        <Card key={task.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <CardTitle className="text-lg">{task.name}</CardTitle>
                                            <Badge variant={getStatusColor(task.status) as "default" | "secondary" | "destructive"} className="flex items-center gap-1">
                                                {getStatusIcon(task.status)}
                                                {getStatusLabel(task.status)}
                                            </Badge>
                                        </div>
                                        <CardDescription className="mt-1 flex items-center gap-4">
                                            <span>数据集: {task.dataset?.name}</span>
                                            <span>模型: {task.model?.name}</span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onViewTask?.(task.id)}
                                            title="查看详情"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {task.status === "completed" && task.outputImageIds && task.outputImageIds.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedTaskId(task.id);
                                                    setShowDehazeDetail(true);
                                                }}
                                                title="查看去雾对比"
                                            >
                                                <Zap className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {task.status === "failed" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => retryTaskMutation.mutate(task.id)}
                                                disabled={retryTaskMutation.isPending}
                                                title="重试"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {(task.status === "pending" || task.status === "processing") && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => cancelTaskMutation.mutate(task.id)}
                                                disabled={cancelTaskMutation.isPending}
                                                title="取消"
                                            >
                                                <Pause className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {/* 进度信息 */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">输入图片:</span>
                                            <div className="font-medium">{task.inputImageIds.length} 张</div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">输出图片:</span>
                                            <div className="font-medium">{task.outputImageIds?.length || 0} 张</div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">处理时间:</span>
                                            <div className="font-medium">{formatProcessingTime(task.processingTime)}</div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">创建时间:</span>
                                            <div className="font-medium">{task.createdAt ? new Date(task.createdAt).toLocaleString() : "未知"}</div>
                                        </div>
                                    </div>

                                    {/* 进度条 */}
                                    {task.status === "processing" && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>处理进度</span>
                                                <span>处理中...</span>
                                            </div>
                                            <Progress value={50} className="h-2" />
                                        </div>
                                    )}

                                    {/* 错误信息 */}
                                    {task.status === "failed" && task.errorMessage && (
                                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                            <p className="text-sm text-destructive">{task.errorMessage}</p>
                                        </div>
                                    )}

                                    {/* 完成信息 */}
                                    {task.status === "completed" && task.completedAt && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm text-green-700">
                                                任务完成于 {new Date(task.completedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">暂无任务</h3>
                    <p className="text-muted-foreground mb-4">
                        创建您的第一个去雾任务来开始图像处理
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        创建任务
                    </Button>
                </div>
            )}

            {/* 去雾详情对话框 */}
            <DehazeDetailDialog
                taskId={selectedTaskId}
                open={showDehazeDetail}
                onOpenChange={(open) => {
                    setShowDehazeDetail(open);
                    if (!open) {
                        setSelectedTaskId(null);
                    }
                }}
            />
        </div>
    );
}