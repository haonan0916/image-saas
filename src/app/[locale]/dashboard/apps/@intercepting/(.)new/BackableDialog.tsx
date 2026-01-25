"use client";

import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

export default function BackableDialog({ children, }: {
  children: React.ReactNode;
}) {
  const { dict } = useLocale();
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={() => {
        router.back();
      }}
    >
      {children}
    </Dialog>
  );
}
