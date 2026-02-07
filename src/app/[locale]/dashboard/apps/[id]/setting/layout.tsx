"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { use } from "react";
import { usePathname } from "next/navigation";
import { useParams } from "next/navigation";
import { Locale } from "@/dictionaries";

export default function SettingLayout({ params,
  children, }: {
    params: Promise<{ id: string }>;
    children: React.ReactNode;
  }) {
  // 先调用所有 hooks
  const param = useParams();
  const path = usePathname();

  // 然后使用 use() 解析 Promise 和其他非 hook 操作
  const locale = param.locale as Locale;
  const { id } = use(params);
  return (
    <div className="flex justify-start container mx-auto">
      <div className="flex flex-col gap-4 w-60 shrink-0 pt-10">
        <Button
          size="lg"
          asChild={path !== `/${locale}/dashboard/apps/${id}/setting/storage`}
          variant={
            path === `/${locale}/dashboard/apps/${id}/setting/storage`
              ? "outline"
              : "ghost"
          }
          disabled={path === `/${locale}/dashboard/apps/${id}/setting/storage`}
        >
          {path !== `/${locale}/dashboard/apps/${id}/setting/storage` ? (
            <Link href={`/${locale}/dashboard/apps/${id}/setting/storage`}>Storage</Link>
          ) : (
            "Storage"
          )}
        </Button>
        <Button
          size="lg"
          asChild={path !== `/${locale}/dashboard/apps/${id}/setting/api-key`}
          variant={
            path === `/${locale}/dashboard/apps/${id}/setting/api-key`
              ? "outline"
              : "ghost"
          }
          disabled={path === `/${locale}/dashboard/apps/${id}/setting/api-key`}
        >
          {path !== `/${locale}/dashboard/apps/${id}/setting/api-key` ? (
            <Link href={`/${locale}/dashboard/apps/${id}/setting/api-key`}>Api Key</Link>
          ) : (
            "Api Key"
          )}
        </Button>
      </div>
      <div className="grow pl-4">{children}</div>
    </div>
  );
}
