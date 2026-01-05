import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { type OpenRouter } from "./open-router-dts";

// 适用于在非 React 环境中调用 api
export const apiClient = createTRPCClient<OpenRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/open",
    }),
  ],
});

export const createApiClient = ({
  apiKey,
  signedToken,
}: {
  apiKey?: string;
  signedToken?: string;
}) => {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["api-key"] = apiKey;
  }
  if (signedToken) {
    headers["signed-token"] = signedToken;
  }
  return createTRPCClient<OpenRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/api/open",
        headers,
      }),
    ],
  });
};

export { OpenRouter };
