"use client";

import { useSession } from "next-auth/react";
import { ChatFloatingButton } from "@/components/feature/ChatFloatingButton";

export function GlobalChatButton() {
    const { data: session } = useSession();

    if (!session?.user?.id) {
        return null;
    }

    return <ChatFloatingButton userId={session.user.id} />;
}