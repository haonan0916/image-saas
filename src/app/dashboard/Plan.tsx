"use client";
import { trpcClientReact } from "@/utils/api";

export function Plan() {
  const { data: plan } = trpcClientReact.user.getPlan.useQuery(void 0, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  return (
    <span className="absolute -right-3 top-0 bg-gray-500 rounded-md text-xs inline-block px-2">
      {plan ?? "..."}
    </span>
  );
}
