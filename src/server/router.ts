import { router } from "./trpc";
import { fileRoutes } from "./routes/file";
import { appRouters } from "./routes/apps";
import { storagesRouters } from "./routes/storages";
import { apiKeysRouters } from "./routes/apiKeys";
import { userRouters } from "./routes/user";

export const appRouter = router({
  file: fileRoutes,
  app: appRouters,
  storage: storagesRouters,
  apiKeys: apiKeysRouters,
  user: userRouters,
});

export type AppRouter = typeof appRouter;
