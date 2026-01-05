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

export default function AppDashboardNav({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: apps, isPending } = trpcClientReact.app.listApps.useQuery();

  const currentApp = apps?.find((app) => app.id === id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          {isPending ? "Loading..." : currentApp?.name || "..."}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {apps?.map((app) => (
          <DropdownMenuItem key={app.id} disabled={app.id === id}>
            <Link href={`/dashboard/apps/${app.id}`}>{app.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
