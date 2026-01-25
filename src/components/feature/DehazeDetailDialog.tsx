"use client";

import { useState } from "react";
import { trpcClientReact } from "@/utils/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageCompare } from "@/components/ui/image-compare";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  ExternalLink,
  Clock,
  Image as ImageIcon,
  Brain,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

interface DehazeDetailDialogProps {
  taskId: string | null;
  imageIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DehazeDetailDialog({
  taskId,
  imageIndex = 0,
  open,
  onOpenChange,
}: DehazeDetailDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(imageIndex);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // 获取任务详情
  const { data: task, isLoading } = trpcClientReact.dehazeTasks.getDehazeTask.useQuery(
    taskId!,
    { enabled: !!taskId && open }
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "processing":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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

  const handleDownloadImage = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("开始下载图片");
  };

  const handleImageError = (error: string) => {
    console.error("Image load error:", error);
    toast.error("图片加载失败");
  };

  if (!taskId) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>加载中...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>任务不存在</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">找不到指定的任务</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const inputImages = task.inputImages || [];
  const outputImages = task.outputImages || [];
  const currentInputImage = inputImages[currentImageIndex];
  const currentOutputImage = outputImages[currentImageIndex];

  const hasImages = inputImages.length > 0 && outputImages.length > 0;
  const canCompare = hasImages && currentInputImage && currentOutputImage;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">{task.name}</DialogTitle>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStatusIcon(task.status)}
                  {getStatusLabel(task.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>{task.dataset?.name}</span>
                <Brain className="h-4 w-4 ml-2" />
                <span>{task.model?.name}</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="compare" className="h-full flex flex-col">
              <TabsList className="shrink-0">
                <TabsTrigger value="compare">图像对比</TabsTrigger>
                <TabsTrigger value="details">任务详情</TabsTrigger>
                <TabsTrigger value="gallery">图片画廊</TabsTrigger>
              </TabsList>

              <TabsContent value="compare" className="flex-1 mt-4">
                {canCompare ? (
                  <div className="h-full flex flex-col gap-4">
                    {/* 图片选择器 */}
                    {inputImages.length > 1 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground">选择图片:</span>
                        <div className="flex gap-1">
                          {inputImages.map((_, index) => (
                            <Button
                              key={index}
                              variant={index === currentImageIndex ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentImageIndex(index)}
                            >
                              {index + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 图像对比组件 */}
                    <div className="flex-1 min-h-0">
                      <ImageCompare
                        beforeImage={currentInputImage.originalUrl}
                        afterImage={currentOutputImage.processedUrl || currentOutputImage.originalUrl}
                        beforeLabel="去雾前"
                        afterLabel="去雾后"
                        className="h-full"
                        onError={handleImageError}
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFullscreenImage(currentInputImage.originalUrl)}
                      >
                        <Maximize2 className="h-4 w-4 mr-2" />
                        查看原图
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFullscreenImage(currentOutputImage.processedUrl || currentOutputImage.originalUrl)}
                      >
                        <Maximize2 className="h-4 w-4 mr-2" />
                        查看去雾图
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadImage(
                          currentOutputImage.processedUrl || currentOutputImage.originalUrl,
                          `dehazed_${currentOutputImage.name || `image_${currentImageIndex + 1}`}`
                        )}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        下载去雾图
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {task.status === "completed" ? "暂无可对比的图片" : "等待任务完成"}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="flex-1 mt-4 overflow-auto">
                <div className="space-y-4">
                  {/* 基本信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>基本信息</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">输入图片</p>
                          <p className="text-2xl font-bold">{inputImages.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">输出图片</p>
                          <p className="text-2xl font-bold">{outputImages.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">处理时间</p>
                          <p className="text-lg font-bold">{formatProcessingTime(task.processingTime)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">创建时间</p>
                          <p className="text-sm font-medium">
                            {task.createdAt ? new Date(task.createdAt).toLocaleString() : "未知"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 模型信息 */}
                  {task.model && (
                    <Card>
                      <CardHeader>
                        <CardTitle>模型信息</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">模型名称:</span>
                            <span className="font-medium">{task.model.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">模型类型:</span>
                            <span className="font-medium">{task.model.type}</span>
                          </div>
                          {task.model.description && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">描述:</span>
                              <span className="font-medium">{task.model.description}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 数据集信息 */}
                  {task.dataset && (
                    <Card>
                      <CardHeader>
                        <CardTitle>数据集信息</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">数据集名称:</span>
                            <span className="font-medium">{task.dataset.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">数据集类型:</span>
                            <span className="font-medium">{task.dataset.type}</span>
                          </div>
                          {task.dataset.description && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">描述:</span>
                              <span className="font-medium">{task.dataset.description}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 错误信息 */}
                  {task.status === "failed" && task.errorMessage && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-600">错误信息</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-red-600">{task.errorMessage}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="flex-1 mt-4 overflow-auto">
                <div className="space-y-6">
                  {/* 输入图片 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">输入图片 ({inputImages.length})</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {inputImages.map((image, index) => (
                        <div key={image.id} className="aspect-square relative group border rounded-lg overflow-hidden">
                          <img
                            src={image.originalUrl}
                            alt={image.name || `Input ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setFullscreenImage(image.originalUrl)}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setFullscreenImage(image.originalUrl)}
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(image.originalUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 输出图片 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">输出图片 ({outputImages.length})</h3>
                    {outputImages.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {outputImages.map((image, index) => (
                          <div key={image.id} className="aspect-square relative group border rounded-lg overflow-hidden">
                            <img
                              src={image.processedUrl || image.originalUrl}
                              alt={image.name || `Output ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setFullscreenImage(image.processedUrl || image.originalUrl)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setFullscreenImage(image.processedUrl || image.originalUrl)}
                              >
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDownloadImage(
                                  image.processedUrl || image.originalUrl,
                                  `dehazed_${image.name || `image_${index + 1}`}`
                                )}
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
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* 全屏图片查看 */}
      {fullscreenImage && (
        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={fullscreenImage}
                alt="Full screen view"
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setFullscreenImage(null)}
              >
                关闭
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}