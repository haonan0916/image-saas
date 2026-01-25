"use client";

import { useState } from "react";
import { trpcClientReact } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Brain, Star, Trash2, Edit, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/hooks/useLocale";

interface ModelManagerProps {
  appId: string;
}

export function ModelManager({ appId }: ModelManagerProps) {
  const { dict } = useLocale();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editModel, setEditModel] = useState({
    name: "",
    description: "",
    category: "general" as "general" | "high_fidelity" | "fast_processing",
    version: "1.0.0",
    fileUrl: "",
    fileSize: 0,
    format: "pth" as "pth" | "onnx" | "pb",
    isDefault: false,
  });
  const [newModel, setNewModel] = useState({
    name: "",
    description: "",
    category: "general" as "general" | "high_fidelity" | "fast_processing",
    version: "1.0.0",
    fileUrl: "",
    fileSize: 0,
    format: "pth" as "pth" | "onnx" | "pb",
    isDefault: false,
  });

  const utils = trpcClientReact.useUtils();

  // 获取模型列表
  const { data: models, isLoading } = trpcClientReact.models.listModels.useQuery({
    appId,
    type: "all",
    category: "all",
  });

  // 获取模型类别和格式选项
  const { data: categories } = trpcClientReact.models.getModelCategories.useQuery();
  const { data: formats } = trpcClientReact.models.getSupportedFormats.useQuery();

  // 创建模型
  const createModelMutation = trpcClientReact.models.createModel.useMutation({
    onSuccess: () => {
      toast.success(dict.models.createSuccess);
      setShowCreateDialog(false);
      setNewModel({
        name: "",
        description: "",
        category: "general",
        version: "1.0.0",
        fileUrl: "",
        fileSize: 0,
        format: "pth",
        isDefault: false,
      });
      utils.models.listModels.invalidate({ appId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 更新模型
  const updateModelMutation = trpcClientReact.models.updateModel.useMutation({
    onSuccess: () => {
      toast.success(dict.models.updateSuccess);
      setShowEditDialog(false);
      setEditingModel(null);
      setEditModel({
        name: "",
        description: "",
        category: "general",
        version: "1.0.0",
        fileUrl: "",
        fileSize: 0,
        format: "pth",
        isDefault: false,
      });
      utils.models.listModels.invalidate({ appId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 设置默认模型
  const setDefaultModelMutation = trpcClientReact.models.setDefaultModel.useMutation({
    onSuccess: () => {
      toast.success("默认模型设置成功");
      utils.models.listModels.invalidate({ appId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 删除模型
  const deleteModelMutation = trpcClientReact.models.deleteModel.useMutation({
    onSuccess: () => {
      toast.success(dict.models.deleteSuccess);
      utils.models.listModels.invalidate({ appId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateModel = () => {
    if (!newModel.name.trim()) {
      toast.error("请输入模型名称");
      return;
    }

    createModelMutation.mutate({
      ...newModel,
      appId,
      fileUrl: newModel.fileUrl || undefined,
      fileSize: newModel.fileSize || undefined,
      format: newModel.format || undefined,
    });
  };

  const handleSetDefaultModel = (modelId: string) => {
    setDefaultModelMutation.mutate(modelId);
  };

  const handleEditModel = () => {
    if (!editModel.name.trim()) {
      toast.error("请输入模型名称");
      return;
    }

    updateModelMutation.mutate({
      id: editingModel!,
      name: editModel.name,
      description: editModel.description || undefined,
      category: editModel.category,
      version: editModel.version,
      fileUrl: editModel.fileUrl || undefined,
      fileSize: editModel.fileSize || undefined,
      format: editModel.format || undefined,
      isDefault: editModel.isDefault,
    });
  };

  const handleEditClick = (model: NonNullable<typeof models>[0]) => {
    setEditingModel(model.id);
    setEditModel({
      name: model.name,
      description: model.description || "",
      category: model.category as "general" | "high_fidelity" | "fast_processing",
      version: model.version,
      fileUrl: model.fileUrl || "",
      fileSize: model.fileSize || 0,
      format: (model.format as "pth" | "onnx" | "pb") || "pth",
      isDefault: model.isDefault,
    });
    setShowEditDialog(true);
  };

  const handleDeleteModel = (modelId: string) => {
    deleteModelMutation.mutate(modelId);
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap = {
      general: "通用模型",
      high_fidelity: "高保真模型",
      fast_processing: "快速处理模型",
    };
    return categoryMap[category as keyof typeof categoryMap] || category;
  };

  const getFormatLabel = (format: string) => {
    const formatMap = {
      pth: "PyTorch (.pth)",
      onnx: "ONNX (.onnx)",
      pb: "TensorFlow (.pb)",
    };
    return formatMap[format as keyof typeof formatMap] || format;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "未知大小";
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

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          <h2 className="text-xl font-semibold">模型管理</h2>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加模型
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>添加新模型</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">模型名称</Label>
                <Input
                  id="name"
                  value={newModel.name}
                  onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入模型名称"
                />
              </div>
              <div>
                <Label htmlFor="description">描述（可选）</Label>
                <Textarea
                  id="description"
                  value={newModel.description}
                  onChange={(e) => setNewModel(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述模型的特点和用途"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="category">模型类别</Label>
                <Select
                  value={newModel.category}
                  onValueChange={(value: "general" | "high_fidelity" | "fast_processing") => setNewModel(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="version">版本</Label>
                <Input
                  id="version"
                  value={newModel.version}
                  onChange={(e) => setNewModel(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="例如: 1.0.0"
                />
              </div>
              <div>
                <Label htmlFor="fileUrl">模型文件 URL（可选）</Label>
                <Input
                  id="fileUrl"
                  value={newModel.fileUrl}
                  onChange={(e) => setNewModel(prev => ({ ...prev, fileUrl: e.target.value }))}
                  placeholder="https://example.com/model.pth"
                />
              </div>
              <div>
                <Label htmlFor="format">文件格式</Label>
                <Select
                  value={newModel.format}
                  onValueChange={(value: "pth" | "onnx" | "pb") => setNewModel(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formats?.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateModel} disabled={createModelMutation.isPending}>
                  {createModelMutation.isPending ? "添加中..." : dict.common.add}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 编辑模型对话框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>编辑模型</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">模型名称</Label>
                <Input
                  id="editName"
                  value={editModel.name}
                  onChange={(e) => setEditModel(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入模型名称"
                />
              </div>
              <div>
                <Label htmlFor="editDescription">描述（可选）</Label>
                <Textarea
                  id="editDescription"
                  value={editModel.description}
                  onChange={(e) => setEditModel(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述模型的特点和用途"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="editCategory">模型类别</Label>
                <Select
                  value={editModel.category}
                  onValueChange={(value: "general" | "high_fidelity" | "fast_processing") => setEditModel(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editVersion">版本</Label>
                <Input
                  id="editVersion"
                  value={editModel.version}
                  onChange={(e) => setEditModel(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="例如: 1.0.0"
                />
              </div>
              <div>
                <Label htmlFor="editFileUrl">模型文件 URL（可选）</Label>
                <Input
                  id="editFileUrl"
                  value={editModel.fileUrl}
                  onChange={(e) => setEditModel(prev => ({ ...prev, fileUrl: e.target.value }))}
                  placeholder="https://example.com/model.pth"
                />
              </div>
              <div>
                <Label htmlFor="editFormat">文件格式</Label>
                <Select
                  value={editModel.format}
                  onValueChange={(value: "pth" | "onnx" | "pb") => setEditModel(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formats?.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleEditModel} disabled={updateModelMutation.isPending}>
                  {updateModelMutation.isPending ? "更新中..." : dict.common.update}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 模型列表 */}
      {models && models.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <Card key={model.id} className={`hover:shadow-md transition-shadow ${model.isDefault ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      {model.isDefault && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          默认
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {model.description || dict.common.noDescription}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {!model.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefaultModel(model.id)}
                        disabled={setDefaultModelMutation.isPending}
                        title="设为默认"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(model)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteModelMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除模型 &ldquo;{model.name}&rdquo; 吗？此操作不可撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteModel(model.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* 模型信息 */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">类别:</span>
                      <div className="font-medium">{getCategoryLabel(model.category)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">版本:</span>
                      <div className="font-medium">{model.version}</div>
                    </div>
                    {model.format && (
                      <div>
                        <span className="text-muted-foreground">格式:</span>
                        <div className="font-medium">{getFormatLabel(model.format)}</div>
                      </div>
                    )}
                    {model.fileSize && (
                      <div>
                        <span className="text-muted-foreground">大小:</span>
                        <div className="font-medium">{formatFileSize(model.fileSize)}</div>
                      </div>
                    )}
                  </div>

                  {/* 类型标签 */}
                  <div className="flex gap-2">
                    <Badge variant={model.type === "system" ? "default" : "secondary"}>
                      {model.type === "system" ? "系统模型" : "自定义模型"}
                    </Badge>
                  </div>

                  {/* 下载链接 */}
                  {model.fileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(model.fileUrl!, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      下载模型
                    </Button>
                  )}

                  <div className="text-xs text-muted-foreground">
                    创建于 {model.createdAt ? new Date(model.createdAt).toLocaleDateString() : dict.tasks.unknown}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无模型</h3>
          <p className="text-muted-foreground mb-4">
            添加您的第一个 AI 模型来开始图像处理
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加模型
          </Button>
        </div>
      )}
    </div>
  );
}