import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { OpenRouter } from "@/server/open-router";
import type { TRPCClient } from "@trpc/client";

// 适用于在非 React 环境中调用 api
export const apiClient: TRPCClient<OpenRouter> = createTRPCClient<OpenRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
    }),
  ],
});

export { OpenRouter };
