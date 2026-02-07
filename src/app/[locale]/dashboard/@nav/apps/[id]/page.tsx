"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpcClientReact } from "@/utils/api";
import Link from "next/link";
import { use } from "react";
import { useLocale } from "@/hooks/useLocale";
import { useParams } from "next/navigation";
import { Locale } from "@/dictionaries";

export default function AppDashboardNav({ params, }: {
  params: Promise<{ id: string }>;
}) {
  // 先调用所有 hooks
  const { dict } = useLocale();
  const param = useParams();
  const { data: apps, isPending } = trpcClientReact.app.listApps.useQuery();

  // 然后使用 use() 解析 Promise
  const locale = param.locale as Locale;
  const { id } = use(params);

  const currentApp = apps?.find((app) => app.id === id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          {isPending ? dict.common.loading : currentApp?.name || "..."}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {apps?.map((app) => (
          <DropdownMenuItem key={app.id} disabled={app.id === id}>
            <Link href={`/${locale}/dashboard/apps/${app.id}`}>{app.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
