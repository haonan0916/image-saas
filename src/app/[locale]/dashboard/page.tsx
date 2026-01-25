"use client";

import { trpcClientReact } from "@/utils/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Locale } from "@/dictionaries";
import { getDictionarySync } from "@/lib/dictionaries";

export default function DashboardAppList() {
  const params = useParams();
  const locale = params.locale as Locale;
  const dict = getDictionarySync(locale);
  
  const getAppsResult = trpcClientReact.app.listApps.useQuery(void 0, {
    gcTime: Infinity,
    staleTime: Infinity,
  });

  const { data: apps, isLoading } = getAppsResult;

  return (
    <div className="w-fit mx-auto pt-10">
      {isLoading ? (
        <div>{dict.common.loading}</div>
      ) : (
        <div className="flex w-full max-w-lg flex-col gap-2 rounded-md border p-2">
          {apps?.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between gap-6"
            >
              <div>
                <h2 className="text-xl">{app.name}</h2>
                <p className="text-base-content/60">
                  {app.description ? app.description : dict.common.noDescription}
                </p>
              </div>
              <div>
                <Button asChild variant="destructive">
                  <Link href={`/${locale}/dashboard/apps/${app.id}`}>{dict.common.go}</Link>
                </Button>
              </div>
            </div>
          ))}
          <Button asChild>
            <Link href={`/${locale}/dashboard/apps/new`}>{dict.dashboard.createApp}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
