"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Plus } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface ChatDialogI18nProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChatDialogI18n({ open, onOpenChange }: ChatDialogI18nProps) {
    const { locale, dict } = useLocale();
    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (message.trim()) {
            // 这里可以添加发送消息的逻辑
            console.log("Sending message:", message);
            setMessage("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        {dict.chat.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col gap-4">
                    {/* 聊天会话列表 */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">
                                {locale === 'zh' ? "聊天会话" : "Chat Sessions"}
                            </h3>
                            <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                {locale === 'zh' ? "新建会话" : "New Session"}
                            </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {locale === 'zh' ? "暂无会话" : "No sessions yet"}
                        </div>
                    </div>

                    {/* 消息区域 */}
                    <div className="flex-1 border rounded-lg p-4">
                        <div className="text-center text-muted-foreground">
                            {locale === 'zh' ? "开始新的对话" : "Start a new conversation"}
                        </div>
                    </div>

                    {/* 输入区域 */}
                    <div className="flex gap-2">
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={dict.chat.placeholder}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <Button onClick={handleSend} size="sm">
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}