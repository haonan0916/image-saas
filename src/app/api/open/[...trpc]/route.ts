import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";
import { openRouter } from "@/server/open-router";

const handler = async (request: NextRequest) => {
  const res = await fetchRequestHandler({
    endpoint: "/api/open",
    router: openRouter,
    req: request,
    createContext: () => ({}),
  });

  res.headers.append("Access-Control-Allow-Origin", "*");
  res.headers.append("Access-Control-Allow-Methods", "*");
  res.headers.append("Access-Control-Allow-Headers", "*");
  return res;
};

export function OPTIONS() {
  const res = new Response("", {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
    },
  });
  return res;
}

export { handler as GET, handler as POST };
