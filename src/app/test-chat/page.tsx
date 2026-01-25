"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatFloatingButton } from "@/components/feature/ChatFloatingButton";
import { trpcClientReact } from "@/utils/api";
import { Badge } from "@/components/ui/badge";
import {
    MessageCircle,
    User,
    LogIn,
    LogOut,
    CheckCircle,
    XCircle,
    AlertCircle,
    Bot
} from "lucide-react";

export default function TestChatPage() {
    const { data: session, status } = useSession();

    // 检查连接状态
    const { data: connectionStatus, refetch: refetchConnection } = trpcClientReact.chat.checkConnection.useQuery(
        undefined,
        { enabled: !!session }
    );

    // 获取可用模型
    const { data: modelsData, refetch: refetchModels } = trpcClientReact.chat.getAvailableModels.useQuery(
        undefined,
        { enabled: !!session }
    );

    const handleTestConnection = async () => {
        await refetchConnection();
        await refetchModels();
    };

    const getStatusIcon = (connected: boolean | undefined) => {
        if (connected === undefined) return <AlertCircle className="h-4 w-4 text-gray-400" />;
        return connected ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
    };

    const getStatusText = (connected: boolean | undefined) => {
        if (connected === undefined) return "检查中...";
        return connected ? "已连接" : "连接失败";
    };

    return (
        <div className="container mx-auto p-8 space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-4">AI 聊天功能测试</h1>
                <p className="text-muted-foreground">
                    测试与 Ollama 的连接和聊天功能
                </p>
            </div>

            {/* 用户认证状态 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        用户认证状态
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {status === "loading" ? (
                        <p>加载中...</p>
                    ) : session ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    已登录
                                </Badge>
                                <span>欢迎，{session.user?.name || session.user?.email}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => signOut()} variant="outline" size="sm">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    退出登录
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-red-600">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    未登录
                                </Badge>
                                <span>需要登录才能使用聊天功能</span>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => signIn("github")} size="sm">
                                    <LogIn className="h-4 w-4 mr-2" />
                                    GitHub 登录
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Ollama 连接状态 */}
            {session && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            Ollama 连接状态
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                {getStatusIcon(connectionStatus?.connected)}
                                <span>{getStatusText(connectionStatus?.connected)}</span>
                                {connectionStatus?.model && (
                                    <Badge variant="outline">
                                        模型: {connectionStatus.model}
                                    </Badge>
                                )}
                            </div>

                            {connectionStatus && 'error' in connectionStatus && connectionStatus.error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-700 text-sm">
                                        <strong>错误:</strong> {connectionStatus.error}
                                    </p>
                                </div>
                            )}

                            <Button onClick={handleTestConnection} size="sm" variant="outline">
                                重新检查连接
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 可用模型 */}
            {session && modelsData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            可用模型
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">当前模型:</p>
                                <Badge variant="default">{modelsData.currentModel}</Badge>
                            </div>

                            {modelsData.models.length > 0 ? (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        检测到的模型 ({modelsData.models.length}):
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {modelsData.models.map((model) => (
                                            <Badge key={model} variant="outline">
                                                {model}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-yellow-700 text-sm">
                                        未检测到可用模型。请确保 Ollama 正在运行并已安装模型。
                                    </p>
                                </div>
                            )}

                            {modelsData.error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-700 text-sm">
                                        <strong>错误:</strong> {modelsData.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 使用说明 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        使用说明
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium mb-2">聊天功能特性:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                <li>悬浮聊天按钮，点击即可开始对话</li>
                                <li>支持多个聊天会话，可以创建、删除和重命名</li>
                                <li>实时连接状态检查</li>
                                <li>支持 Ollama 本地大模型</li>
                                <li>消息历史记录保存</li>
                                <li>响应式设计，支持桌面和移动设备</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-medium mb-2">Ollama 设置:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                <li>确保 Ollama 服务正在运行 (默认端口: 11434)</li>
                                <li>安装所需的模型: <code className="bg-muted px-1 rounded">ollama pull qwen2.5:0.5b</code></li>
                                <li>检查模型列表: <code className="bg-muted px-1 rounded">ollama list</code></li>
                                <li>启动服务: <code className="bg-muted px-1 rounded">ollama serve</code></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-medium mb-2">故障排除:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                <li>如果连接失败，请检查 Ollama 服务是否正在运行</li>
                                <li>确保防火墙没有阻止 11434 端口</li>
                                <li>检查模型是否正确安装</li>
                                <li>查看浏览器控制台获取详细错误信息</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 悬浮聊天按钮 (仅在登录时显示) */}
            {session && (
                <div className="fixed bottom-6 right-6">
                    <ChatFloatingButton userId={session.user.id} />
                </div>
            )}
        </div>
    );
}