"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpcClientReact } from "@/utils/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Search, Trash2, BookOpen, Settings } from "lucide-react";

export default function RAGAdminPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: "",
    content: "",
    type: "guide" as "document" | "api" | "guide" | "faq",
    category: "",
    tags: "",
    source: "",
    isPublic: false,
  });

  // 获取知识库文档
  const { data: documents, refetch: refetchDocs } = trpcClientReact.rag.getDocuments.useQuery({
    limit: 50,
  });

  // 搜索知识库
  const { data: searchResults, refetch: refetchSearch } = trpcClientReact.rag.searchKnowledge.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  // 添加文档
  const addDocMutation = trpcClientReact.rag.addDocument.useMutation({
    onSuccess: () => {
      toast.success("文档添加成功");
      setShowAddDialog(false);
      setNewDoc({
        title: "",
        content: "",
        type: "guide",
        category: "",
        tags: "",
        source: "",
        isPublic: false,
      });
      refetchDocs();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  // 删除文档
  const deleteDocMutation = trpcClientReact.rag.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("文档删除成功");
      refetchDocs();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 初始化系统知识库
  const initKnowledgeMutation = trpcClientReact.rag.initializeSystemKnowledge.useMutation({
    onSuccess: () => {
      toast.success("系统知识库初始化成功");
      refetchDocs();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });

  // 测试 embedding 连接
  const { data: embeddingStatus, refetch: testEmbedding } = trpcClientReact.rag.testEmbeddingConnection.useQuery(
    undefined,
    { enabled: false }
  );

  const handleAddDocument = () => {
    addDocMutation.mutate({
      ...newDoc,
      tags: newDoc.tags.split(",").map(tag => tag.trim()).filter(Boolean),
    });
  };

  const handleDeleteDocument = (id: string) => {
    deleteDocMutation.mutate({ id });
  };

  const handleSearch = () => {
    if (searchQuery.length > 2) {
      refetchSearch();
    }
  };

  const handleTestEmbedding = async () => {
    try {
      const result = await testEmbedding();
      if (result.data?.success) {
        toast.success(`Embedding 模型连接成功！使用模型: ${result.data.model}`);
      } else {
        toast.error(`Embedding 模型连接失败: ${result.data?.error || '未知错误'}`);
      }
    } catch (error) {
      toast.error(`测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p>请先登录以访问 RAG 管理界面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RAG 知识库管理</h1>
          <p className="text-muted-foreground">管理系统知识库，提升AI聊天体验</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestEmbedding}>
            <Settings className="h-4 w-4 mr-2" />
            测试 Embedding 连接
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                初始化系统知识库
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>初始化系统知识库</AlertDialogTitle>
                <AlertDialogDescription>
                  这将添加系统默认的知识库文档，包括功能介绍、使用指南等。
                  如果已存在相同文档，可能会重复添加。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => initKnowledgeMutation.mutate()}>
                  确认初始化
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加文档
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>添加知识库文档</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="文档标题"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                />
                <Textarea
                  placeholder="文档内容"
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  rows={8}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={newDoc.type}
                    onValueChange={(value: "document" | "api" | "guide" | "faq") => setNewDoc({ ...newDoc, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="文档类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">文档</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="guide">指南</SelectItem>
                      <SelectItem value="faq">FAQ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="分类 (可选)"
                    value={newDoc.category}
                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="标签 (用逗号分隔)"
                  value={newDoc.tags}
                  onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
                />
                <Input
                  placeholder="来源 (可选)"
                  value={newDoc.source}
                  onChange={(e) => setNewDoc({ ...newDoc, source: e.target.value })}
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newDoc.isPublic}
                    onChange={(e) => setNewDoc({ ...newDoc, isPublic: e.target.checked })}
                  />
                  <label htmlFor="isPublic">公开文档 (所有用户可见)</label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddDocument} disabled={addDocMutation.isPending}>
                    {addDocMutation.isPending ? "添加中..." : "添加"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 系统状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Embedding 模型</h3>
              {embeddingStatus ? (
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${embeddingStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${embeddingStatus.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    {embeddingStatus.success ? '连接正常' : '连接失败'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    模型: {embeddingStatus.model}
                  </p>
                  {embeddingStatus.error && (
                    <p className="text-sm text-red-600">
                      错误: {embeddingStatus.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">点击测试按钮检查连接状态</p>
              )}
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">知识库统计</h3>
              <div className="space-y-1">
                <p className="text-sm">总文档数: {documents?.length || 0}</p>
                <p className="text-sm">
                  公开文档: {documents?.filter(doc => doc.isPublic).length || 0}
                </p>
                <p className="text-sm">
                  私有文档: {documents?.filter(doc => !doc.isPublic).length || 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 搜索功能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            知识库搜索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="搜索知识库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searchQuery.length <= 2}>
              搜索
            </Button>
          </div>
          {searchResults && searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">搜索结果:</h3>
              {searchResults.map((result) => (
                <div key={result.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{result.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.content}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{result.type}</Badge>
                        {result.category && <Badge variant="secondary">{result.category}</Badge>}
                        {result.similarity && (
                          <Badge variant="default">
                            相似度: {(result.similarity * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 文档列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            知识库文档 ({documents?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents?.map((doc) => (
              <div key={doc.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                      {doc.content}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline">{doc.type}</Badge>
                      {doc.category && <Badge variant="secondary">{doc.category}</Badge>}
                      {doc.isPublic && <Badge variant="default">公开</Badge>}
                      {doc.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {doc.source && (
                      <p className="text-xs text-muted-foreground mt-2">
                        来源: {doc.source}
                      </p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除文档 &quot;{doc.title}&quot; 吗？此操作不可撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)}>
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {!documents?.length && (
              <div className="text-center py-8 text-muted-foreground">
                暂无知识库文档，点击&quot;添加文档&quot;开始创建
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}