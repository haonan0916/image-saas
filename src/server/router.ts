import { router } from "./trpc";
import { fileRoutes } from "./routes/file";
import { appRouters } from "./routes/apps";
import { storagesRouters } from "./routes/storages";
import { apiKeysRouters } from "./routes/apiKeys";
import { userRouters } from "./routes/user";
import { datasetsRouters } from "./routes/datasets";
import { modelsRouters } from "./routes/models";
import { dehazeTasksRouters } from "./routes/dehaze-tasks";
import { chatRoutes } from "./routes/chat";
import { ragRoutes } from "./routes/rag";

export const appRouter = router({
  file: fileRoutes,
  app: appRouters,
  storage: storagesRouters,
  apiKeys: apiKeysRouters,
  user: userRouters,
  datasets: datasetsRouters,
  models: modelsRouters,
  dehazeTasks: dehazeTasksRouters,
  chat: chatRoutes, // Original Ollama-only chat routes
  rag: ragRoutes, // RAG knowledge base routes
});

export type AppRouter = typeof appRouter;
