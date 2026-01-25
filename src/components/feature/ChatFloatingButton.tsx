"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatDialog } from "./ChatDialog";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";

interface ChatFloatingButtonProps {
    userId?: string;
    className?: string;
}

export function ChatFloatingButton({ userId, className }: ChatFloatingButtonProps) {
  const { dict } = useLocale();
    const [isOpen, setIsOpen] = useState(false);

    if (!userId) {
        return null;
    }

    return (
        <>
            {/* 悬浮按钮 */}
            <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
                    "bg-blue-600 hover:bg-blue-700 text-white",
                    "transition-all duration-200 hover:scale-110",
                    className
                )}
                size="icon"
            >
                <MessageCircle className="h-6 w-6" />
            </Button>

            {/* 聊天对话框 */}
            <ChatDialog
                open={isOpen}
                onOpenChange={setIsOpen}
            />
        </>
    );
}