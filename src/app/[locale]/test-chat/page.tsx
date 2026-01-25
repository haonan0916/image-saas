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
import { useParams } from "next/navigation";
import { Locale } from "@/dictionaries";
import { getDictionarySync } from "@/lib/dictionaries";
import { useLocale } from "@/hooks/useLocale";

export default function TestChatPage() {
    const { dict } = useLocale();
    const { data: session, status } = useSession();
    const params = useParams();
    const locale = params.locale as Locale;
    const dict = getDictionarySync(locale);

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
        if (connected === undefined) return dict.common.loading;
        return connected ? (locale === 'zh' ? dict.chat.connected : "Connected") : (locale === 'zh' ? "连接失败" : "Connection Failed");
    };

    return (
        <div className="container mx-auto p-8 space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-4">{dict.chat.title}</h1>
                <p className="text-muted-foreground">
                    {locale === 'zh' ? "测试与 Ollama 的连接和聊天功能" : "Test connection and chat functionality with Ollama"}
                </p>
            </div>

            {/* 用户认证状态 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {locale === 'zh' ? "用户认证状态" : "User Authentication Status"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {status === "loading" ? (
                        <p>{dict.common.loading}</p>
                    ) : session ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {locale === 'zh' ? "已登录" : "Logged In"}
                                </Badge>
                                <span>{locale === 'zh' ? "欢迎，" : "Welcome, "}{session.user?.name || session.user?.email}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => signOut()} variant="outline" size="sm">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    dict.navigation.logout
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-red-600">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {locale === 'zh' ? "未登录" : "Not Logged In"}
                                </Badge>
                                <span>{locale === 'zh' ? "需要登录才能使用聊天功能" : "Login required to use chat functionality"}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => signIn("github")} size="sm">
                                    <LogIn className="h-4 w-4 mr-2" />
                                    {locale === 'zh' ? "GitHub 登录" : "GitHub Login"}
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
                            {locale === 'zh' ? "Ollama 连接状态" : "Ollama Connection Status"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                {getStatusIcon(connectionStatus?.connected)}
                                <span>{getStatusText(connectionStatus?.connected)}</span>
                                {connectionStatus?.model && (
                                    <Badge variant="outline">
                                        {locale === 'zh' ? "模型: " : "Model: "}{connectionStatus.model}
                                    </Badge>
                                )}
                            </div>

                            {connectionStatus && 'error' in connectionStatus && connectionStatus.error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-700 text-sm">
                                        <strong>{dict.common.error}:</strong> {connectionStatus.error}
                                    </p>
                                </div>
                            )}

                            <Button onClick={handleTestConnection} size="sm" variant="outline">
                                {locale === 'zh' ? "重新检查连接" : "Recheck Connection"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 悬浮聊天按钮 (仅在登录时显示) */}
            {session && (
                <div className="fixed bottom-6 right-6">
                    <ChatFloatingButton userId={session.user.id} />
                </div>
            )}
        </div>
    );
}