import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { apps, files } from "./schema";

export const fileSchema = createSelectSchema(files);

export const filesCanOrderByColumns = fileSchema.pick({
  createdAt: true,
  deletedAt: true,
});

export const createAppSchema = createInsertSchema(apps, {
  name: (schema) => schema.min(3),
});
