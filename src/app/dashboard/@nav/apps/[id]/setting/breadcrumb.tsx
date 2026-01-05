"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpcClientReact } from "@/utils/api";
import Link from "next/link";
import { Home } from "lucide-react";

export function BreadCrumb({ id, leaf }: { id: string; leaf: string }) {
  const { data: apps, isPending } = trpcClientReact.app.listApps.useQuery();

  const currentApp = apps?.find((app) => app.id === id);
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
        <li className="inline-flex items-center">
          <Link
            href={`/dashboard/apps/${id}`}
            className="inline-flex items-center text-sm font-medium text-body hover:text-fg-brand"
          >
            <Home></Home>
          </Link>
        </li>
        <li className="inline-flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger>
              {isPending ? "Loading..." : currentApp?.name || "..."}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {apps?.map((app) => (
                <DropdownMenuItem key={app.id} disabled={app.id === id}>
                  <Link href={`/dashboard/apps/${app.id}`}>{app.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
        <li aria-current="page">
          <div className="flex items-center space-x-1.5">
            <svg
              className="w-3.5 h-3.5 rtl:rotate-180 text-body"
              aria-hidden={true}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m9 5 7 7-7 7"
              />
            </svg>
            <span className="inline-flex items-center text-sm font-medium text-body-subtle">
              {leaf}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  );
}
