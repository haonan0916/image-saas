"use client";

import { useSession } from "next-auth/react";
import { ChatFloatingButton } from "@/components/feature/ChatFloatingButton";
import { useLocale } from "@/hooks/useLocale";

export function GlobalChatButton() {
  const { dict } = useLocale();
const { data: session } = useSession();

    if (!session?.user?.id) {
        return null;
    }

    return <ChatFloatingButton userId={session.user.id} />;
}