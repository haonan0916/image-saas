import { appRouter } from "@/server/router";
import { createCallerFactory } from "@trpc/server/unstable-core-do-not-import";

export const serverCaller = createCallerFactory()(appRouter);
