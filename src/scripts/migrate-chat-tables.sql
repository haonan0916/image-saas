-- 创建聊天会话表
CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "title" varchar(255) DEFAULT 'New Chat' NOT NULL,
  "user_id" text NOT NULL,
  "model" varchar(100) DEFAULT 'qwen2.5:0.5b' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "deleted_at" timestamp
);

-- 创建聊天消息表
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "session_id" uuid NOT NULL,
  "role" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 添加外键约束
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE cascade ON UPDATE no action;

-- 创建索引
CREATE INDEX IF NOT EXISTS "chat_sessions_user_id_idx" ON "chat_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "chat_sessions_updated_at_idx" ON "chat_sessions" ("updated_at");
CREATE INDEX IF NOT EXISTS "chat_messages_session_id_idx" ON "chat_messages" ("session_id");
CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages" ("created_at");