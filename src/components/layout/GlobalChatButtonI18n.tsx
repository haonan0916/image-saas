"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatDialog } from "@/components/feature/ChatDialog";
import { useLocale } from "@/hooks/useLocale";

export function GlobalChatButtonI18n() {
    const [isOpen, setIsOpen] = useState(false);
    const { dict } = useLocale();

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
                size="icon"
            >
                <MessageCircle className="h-6 w-6" />
                <span className="sr-only">{dict.chat.title}</span>
            </Button>

            <ChatDialog open={isOpen} onOpenChange={setIsOpen} />
        </>
    );
}