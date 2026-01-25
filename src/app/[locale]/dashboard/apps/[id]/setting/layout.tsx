"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { use } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

export default function SettingLayout({ params,
  children, }: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { dict } = useLocale();
  const { id } = use(params);
  const path = usePathname();
  return (
    <div className="flex justify-start container mx-auto">
      <div className="flex flex-col gap-4 w-60 shrink-0 pt-10">
        <Button
          size="lg"
          asChild={path !== `/dashboard/apps/${id}/setting/storage`}
          variant={
            path === `/dashboard/apps/${id}/setting/storage`
              ? "outline"
              : "ghost"
          }
          disabled={path === `/dashboard/apps/${id}/setting/storage`}
        >
          {path !== `/dashboard/apps/${id}/setting/storage` ? (
            <Link href={`/dashboard/apps/${id}/setting/storage`}>Storage</Link>
          ) : (
            "Storage"
          )}
        </Button>
        <Button
          size="lg"
          asChild={path !== `/dashboard/apps/${id}/setting/api-key`}
          variant={
            path === `/dashboard/apps/${id}/setting/api-key`
              ? "outline"
              : "ghost"
          }
          disabled={path === `/dashboard/apps/${id}/setting/api-key`}
        >
          {path !== `/dashboard/apps/${id}/setting/api-key` ? (
            <Link href={`/dashboard/apps/${id}/setting/api-key`}>Api Key</Link>
          ) : (
            "Api Key"
          )}
        </Button>
      </div>
      <div className="grow pl-4">{children}</div>
    </div>
  );
}
