"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __await = function(promise, isYieldStar) {
  this[0] = promise;
  this[1] = isYieldStar;
};
var __asyncGenerator = (__this, __arguments, generator) => {
  var resume = (k, v, yes, no) => {
    try {
      var x = generator[k](v), isAwait = (v = x.value) instanceof __await, done = x.done;
      Promise.resolve(isAwait ? v[0] : v).then((y) => isAwait ? resume(k === "return" ? k : "next", v[1] ? { done: y.done, value: y.value } : y, yes, no) : yes({ value: y, done })).catch((e) => resume("throw", e, yes, no));
    } catch (e) {
      no(e);
    }
  }, method = (k) => it[k] = (x) => new Promise((yes, no) => resume(k, x, yes, no)), it = {};
  return generator = generator.apply(__this, __arguments), it[__knownSymbol("asyncIterator")] = () => it, method("next"), method("throw"), method("return"), it;
};
var __forAwait = (obj, it, method) => (it = obj[__knownSymbol("asyncIterator")]) ? it.call(obj) : (obj = obj[__knownSymbol("iterator")](), it = {}, method = (key, fn) => (fn = obj[key]) && (it[key] = (arg) => new Promise((yes, no, done) => (arg = fn.call(obj, arg), done = arg.done, Promise.resolve(arg.value).then((value) => yes({ value, done }), no)))), method("next"), method("return"), it);

// src/server/db/db.ts
var import_config = require("dotenv/config");
var import_node_postgres = require("drizzle-orm/node-postgres");

// src/server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  apiKeys: () => apiKeys,
  apiKeysRelations: () => apiKeysRelations,
  appRelations: () => appRelations,
  apps: () => apps,
  authenticators: () => authenticators,
  chatMessages: () => chatMessages,
  chatMessagesRelations: () => chatMessagesRelations,
  chatSessions: () => chatSessions,
  chatSessionsRelations: () => chatSessionsRelations,
  datasetImages: () => datasetImages,
  datasetImagesRelations: () => datasetImagesRelations,
  datasets: () => datasets,
  datasetsRelations: () => datasetsRelations,
  dehazeTasks: () => dehazeTasks,
  dehazeTasksRelations: () => dehazeTasksRelations,
  files: () => files,
  filesRelations: () => filesRelations,
  knowledgeBase: () => knowledgeBase,
  knowledgeBaseRelations: () => knowledgeBaseRelations,
  models: () => models,
  modelsRelations: () => modelsRelations,
  ragQueries: () => ragQueries,
  ragQueriesRelations: () => ragQueriesRelations,
  sessions: () => sessions,
  storageConfiguration: () => storageConfiguration,
  storageConfigurationRelations: () => storageConfigurationRelations,
  users: () => users,
  usersRelations: () => usersRelations,
  verificationTokens: () => verificationTokens
});
var import_drizzle_orm = require("drizzle-orm");
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("user", {
  id: (0, import_pg_core.text)("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: (0, import_pg_core.text)("name"),
  email: (0, import_pg_core.text)("email").unique(),
  emailVerified: (0, import_pg_core.timestamp)("emailVerified", { mode: "date" }),
  plan: (0, import_pg_core.text)("plan", { enum: ["free", "payed"] }),
  image: (0, import_pg_core.text)("image")
});
var usersRelations = (0, import_drizzle_orm.relations)(users, ({ many }) => ({
  files: many(files),
  app: many(apps),
  storages: many(storageConfiguration),
  datasets: many(datasets),
  models: many(models),
  datasetImages: many(datasetImages),
  dehazeTasks: many(dehazeTasks),
  chatSessions: many(chatSessions),
  knowledgeBase: many(knowledgeBase),
  ragQueries: many(ragQueries)
}));
var accounts = (0, import_pg_core.pgTable)(
  "account",
  {
    userId: (0, import_pg_core.text)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: (0, import_pg_core.text)("type").$type().notNull(),
    provider: (0, import_pg_core.text)("provider").notNull(),
    providerAccountId: (0, import_pg_core.text)("providerAccountId").notNull(),
    refresh_token: (0, import_pg_core.text)("refresh_token"),
    access_token: (0, import_pg_core.text)("access_token"),
    expires_at: (0, import_pg_core.integer)("expires_at"),
    token_type: (0, import_pg_core.text)("token_type"),
    scope: (0, import_pg_core.text)("scope"),
    id_token: (0, import_pg_core.text)("id_token"),
    session_state: (0, import_pg_core.text)("session_state")
  },
  (account) => [
    {
      compoundKey: (0, import_pg_core.primaryKey)({
        columns: [account.provider, account.providerAccountId]
      })
    }
  ]
);
var sessions = (0, import_pg_core.pgTable)("session", {
  sessionToken: (0, import_pg_core.text)("sessionToken").primaryKey(),
  userId: (0, import_pg_core.text)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: (0, import_pg_core.timestamp)("expires", { mode: "date" }).notNull()
});
var verificationTokens = (0, import_pg_core.pgTable)(
  "verificationToken",
  {
    identifier: (0, import_pg_core.text)("identifier").notNull(),
    token: (0, import_pg_core.text)("token").notNull(),
    expires: (0, import_pg_core.timestamp)("expires", { mode: "date" }).notNull()
  },
  (verificationToken) => [
    {
      compositePk: (0, import_pg_core.primaryKey)({
        columns: [verificationToken.identifier, verificationToken.token]
      })
    }
  ]
);
var authenticators = (0, import_pg_core.pgTable)(
  "authenticator",
  {
    credentialID: (0, import_pg_core.text)("credentialID").notNull().unique(),
    userId: (0, import_pg_core.text)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: (0, import_pg_core.text)("providerAccountId").notNull(),
    credentialPublicKey: (0, import_pg_core.text)("credentialPublicKey").notNull(),
    counter: (0, import_pg_core.integer)("counter").notNull(),
    credentialDeviceType: (0, import_pg_core.text)("credentialDeviceType").notNull(),
    credentialBackedUp: (0, import_pg_core.boolean)("credentialBackedUp").notNull(),
    transports: (0, import_pg_core.text)("transports")
  },
  (authenticator) => [
    {
      compositePK: (0, import_pg_core.primaryKey)({
        columns: [authenticator.userId, authenticator.credentialID]
      })
    }
  ]
);
var files = (0, import_pg_core.pgTable)(
  "files",
  {
    id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
    name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
    type: (0, import_pg_core.varchar)("type", { length: 100 }).notNull(),
    createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
    deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" }),
    path: (0, import_pg_core.varchar)("path", { length: 1024 }).notNull(),
    url: (0, import_pg_core.varchar)("url", { length: 1024 }).notNull(),
    userId: (0, import_pg_core.text)("user_id").notNull(),
    contentType: (0, import_pg_core.varchar)("content_type", { length: 100 }).notNull(),
    appId: (0, import_pg_core.uuid)("app_id").notNull()
  },
  (table) => ({
    cursorIdx: (0, import_pg_core.index)("cursor_idx").on(table.id, table.createdAt)
  })
);
var filesRelations = (0, import_drizzle_orm.relations)(files, ({ one }) => ({
  user: one(users, { fields: [files.userId], references: [users.id] }),
  app: one(apps, { fields: [files.appId], references: [apps.id] })
}));
var apps = (0, import_pg_core.pgTable)(
  "apps",
  {
    id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
    name: (0, import_pg_core.varchar)("name", { length: 100 }).notNull(),
    description: (0, import_pg_core.varchar)("description", { length: 500 }),
    deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" }),
    createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
    userId: (0, import_pg_core.text)("user_id").notNull(),
    storageId: (0, import_pg_core.integer)("storage_id")
  },
  (app) => ({
    compoundNameKey: (0, import_pg_core.unique)().on(app.id, app.name)
  })
);
var appRelations = (0, import_drizzle_orm.relations)(apps, ({ one, many }) => ({
  user: one(users, { fields: [apps.userId], references: [users.id] }),
  storage: one(storageConfiguration, {
    fields: [apps.storageId],
    references: [storageConfiguration.id]
  }),
  files: many(files),
  apiKeys: many(apiKeys),
  datasets: many(datasets),
  models: many(models),
  dehazeTasks: many(dehazeTasks)
}));
var storageConfiguration = (0, import_pg_core.pgTable)("storageConfiguration", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 100 }).notNull(),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  configuration: (0, import_pg_core.json)("configuration").$type().notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" })
});
var storageConfigurationRelations = (0, import_drizzle_orm.relations)(
  storageConfiguration,
  ({ one }) => ({
    user: one(users, {
      fields: [storageConfiguration.userId],
      references: [users.id]
    })
  })
);
var apiKeys = (0, import_pg_core.pgTable)("apiKeys", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
  clientId: (0, import_pg_core.varchar)("client_id", { length: 100 }).notNull().unique(),
  key: (0, import_pg_core.varchar)("key", { length: 100 }).notNull().unique(),
  appId: (0, import_pg_core.uuid)("app_id").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" })
});
var apiKeysRelations = (0, import_drizzle_orm.relations)(apiKeys, ({ one }) => ({
  app: one(apps, {
    fields: [apiKeys.appId],
    references: [apps.id]
  })
}));
var datasets = (0, import_pg_core.pgTable)("datasets", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
  description: (0, import_pg_core.varchar)("description", { length: 1e3 }),
  type: (0, import_pg_core.varchar)("type", { length: 50 }).notNull().default("custom"),
  // 'system' | 'custom'
  tags: (0, import_pg_core.json)("tags").$type().default([]),
  imageCount: (0, import_pg_core.integer)("image_count").notNull().default(0),
  appId: (0, import_pg_core.uuid)("app_id").notNull(),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" })
});
var datasetsRelations = (0, import_drizzle_orm.relations)(datasets, ({ one, many }) => ({
  app: one(apps, { fields: [datasets.appId], references: [apps.id] }),
  user: one(users, { fields: [datasets.userId], references: [users.id] }),
  images: many(datasetImages)
}));
var datasetImages = (0, import_pg_core.pgTable)("dataset_images", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
  originalUrl: (0, import_pg_core.varchar)("original_url", { length: 1024 }).notNull(),
  processedUrl: (0, import_pg_core.varchar)("processed_url", { length: 1024 }),
  contentType: (0, import_pg_core.varchar)("content_type", { length: 100 }).notNull(),
  size: (0, import_pg_core.integer)("size").notNull(),
  width: (0, import_pg_core.integer)("width"),
  height: (0, import_pg_core.integer)("height"),
  datasetId: (0, import_pg_core.uuid)("dataset_id").notNull(),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" })
});
var datasetImagesRelations = (0, import_drizzle_orm.relations)(datasetImages, ({ one }) => ({
  dataset: one(datasets, { fields: [datasetImages.datasetId], references: [datasets.id] }),
  user: one(users, { fields: [datasetImages.userId], references: [users.id] })
}));
var models = (0, import_pg_core.pgTable)("models", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
  description: (0, import_pg_core.varchar)("description", { length: 1e3 }),
  type: (0, import_pg_core.varchar)("type", { length: 50 }).notNull().default("custom"),
  // 'system' | 'custom'
  category: (0, import_pg_core.varchar)("category", { length: 100 }).notNull(),
  // 'general' | 'high_fidelity' | 'fast_processing'
  version: (0, import_pg_core.varchar)("version", { length: 50 }).notNull().default("1.0.0"),
  fileUrl: (0, import_pg_core.varchar)("file_url", { length: 1024 }),
  fileSize: (0, import_pg_core.integer)("file_size"),
  format: (0, import_pg_core.varchar)("format", { length: 50 }),
  // 'pth' | 'onnx' | 'pb'
  isDefault: (0, import_pg_core.boolean)("is_default").notNull().default(false),
  appId: (0, import_pg_core.uuid)("app_id").notNull(),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" })
});
var modelsRelations = (0, import_drizzle_orm.relations)(models, ({ one }) => ({
  app: one(apps, { fields: [models.appId], references: [apps.id] }),
  user: one(users, { fields: [models.userId], references: [users.id] })
}));
var dehazeTasks = (0, import_pg_core.pgTable)("dehaze_tasks", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
  status: (0, import_pg_core.varchar)("status", { length: 50 }).notNull().default("pending"),
  // 'pending' | 'processing' | 'completed' | 'failed'
  datasetId: (0, import_pg_core.uuid)("dataset_id").notNull(),
  modelId: (0, import_pg_core.uuid)("model_id").notNull(),
  inputImageIds: (0, import_pg_core.json)("input_image_ids").$type().notNull(),
  outputImageIds: (0, import_pg_core.json)("output_image_ids").$type().default([]),
  processingTime: (0, import_pg_core.integer)("processing_time"),
  // 处理时间(秒)
  errorMessage: (0, import_pg_core.text)("error_message"),
  appId: (0, import_pg_core.uuid)("app_id").notNull(),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  completedAt: (0, import_pg_core.timestamp)("completed_at", { mode: "date" })
});
var dehazeTasksRelations = (0, import_drizzle_orm.relations)(dehazeTasks, ({ one }) => ({
  app: one(apps, { fields: [dehazeTasks.appId], references: [apps.id] }),
  user: one(users, { fields: [dehazeTasks.userId], references: [users.id] }),
  dataset: one(datasets, { fields: [dehazeTasks.datasetId], references: [datasets.id] }),
  model: one(models, { fields: [dehazeTasks.modelId], references: [models.id] })
}));
var chatSessions = (0, import_pg_core.pgTable)("chat_sessions", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
  title: (0, import_pg_core.varchar)("title", { length: 255 }).notNull().default("\u65B0\u5BF9\u8BDD"),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  model: (0, import_pg_core.varchar)("model", { length: 100 }).notNull().default("qwen2.5:0.5b"),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" })
});
var chatSessionsRelations = (0, import_drizzle_orm.relations)(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  messages: many(chatMessages)
}));
var chatMessages = (0, import_pg_core.pgTable)("chat_messages", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
  sessionId: (0, import_pg_core.uuid)("session_id").notNull(),
  role: (0, import_pg_core.varchar)("role", { length: 20 }).notNull(),
  // 'user' | 'assistant' | 'system'
  content: (0, import_pg_core.text)("content").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow()
});
var chatMessagesRelations = (0, import_drizzle_orm.relations)(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] })
}));
var knowledgeBase = (0, import_pg_core.pgTable)("knowledge_base", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: (0, import_pg_core.varchar)("title", { length: 255 }),
  content: (0, import_pg_core.text)("content").notNull(),
  type: (0, import_pg_core.varchar)("type", { length: 50 }).default("document"),
  // 'document' | 'api' | 'guide' | 'faq'
  category: (0, import_pg_core.varchar)("category", { length: 100 }),
  // 'system' | 'api' | 'usage' | 'troubleshooting'
  tags: (0, import_pg_core.json)("tags").$type(),
  source: (0, import_pg_core.varchar)("source", { length: 255 }),
  // 来源文件或URL
  embedding: (0, import_pg_core.vector)("embedding", { dimensions: 1024 }),
  // 向量嵌入
  metadata: (0, import_pg_core.json)("metadata").$type(),
  // 额外的元数据，用于 LangChain
  userId: (0, import_pg_core.text)("user_id"),
  isPublic: (0, import_pg_core.boolean)("is_public").default(false),
  // 是否为公共知识
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: (0, import_pg_core.timestamp)("deleted_at", { mode: "date" })
});
var knowledgeBaseRelations = (0, import_drizzle_orm.relations)(knowledgeBase, ({ one }) => ({
  user: one(users, { fields: [knowledgeBase.userId], references: [users.id] })
}));
var ragQueries = (0, import_pg_core.pgTable)("rag_queries", {
  id: (0, import_pg_core.uuid)("id").notNull().primaryKey(),
  query: (0, import_pg_core.text)("query").notNull(),
  retrievedDocs: (0, import_pg_core.json)("retrieved_docs").$type().notNull(),
  // 检索到的文档ID列表
  response: (0, import_pg_core.text)("response").notNull(),
  sessionId: (0, import_pg_core.uuid)("session_id").notNull(),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { mode: "date" }).defaultNow()
});
var ragQueriesRelations = (0, import_drizzle_orm.relations)(ragQueries, ({ one }) => ({
  session: one(chatSessions, { fields: [ragQueries.sessionId], references: [chatSessions.id] }),
  user: one(users, { fields: [ragQueries.userId], references: [users.id] })
}));

// src/server/db/db.ts
var db = (0, import_node_postgres.drizzle)(process.env.DATABASE_URL, {
  schema: schema_exports
});

// src/server/services/ragService.ts
var import_ollama2 = require("@langchain/ollama");
var import_prompts = require("@langchain/core/prompts");
var import_output_parsers = require("@langchain/core/output_parsers");

// src/services/langchain/LangChainService.ts
var import_openai = require("@langchain/openai");
var import_anthropic = require("@langchain/anthropic");
var import_google_genai = require("@langchain/google-genai");
var import_ollama = require("@langchain/ollama");
var import_messages = require("@langchain/core/messages");
var LangChainService = class _LangChainService {
  constructor() {
  }
  static getInstance() {
    if (!_LangChainService.instance) {
      _LangChainService.instance = new _LangChainService();
    }
    return _LangChainService.instance;
  }
  /**
   * 根据 modelId 获取模型实例
   * modelId 格式: "provider/model-name"
   */
  getModel(modelId, options) {
    var _a, _b;
    let provider = "openai" /* OPENAI */;
    let modelName = modelId;
    if (modelId.includes("/")) {
      const parts = modelId.split("/");
      provider = parts[0];
      modelName = parts.slice(1).join("/");
    }
    const temperature = (_a = options.temperature) != null ? _a : 0.7;
    const maxTokens = (_b = options.maxTokens) != null ? _b : 2048;
    switch (provider.toLowerCase()) {
      case "openai" /* OPENAI */:
        return new import_openai.ChatOpenAI({
          modelName: modelName || "doubao-seed-2-0-pro-260215",
          temperature,
          maxTokens,
          apiKey: process.env.OPENAI_API_KEY,
          configuration: {
            baseURL: process.env.OPENAI_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"
          }
        });
      case "anthropic" /* ANTHROPIC */:
        return new import_anthropic.ChatAnthropic({
          modelName: modelName || "claude-3-haiku-20240307",
          temperature,
          apiKey: process.env.ANTHROPIC_API_KEY
        });
      case "google":
      case "gemini" /* GEMINI */:
        return new import_google_genai.ChatGoogleGenerativeAI({
          model: modelName || "gemini-pro",
          temperature,
          maxOutputTokens: maxTokens,
          apiKey: process.env.GOOGLE_API_KEY
        });
      case "ollama" /* OLLAMA */:
      default:
        return new import_ollama.ChatOllama({
          model: modelName || "qwen3:0.6b",
          temperature,
          baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434"
        });
    }
  }
  /**
   * 将自定义消息格式转换为 LangChain 消息格式
   */
  convertMessages(messages) {
    return messages.map((msg) => {
      switch (msg.role) {
        case "user":
          return new import_messages.HumanMessage(msg.content);
        case "assistant":
          return new import_messages.AIMessage(msg.content);
        case "system":
          return new import_messages.SystemMessage(msg.content);
        default:
          return new import_messages.HumanMessage(msg.content);
      }
    });
  }
  /**
   * 发送聊天请求
   */
  async sendMessage(request) {
    var _a;
    const modelId = request.modelId || "doubao-seed-2-0-pro-260215";
    const model = this.getModel(modelId, request.options);
    const messages = this.convertMessages(request.messages);
    const response = await model.invoke(messages);
    return {
      content: response.content,
      modelId,
      timestamp: /* @__PURE__ */ new Date(),
      metadata: {
        usage: (_a = response.additional_kwargs) == null ? void 0 : _a.tokenUsage
      }
    };
  }
  /**
   * 发送流式聊天请求
   */
  sendMessageStream(request) {
    return __asyncGenerator(this, null, function* () {
      const modelId = request.modelId || "doubao-seed-2-0-pro-260215";
      const model = this.getModel(modelId, request.options);
      const messages = this.convertMessages(request.messages);
      const stream = yield new __await(model.stream(messages));
      try {
        for (var iter = __forAwait(stream), more, temp, error; more = !(temp = yield new __await(iter.next())).done; more = false) {
          const chunk = temp.value;
          yield {
            content: chunk.content,
            isComplete: false,
            modelId,
            timestamp: /* @__PURE__ */ new Date()
          };
        }
      } catch (temp) {
        error = [temp];
      } finally {
        try {
          more && (temp = iter.return) && (yield new __await(temp.call(iter)));
        } finally {
          if (error)
            throw error[0];
        }
      }
      yield {
        content: "",
        isComplete: true,
        modelId,
        timestamp: /* @__PURE__ */ new Date()
      };
    });
  }
  /**
   * 获取所有可用模型（简化版）
   */
  async getAvailableModels() {
    return [
      {
        id: "openai/doubao-seed-2-0-pro-260215",
        name: "Doubao Seed 2.0 Pro",
        providerId: "openai"
      },
      { id: "ollama/qwen3:0.6b", name: "Qwen3 (Ollama)", providerId: "ollama" },
      {
        id: "anthropic/claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        providerId: "anthropic"
      },
      { id: "google/gemini-pro", name: "Gemini Pro", providerId: "google" }
    ];
  }
};
var langchainService = LangChainService.getInstance();

// src/server/services/ragService.ts
var import_pgvector = require("@langchain/community/vectorstores/pgvector");
var import_textsplitters = require("@langchain/textsplitters");
var import_text = require("@langchain/classic/document_loaders/fs/text");
var import_bm25 = require("@langchain/community/retrievers/bm25");
var import_path = __toESM(require("path"));
var import_promises = __toESM(require("fs/promises"));
var RAGService = class _RAGService {
  // 缓存不同用户的BM25检索器
  constructor() {
    this.vectorStore = null;
    this.bm25Retrievers = /* @__PURE__ */ new Map();
    this.embeddings = new import_ollama2.OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:0.6b",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434"
    });
  }
  static getInstance() {
    if (!_RAGService.instance) {
      _RAGService.instance = new _RAGService();
    }
    return _RAGService.instance;
  }
  // ─── Vector Store ────────────────────────────────────────────────────────────
  async getVectorStore() {
    if (this.vectorStore) return this.vectorStore;
    this.vectorStore = await import_pgvector.PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 3e4
      },
      tableName: "knowledge_base",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata"
      }
      // embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || "1024"),
    });
    return this.vectorStore;
  }
  // ─── BM25 Retriever 初始化（新增）────────────────────────────────────────────
  /**
   * 初始化BM25检索器（按用户权限过滤文档）
   */
  async getBM25Retriever(userId) {
    const cacheKey = `${userId}`;
    if (this.bm25Retrievers.has(cacheKey)) {
      return this.bm25Retrievers.get(cacheKey);
    }
    const vectorStore = await this.getVectorStore();
    const allDocs = await vectorStore.similaritySearch("*", 1e4);
    const filteredDocs = allDocs.filter((doc) => {
      const meta = doc.metadata;
      return meta.isPublic === true || meta.userId === "system" || meta.userId === userId;
    });
    const bm25Retriever = import_bm25.BM25Retriever.fromDocuments(filteredDocs, {
      k: parseInt(process.env.BM25_TOP_K || "10")
      // BM25召回数量
    });
    this.bm25Retrievers.set(cacheKey, bm25Retriever);
    setTimeout(
      () => {
        this.bm25Retrievers.delete(cacheKey);
      },
      30 * 60 * 1e3
    );
    return bm25Retriever;
  }
  // ─── Embedding Test ──────────────────────────────────────────────────────────
  async testEmbeddingConnection() {
    const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:0.6b";
    try {
      const embedding = await this.embeddings.embedQuery("\u6D4B\u8BD5\u6587\u672C");
      if (!Array.isArray(embedding) || embedding.length === 0) {
        return {
          success: false,
          model: embeddingModel,
          error: "Invalid embedding response format"
        };
      }
      console.log(`[RAG] Embedding dimension: ${embedding.length}`);
      return {
        success: true,
        model: embeddingModel,
        dimension: embedding.length
      };
    } catch (error) {
      return {
        success: false,
        model: embeddingModel,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  // ─── Add Documents ───────────────────────────────────────────────────────────
  async addDocuments(documents) {
    console.log(`[RAG] Batch adding ${documents.length} documents`);
    const splitter = new import_textsplitters.RecursiveCharacterTextSplitter({
      chunkSize: parseInt(process.env.CHUNK_SIZE || "1000"),
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || "100"),
      separators: ["\n\n", "\n", "\u3002", "\uFF01", "\uFF1F", "\uFF1B", " ", ""],
      keepSeparator: false
    });
    const allDocs = [];
    for (const doc of documents) {
      const chunks = await splitter.createDocuments(
        [doc.content],
        [
          {
            title: doc.title || "",
            type: doc.type || "document",
            category: doc.category || "general",
            tags: JSON.stringify(doc.tags || []),
            source: doc.source || "",
            userId: doc.userId || "system",
            isPublic: !doc.userId || doc.userId === "system",
            originalId: crypto.randomUUID(),
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ]
      );
      allDocs.push(...chunks);
    }
    console.log(`[RAG] Total chunks to embed: ${allDocs.length}`);
    const BATCH_SIZE = 50;
    const vectorStore = await this.getVectorStore();
    for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
      const batch = allDocs.slice(i, i + BATCH_SIZE);
      await vectorStore.addDocuments(batch);
      console.log(
        `[RAG] Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allDocs.length / BATCH_SIZE)}`
      );
    }
    this.bm25Retrievers.clear();
    console.log(`[RAG] Done. Added ${allDocs.length} chunks.`);
  }
  // ─── 多路结果融合（新增）──────────────────────────────────────────────────────
  /**
   * 融合BM25和向量检索结果
   * @param results 多路检索结果
   * @param userId 用户ID（用于权限过滤）
   * @returns 融合后的文档（带相似度分数）
   */
  fuseRetrievalResults(results, userId) {
    const bm25DocsWithScore = results.bm25.map((doc, index2) => {
      const score = Math.max(0.5, 0.8 - index2 * 0.05);
      return [doc, score];
    });
    const allResults = [...results.vector, ...bm25DocsWithScore];
    const seenIds = /* @__PURE__ */ new Set();
    const uniqueResults = allResults.filter(([doc]) => {
      const originalId = doc.metadata.originalId;
      if (seenIds.has(originalId)) return false;
      seenIds.add(originalId);
      return true;
    });
    const filteredResults = uniqueResults.filter(([doc]) => {
      const meta = doc.metadata;
      return meta.isPublic === true || meta.userId === "system" || meta.userId === userId;
    });
    filteredResults.sort(([, a], [, b]) => b - a);
    return filteredResults;
  }
  // ─── Retrieval ───────────────────────────────────────────────────────────────
  /**
   * 检索相关文档
   * 采用多路召回策略：通过 BM25 结合向量相似度策略，合并去重后按相似度排序
   */
  async retrieveRelevantDocs(query, userId, limit = 5) {
    const vectorStore = await this.getVectorStore();
    const bm25Retriever = await this.getBM25Retriever(userId);
    const [vectorResults, bm25Results] = await Promise.all([
      vectorStore.similaritySearchWithScore(query, limit * 3),
      // 向量检索多召回一些
      bm25Retriever.invoke(query)
      // BM25检索
    ]);
    const fusedResults = this.fuseRetrievalResults(
      {
        vector: vectorResults,
        bm25: bm25Results
      },
      userId
    );
    return fusedResults.slice(0, limit).map(([doc, similarity]) => ({
      id: doc.metadata.originalId || crypto.randomUUID(),
      title: doc.metadata.title || "",
      content: doc.pageContent,
      type: doc.metadata.type || "document",
      category: doc.metadata.category || "general",
      tags: this.parseTags(doc.metadata.tags),
      source: doc.metadata.source || "",
      similarity
    }));
  }
  parseTags(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
    return [];
  }
  // ─── Generate Response ───────────────────────────────────────────────────────
  async generateRAGResponse(query, sessionId, userId, model, options) {
    console.log(
      `[RAG] Query: "${query}" (User: ${userId}, Session: ${sessionId})`
    );
    const { topK = 5 } = options || {};
    const sources = await this.retrieveRelevantDocs(query, userId, topK);
    if (sources.length === 0) {
      const noAnswerText = "\u8D44\u6599\u5E93\u4E2D\u672A\u627E\u5230\u76F8\u5173\u4FE1\u606F\u3002\u8BF7\u5C1D\u8BD5\u8C03\u6574\u67E5\u8BE2\u6216\u54A8\u8BE2\u7BA1\u7406\u5458\u3002";
      await db.insert(ragQueries).values({
        id: crypto.randomUUID(),
        query,
        retrievedDocs: [],
        response: noAnswerText,
        sessionId,
        userId
      });
      return { answer: noAnswerText, query, sources: [] };
    }
    const SIMILARITY_THRESHOLD = 0.4;
    const relevantSources = sources.filter(
      (s) => {
        var _a;
        return ((_a = s.similarity) != null ? _a : 0) >= SIMILARITY_THRESHOLD;
      }
    );
    if (relevantSources.length === 0) {
      return {
        answer: "\u627E\u5230\u4E86\u4E00\u4E9B\u6587\u6863\uFF0C\u4F46\u76F8\u5173\u5EA6\u8F83\u4F4E\uFF0C\u5EFA\u8BAE\u91CD\u65B0\u63CF\u8FF0\u95EE\u9898\u3002",
        query,
        sources
      };
    }
    const context = relevantSources.map((d, i) => `[\u6587\u6863 ${i + 1}]
\u6807\u9898: ${d.title}
\u5185\u5BB9:
${d.content}`).join("\n\n---\n\n");
    const chatModel = langchainService.getModel(
      model || "openai/doubao-seed-2-0-pro-260215",
      {}
    );
    const prompt = import_prompts.ChatPromptTemplate.fromMessages([
      [
        "system",
        `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u77E5\u8BC6\u5E93\u52A9\u624B\u3002\u8BF7\u4E25\u683C\u57FA\u4E8E\u4EE5\u4E0B\u3010\u53C2\u8003\u6587\u6863\u3011\u56DE\u7B54\u95EE\u9898\u3002

\u89C4\u5219\uFF1A
1. \u53EA\u4F7F\u7528\u6587\u6863\u4E2D\u7684\u4FE1\u606F\uFF0C\u7981\u6B62\u7F16\u9020
2. \u5F15\u7528\u6765\u6E90\u65F6\u6CE8\u660E"\u6839\u636E\u6587\u6863X"
3. \u6587\u6863\u4E2D\u65E0\u76F8\u5173\u4FE1\u606F\u65F6\uFF0C\u76F4\u63A5\u8BF4\u660E"\u8D44\u6599\u5E93\u4E2D\u672A\u627E\u5230\u76F8\u5173\u4FE1\u606F"
4. \u56DE\u7B54\u7B80\u6D01\u3001\u51C6\u786E\u3001\u6709\u6761\u7406

\u3010\u53C2\u8003\u6587\u6863\u3011
{context}`
      ],
      ["user", "{question}"]
    ]);
    const answer = await prompt.pipe(chatModel).pipe(new import_output_parsers.StringOutputParser()).invoke({ context, question: query });
    await db.insert(ragQueries).values({
      id: crypto.randomUUID(),
      query,
      retrievedDocs: sources.map((s) => s.id),
      response: answer,
      sessionId,
      userId
    });
    return { answer, query, sources };
  }
  // ─── Initialize Knowledge Base ───────────────────────────────────────────────
  async initializeSystemKnowledge() {
    console.log("[RAG] Initializing system knowledge base...");
    const knowledgeDir = import_path.default.join(process.cwd(), "src/knowledge");
    const files2 = await import_promises.default.readdir(knowledgeDir);
    const allDocuments = [];
    for (const file of files2) {
      const filePath = import_path.default.join(knowledgeDir, file);
      const stats = await import_promises.default.stat(filePath);
      if (stats.isDirectory()) continue;
      const ext = import_path.default.extname(file).toLowerCase();
      console.log(`[RAG] Processing: ${file}`);
      try {
        if (ext === ".json") {
          allDocuments.push(...await this.parseJsonFile(filePath));
        } else if (ext === ".md") {
          allDocuments.push(...await this.parseMarkdownFile(filePath));
        }
      } catch (err) {
        console.error(`[RAG] Failed to process ${file}:`, err);
      }
    }
    if (allDocuments.length > 0) {
      console.log(`[RAG] Adding ${allDocuments.length} documents...`);
      await this.addDocuments(allDocuments);
      console.log("[RAG] Knowledge base initialized!");
    } else {
      console.warn("[RAG] No documents found in knowledge directory");
    }
  }
  // ─── File Parsers ────────────────────────────────────────────────────────────
  /**
   * 解析 JSON 文件
   */
  async parseJsonFile(filePath) {
    const raw = await import_promises.default.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : [data];
    return items.filter((item) => !!item.content).map((item) => ({
      title: item.title || import_path.default.basename(filePath, ".json"),
      content: item.content,
      type: item.type || "document",
      category: item.category,
      tags: Array.isArray(item.tags) ? item.tags : [],
      source: filePath
    }));
  }
  /**
   * 解析 Markdown 文件
   */
  async parseMarkdownFile(filePath) {
    const loader = new import_text.TextLoader(filePath);
    const docs = await loader.load();
    return docs.map((doc) => {
      const titleMatch = doc.pageContent.match(/^#\s+(.+)/m);
      const title = (titleMatch == null ? void 0 : titleMatch[1]) || import_path.default.basename(filePath, ".md");
      return {
        title,
        content: doc.pageContent,
        type: "markdown",
        source: filePath
      };
    });
  }
};
var ragService = RAGService.getInstance();

// scripts/init-knowledge-base.ts
var import_dotenv = require("dotenv");
(0, import_dotenv.config)({ path: ".env" });
async function main() {
  console.log("Starting knowledge base initialization...");
  try {
    console.log("Initializing system knowledge...");
    await ragService.initializeSystemKnowledge();
    console.log("System knowledge base initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Initialization failed:", error);
    process.exit(1);
  }
}
main();
