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
import { Plus, Database, Image, Trash2, Edit, Eye } from "lucide-react";
import { toast } from "sonner";

interface DatasetManagerProps {
    appId: string;
    onViewDataset?: (datasetId: string) => void;
}

export function DatasetManager({ appId, onViewDataset }: DatasetManagerProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingDataset, setEditingDataset] = useState<string | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editDataset, setEditDataset] = useState({
        name: "",
        description: "",
        tags: [] as string[],
        tagInput: "",
    });
    const [newDataset, setNewDataset] = useState({
        name: "",
        description: "",
        tags: [] as string[],
        tagInput: "",
    });

    const utils = trpcClientReact.useUtils();

    // 获取数据集列表
    const { data: datasets, isLoading } = trpcClientReact.datasets.listDatasets.useQuery({
        appId,
        type: "all",
    });

    // 创建数据集
    const createDatasetMutation = trpcClientReact.datasets.createDataset.useMutation({
        onSuccess: () => {
            toast.success("数据集创建成功");
            setShowCreateDialog(false);
            setNewDataset({ name: "", description: "", tags: [], tagInput: "" });
            utils.datasets.listDatasets.invalidate({ appId });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // 更新数据集
    const updateDatasetMutation = trpcClientReact.datasets.updateDataset.useMutation({
        onSuccess: () => {
            toast.success("数据集更新成功");
            setShowEditDialog(false);
            setEditingDataset(null);
            setEditDataset({ name: "", description: "", tags: [], tagInput: "" });
            utils.datasets.listDatasets.invalidate({ appId });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // 删除数据集
    const deleteDatasetMutation = trpcClientReact.datasets.deleteDataset.useMutation({
        onSuccess: () => {
            toast.success("数据集删除成功");
            utils.datasets.listDatasets.invalidate({ appId });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleCreateDataset = () => {
        if (!newDataset.name.trim()) {
            toast.error("请输入数据集名称");
            return;
        }

        createDatasetMutation.mutate({
            name: newDataset.name,
            description: newDataset.description || undefined,
            tags: newDataset.tags,
            appId,
        });
    };

    const handleAddTag = () => {
        const tag = newDataset.tagInput.trim();
        if (tag && !newDataset.tags.includes(tag)) {
            setNewDataset(prev => ({
                ...prev,
                tags: [...prev.tags, tag],
                tagInput: "",
            }));
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setNewDataset(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove),
        }));
    };

    const handleEditDataset = () => {
        if (!editDataset.name.trim()) {
            toast.error("请输入数据集名称");
            return;
        }

        updateDatasetMutation.mutate({
            id: editingDataset!,
            name: editDataset.name,
            description: editDataset.description || undefined,
            tags: editDataset.tags,
        });
    };

    const handleDeleteDataset = (datasetId: string) => {
        deleteDatasetMutation.mutate(datasetId);
    };

    const handleEditClick = (dataset: NonNullable<typeof datasets>[0]) => {
        setEditingDataset(dataset.id);
        setEditDataset({
            name: dataset.name,
            description: dataset.description || "",
            tags: dataset.tags || [],
            tagInput: "",
        });
        setShowEditDialog(true);
    };

    const handleAddEditTag = () => {
        const tag = editDataset.tagInput.trim();
        if (tag && !editDataset.tags.includes(tag)) {
            setEditDataset(prev => ({
                ...prev,
                tags: [...prev.tags, tag],
                tagInput: "",
            }));
        }
    };

    const handleRemoveEditTag = (tagToRemove: string) => {
        setEditDataset(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove),
        }));
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
                    <Database className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">数据集管理</h2>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            创建数据集
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>创建新数据集</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">数据集名称</Label>
                                <Input
                                    id="name"
                                    value={newDataset.name}
                                    onChange={(e) => setNewDataset(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="输入数据集名称"
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">描述（可选）</Label>
                                <Textarea
                                    id="description"
                                    value={newDataset.description}
                                    onChange={(e) => setNewDataset(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="描述数据集的用途和内容"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="tags">标签</Label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        id="tags"
                                        value={newDataset.tagInput}
                                        onChange={(e) => setNewDataset(prev => ({ ...prev, tagInput: e.target.value }))}
                                        placeholder="输入标签"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={handleAddTag}>
                                        添加
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {newDataset.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                                            {tag} ×
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                    取消
                                </Button>
                                <Button onClick={handleCreateDataset} disabled={createDatasetMutation.isPending}>
                                    {createDatasetMutation.isPending ? "创建中..." : "创建"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* 编辑数据集对话框 */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>编辑数据集</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="editName">数据集名称</Label>
                                <Input
                                    id="editName"
                                    value={editDataset.name}
                                    onChange={(e) => setEditDataset(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="输入数据集名称"
                                />
                            </div>
                            <div>
                                <Label htmlFor="editDescription">描述（可选）</Label>
                                <Textarea
                                    id="editDescription"
                                    value={editDataset.description}
                                    onChange={(e) => setEditDataset(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="描述数据集的用途和内容"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="editTags">标签</Label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        id="editTags"
                                        value={editDataset.tagInput}
                                        onChange={(e) => setEditDataset(prev => ({ ...prev, tagInput: e.target.value }))}
                                        placeholder="输入标签"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddEditTag();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={handleAddEditTag}>
                                        添加
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {editDataset.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveEditTag(tag)}>
                                            {tag} ×
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                                    取消
                                </Button>
                                <Button onClick={handleEditDataset} disabled={updateDatasetMutation.isPending}>
                                    {updateDatasetMutation.isPending ? "更新中..." : "更新"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 数据集列表 */}
            {datasets && datasets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {datasets.map((dataset) => (
                        <Card key={dataset.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{dataset.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {dataset.description || "暂无描述"}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onViewDataset?.(dataset.id)}
                                            title="查看详情"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditClick(dataset)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={deleteDatasetMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        确定要删除数据集 &ldquo;{dataset.name}&rdquo; 吗？此操作不可撤销，将同时删除数据集中的所有图片。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteDataset(dataset.id)}
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
                                    {/* 统计信息 */}
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Image className="h-4 w-4" />
                                            <span>{dataset.imageCount} 张图片</span>
                                        </div>
                                        <div className="text-xs">
                                            {dataset.type === "system" ? "系统" : "自定义"}
                                        </div>
                                    </div>

                                    {/* 标签 */}
                                    {dataset.tags && dataset.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {dataset.tags.map((tag) => (
                                                <Badge key={tag} variant="outline" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* 预览图片 */}
                                    {dataset.images && dataset.images.length > 0 && (
                                        <div className="flex gap-1 overflow-hidden">
                                            {dataset.images.slice(0, 3).map((image) => (
                                                <div
                                                    key={image.id}
                                                    className="w-12 h-12 bg-muted rounded border overflow-hidden shrink-0"
                                                >
                                                    <img
                                                        src={image.originalUrl}
                                                        alt={image.name || "Dataset image"}
                                                        className="w-full h-full object-cover"
                                                        crossOrigin="anonymous"
                                                        onError={(e) => {
                                                            if (process.env.NODE_ENV === 'development') {
                                                                console.error('Failed to load preview image:', image.originalUrl);
                                                            }
                                                            const img = e.target as HTMLImageElement;

                                                            // 如果还没有尝试过不带crossOrigin的加载，则重试
                                                            if (img.crossOrigin) {
                                                                if (process.env.NODE_ENV === 'development') {
                                                                    console.log('Retrying preview image without crossOrigin...');
                                                                }
                                                                img.crossOrigin = '';
                                                                img.src = image.originalUrl;
                                                            } else {
                                                                // 最终隐藏图片
                                                                img.style.display = "none";
                                                            }
                                                        }}
                                                        onLoad={() => {
                                                            if (process.env.NODE_ENV === 'development') {
                                                                console.log('Successfully loaded preview image:', image.originalUrl);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                            {dataset.images.length > 3 && (
                                                <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                                                    +{dataset.images.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-xs text-muted-foreground">
                                        创建于 {dataset.createdAt ? new Date(dataset.createdAt).toLocaleDateString() : "未知"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">暂无数据集</h3>
                    <p className="text-muted-foreground mb-4">
                        创建您的第一个数据集来开始管理图片
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        创建数据集
                    </Button>
                </div>
            )}
        </div>
    );
}