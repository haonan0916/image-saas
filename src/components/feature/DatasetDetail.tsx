"use client";

import { useState, useEffect } from "react";
import { trpcClientReact, trpcPureClient } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Image as ImageIcon,
  Download,
  Eye,
  X,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Uppy from "@uppy/core";
import { useLocale } from "@/hooks/useLocale";
import { useParams } from "next/navigation";
import { Locale } from "@/dictionaries";

interface DatasetDetailProps {
  datasetId: string;
  onBack: () => void;
  uppy: Uppy; // 添加 uppy prop
}

export function DatasetDetail({ datasetId, onBack, uppy }: DatasetDetailProps) {
  const { dict } = useLocale();
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpcClientReact.useUtils();

  const param = useParams();
  const locale = param.locale as Locale;

  // 获取数据集详情
  const { data: dataset, isLoading } =
    trpcClientReact.datasets.getDataset.useQuery(datasetId);

  // 检查存储配置
  const hasStorageConfig = dataset?.app?.storage;

  // 上传图片到数据集
  const uploadImageMutation =
    trpcClientReact.datasets.addImageToDataset.useMutation({
      onSuccess: () => {
        utils.datasets.getDataset.invalidate(datasetId);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // 监听 Uppy 上传事件，仿照 FileList 的方式
  useEffect(() => {
    const handler = async (file, resp) => {
      if (file && resp.uploadURL) {
        try {
          // 1. 保存文件到文件管理
          const savedFile = await trpcPureClient.file.saveFile.mutate({
            name: file.data instanceof File ? file.data.name : "test",
            path: resp.uploadURL,
            type: file.data instanceof File ? file.data.type : "",
            appId: dataset?.appId || "",
          });

          // 2. 获取图片尺寸
          const getImageDimensions = (
            file: File,
          ): Promise<{ width: number; height: number }> => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                resolve({ width: img.width, height: img.height });
              };
              img.onerror = () => {
                resolve({ width: 0, height: 0 });
              };
              img.src = URL.createObjectURL(file);
            });
          };

          const dimensions =
            file.data instanceof File
              ? await getImageDimensions(file.data)
              : { width: 0, height: 0 };

          // 3. 添加图片到数据集
          await uploadImageMutation.mutateAsync({
            datasetId,
            name: file.data instanceof File ? file.data.name : "test",
            originalUrl: savedFile.url,
            contentType: file.data instanceof File ? file.data.type : "",
            size: file.size || 0,
            width: dimensions.width || undefined,
            height: dimensions.height || undefined,
          });

          if (process.env.NODE_ENV === "development") {
            console.log(
              "Successfully uploaded and saved to dataset:",
              savedFile.url,
            );
          }
        } catch (error) {
          console.error("Failed to save file to dataset:", error);
          toast.error("保存到数据集失败");
        }
      }
    };

    const completeHandler = () => {
      setUploading(false);
      setShowUploadDialog(false);
      setUploadFiles(null);
      toast.success("图片上传完成");

      // 清理 Uppy 中的文件，防止切换到文件管理标签页时弹出 UploadPreview
      const files = uppy.getFiles();
      files.forEach((file) => {
        uppy.removeFile(file.id);
      });
    };

    uppy.on("upload-success", handler);
    uppy.on("complete", completeHandler);

    return () => {
      uppy.off("upload-success", handler);
      uppy.off("complete", completeHandler);
    };
  }, [uppy, dataset?.appId, datasetId, uploadImageMutation, utils]);

  // 批量上传文件使用 Uppy
  const handleUploadFiles = async () => {
    if (!uploadFiles || uploadFiles.length === 0) {
      toast.error("请选择要上传的文件");
      return;
    }

    setUploading(true);

    // 将文件添加到 Uppy
    Array.from(uploadFiles).forEach((file) => {
      uppy.addFile({
        data: file,
        name: file.name,
      });
    });

    // 开始上传
    try {
      await uppy.upload();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("上传失败");
      setUploading(false);
    }
  };

  // 删除图片
  const removeImageMutation =
    trpcClientReact.datasets.removeImageFromDataset.useMutation({
      onSuccess: () => {
        toast.success("图片删除成功");
        utils.datasets.getDataset.invalidate(datasetId);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleRemoveImage = (imageId: string) => {
    removeImageMutation.mutate(imageId);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // 检查存储配置
      if (!hasStorageConfig) {
        toast.error("请先配置存储设置");
        return;
      }
      setUploadFiles(files);
      setShowUploadDialog(true);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">数据集不存在</p>
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
            <h2 className="text-2xl font-semibold">{dataset.name}</h2>
            <p className="text-muted-foreground">
              {dataset.description || dict.common.noDescription}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="image-upload"
            disabled={!hasStorageConfig}
          />
          <Button asChild disabled={!hasStorageConfig}>
            <label
              htmlFor="image-upload"
              className={`cursor-pointer ${!hasStorageConfig ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <Upload className="h-4 w-4 mr-2" />
              上传图片
            </label>
          </Button>
        </div>
      </div>

      {/* 数据集信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>数据集信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">图片数量</p>
              <p className="text-2xl font-bold">{dataset.imageCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">类型</p>
              <p className="font-medium">
                {dataset.type === "system" ? "系统" : "自定义"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">创建时间</p>
              <p className="font-medium">
                {dataset.createdAt
                  ? new Date(dataset.createdAt).toLocaleDateString()
                  : dict.tasks.unknown}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">最后更新</p>
              <p className="font-medium">
                {dataset.updatedAt
                  ? new Date(dataset.updatedAt).toLocaleDateString()
                  : dict.tasks.unknown}
              </p>
            </div>
          </div>
          {dataset.tags && dataset.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">标签</p>
              <div className="flex flex-wrap gap-1">
                {dataset.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 图片网格 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">图片列表</h3>
        {dataset.images && dataset.images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {dataset.images.map((image) => (
              <Card
                key={image.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square relative group">
                  <img
                    src={image.originalUrl}
                    alt={image.name || "Dataset image"}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      if (process.env.NODE_ENV === "development") {
                        console.error(
                          "Failed to load image:",
                          image.originalUrl,
                        );
                      }
                      const img = e.target as HTMLImageElement;

                      // 如果还没有尝试过不带crossOrigin的加载，则重试
                      if (img.crossOrigin) {
                        if (process.env.NODE_ENV === "development") {
                          console.log("Retrying without crossOrigin...");
                        }
                        img.crossOrigin = "";
                        img.src = image.originalUrl;
                      } else {
                        // 最终回退到占位符
                        img.src = "/placeholder-image.svg";
                      }
                    }}
                    onLoad={() => {
                      if (process.env.NODE_ENV === "development") {
                        console.log(
                          "Successfully loaded image:",
                          image.originalUrl,
                        );
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowImagePreview(image.originalUrl)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(image.originalUrl, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={removeImageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除图片 &ldquo;{image.name || "未命名图片"}
                            &rdquo; 吗？此操作不可撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveImage(image.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">{image.name}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    <p>{formatFileSize(image.size)}</p>
                    {image.width && image.height && (
                      <p>
                        {image.width} × {image.height}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无图片</h3>
            <p className="text-muted-foreground mb-4">上传图片到这个数据集</p>
            {!hasStorageConfig ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  需要先配置存储设置
                </p>
                <Button asChild variant="outline">
                  <Link
                    href={`/${locale}/dashboard/apps/${dataset?.appId}/setting/storage`}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    配置存储
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="empty-state-upload"
                />
                <Button asChild>
                  <label
                    htmlFor="empty-state-upload"
                    className="cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    上传图片
                  </label>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 图片预览对话框 */}
      <Dialog
        open={Boolean(showImagePreview)}
        onOpenChange={() => setShowImagePreview(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              图片预览
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImagePreview(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {showImagePreview && (
            <div className="flex justify-center">
              <img
                src={showImagePreview}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 上传确认对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传图片到数据集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              将要上传 {uploadFiles?.length} 张图片到数据集 {dataset.name}
            </p>
            {uploadFiles && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {Array.from(uploadFiles).map((file, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span>{file.name}</span>
                    <span className="text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                取消
              </Button>
              <Button onClick={handleUploadFiles} disabled={uploading}>
                {uploading ? "上传中..." : "确认上传"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
