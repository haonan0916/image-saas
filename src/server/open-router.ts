import { router } from "./trpc";
import { fileOpenRoutes } from "./routes/file-open";

export const openRouter = router({
  file: fileOpenRoutes,
});

export type OpenRouter = typeof openRouter;
