import { relations } from "drizzle-orm";
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  uuid,
  varchar,
  index,
  unique,
  serial,
  json,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  plan: text("plan", { enum: ["free", "payed"] }),
  image: text("image"),
});

export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
  app: many(apps),
  storages: many(storageConfiguration),
  datasets: many(datasets),
  models: many(models),
  datasetImages: many(datasetImages),
  dehazeTasks: many(dehazeTasks),
  chatSessions: many(chatSessions),
  knowledgeBase: many(knowledgeBase),
  ragQueries: many(ragQueries),
}));

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ]
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ]
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").notNull().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    path: varchar("path", { length: 1024 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    userId: text("user_id").notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    appId: uuid("app_id").notNull(),
  },
  (table) => ({
    cursorIdx: index("cursor_idx").on(table.id, table.createdAt),
  })
);

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, { fields: [files.userId], references: [users.id] }),
  app: one(apps, { fields: [files.appId], references: [apps.id] }),
}));

export const apps = pgTable(
  "apps",
  {
    id: uuid("id").notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    userId: text("user_id").notNull(),
    storageId: integer("storage_id"),
  },
  (app) => ({
    compoundNameKey: unique().on(app.id, app.name),
  })
);

export const appRelations = relations(apps, ({ one, many }) => ({
  user: one(users, { fields: [apps.userId], references: [users.id] }),
  storage: one(storageConfiguration, {
    fields: [apps.storageId],
    references: [storageConfiguration.id],
  }),
  files: many(files),
  apiKeys: many(apiKeys),
  datasets: many(datasets),
  models: many(models),
  dehazeTasks: many(dehazeTasks),
}));

export type S3StorageConfiguration = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  apiEndpoint?: string;
};

export type StorageConfiguration = S3StorageConfiguration;

export const storageConfiguration = pgTable("storageConfiguration", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  userId: text("user_id").notNull(),
  configuration: json("configuration")
    .$type<S3StorageConfiguration>()
    .notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const storageConfigurationRelations = relations(
  storageConfiguration,
  ({ one }) => ({
    user: one(users, {
      fields: [storageConfiguration.userId],
      references: [users.id],
    }),
  })
);

export const apiKeys = pgTable("apiKeys", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: varchar("client_id", { length: 100 }).notNull().unique(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  appId: uuid("app_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  app: one(apps, {
    fields: [apiKeys.appId],
    references: [apps.id],
  }),
}));

// 数据集表
export const datasets = pgTable("datasets", {
  id: uuid("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  type: varchar("type", { length: 50 }).notNull().default("custom"), // 'system' | 'custom'
  tags: json("tags").$type<string[]>().default([]),
  imageCount: integer("image_count").notNull().default(0),
  appId: uuid("app_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const datasetsRelations = relations(datasets, ({ one, many }) => ({
  app: one(apps, { fields: [datasets.appId], references: [apps.id] }),
  user: one(users, { fields: [datasets.userId], references: [users.id] }),
  images: many(datasetImages),
}));

// 数据集图片表
export const datasetImages = pgTable("dataset_images", {
  id: uuid("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  originalUrl: varchar("original_url", { length: 1024 }).notNull(),
  processedUrl: varchar("processed_url", { length: 1024 }),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  datasetId: uuid("dataset_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const datasetImagesRelations = relations(datasetImages, ({ one }) => ({
  dataset: one(datasets, { fields: [datasetImages.datasetId], references: [datasets.id] }),
  user: one(users, { fields: [datasetImages.userId], references: [users.id] }),
}));

// 模型表
export const models = pgTable("models", {
  id: uuid("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  type: varchar("type", { length: 50 }).notNull().default("custom"), // 'system' | 'custom'
  category: varchar("category", { length: 100 }).notNull(), // 'general' | 'high_fidelity' | 'fast_processing'
  version: varchar("version", { length: 50 }).notNull().default("1.0.0"),
  fileUrl: varchar("file_url", { length: 1024 }),
  fileSize: integer("file_size"),
  format: varchar("format", { length: 50 }), // 'pth' | 'onnx' | 'pb'
  isDefault: boolean("is_default").notNull().default(false),
  appId: uuid("app_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const modelsRelations = relations(models, ({ one }) => ({
  app: one(apps, { fields: [models.appId], references: [apps.id] }),
  user: one(users, { fields: [models.userId], references: [users.id] }),
}));

// 去雾任务表
export const dehazeTasks = pgTable("dehaze_tasks", {
  id: uuid("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  datasetId: uuid("dataset_id").notNull(),
  modelId: uuid("model_id").notNull(),
  inputImageIds: json("input_image_ids").$type<string[]>().notNull(),
  outputImageIds: json("output_image_ids").$type<string[]>().default([]),
  processingTime: integer("processing_time"), // 处理时间(秒)
  errorMessage: text("error_message"),
  appId: uuid("app_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

export const dehazeTasksRelations = relations(dehazeTasks, ({ one }) => ({
  app: one(apps, { fields: [dehazeTasks.appId], references: [apps.id] }),
  user: one(users, { fields: [dehazeTasks.userId], references: [users.id] }),
  dataset: one(datasets, { fields: [dehazeTasks.datasetId], references: [datasets.id] }),
  model: one(models, { fields: [dehazeTasks.modelId], references: [models.id] }),
}));
// Chat 会话表
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").notNull().primaryKey(),
  title: varchar("title", { length: 255 }).notNull().default("新对话"),
  userId: text("user_id").notNull(),
  model: varchar("model", { length: 100 }).notNull().default("qwen2.5:0.5b"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  messages: many(chatMessages),
}));

// Chat 消息表
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").notNull().primaryKey(),
  sessionId: uuid("session_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] }),
}));

// RAG 知识库表
export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid("id").notNull().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("document"), // 'document' | 'api' | 'guide' | 'faq'
  category: varchar("category", { length: 100 }), // 'system' | 'api' | 'usage' | 'troubleshooting'
  tags: json("tags").$type<string[]>().default([]),
  source: varchar("source", { length: 255 }), // 来源文件或URL
  embedding: json("embedding").$type<number[]>(), // 向量嵌入
  userId: text("user_id").notNull(),
  isPublic: boolean("is_public").notNull().default(false), // 是否为公共知识
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
  user: one(users, { fields: [knowledgeBase.userId], references: [users.id] }),
}));

// RAG 查询历史表
export const ragQueries = pgTable("rag_queries", {
  id: uuid("id").notNull().primaryKey(),
  query: text("query").notNull(),
  retrievedDocs: json("retrieved_docs").$type<string[]>().notNull(), // 检索到的文档ID列表
  response: text("response").notNull(),
  sessionId: uuid("session_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const ragQueriesRelations = relations(ragQueries, ({ one }) => ({
  session: one(chatSessions, { fields: [ragQueries.sessionId], references: [chatSessions.id] }),
  user: one(users, { fields: [ragQueries.userId], references: [users.id] }),
}));