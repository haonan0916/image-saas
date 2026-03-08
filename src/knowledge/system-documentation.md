---
title: Image SaaS 系统完整技术文档
type: documentation
category: system
tags: [系统架构, 功能详解, 技术栈, API, 数据模型, 部署, Agent, WebSocket]
last_updated: 2026-02-24
---

# Image SaaS 系统完整技术文档

## 1. 系统概述

Image SaaS 是一个现代化的图像处理服务平台，集成了文件管理、数据集组织、AI 模型处理（如去雾）以及对外 API 服务。系统基于 Next.js 16 构建，采用前后端分离架构（App Router），支持多种存储后端（S3 兼容），并内置了基于 LangChain 的 ReAct 智能体（Agent）和 WebSocket 实时推送服务。

## 2. 核心功能模块

### 2.1 文件管理系统 (File Management)

- **多模式上传**：支持拖拽上传、点击上传以及 API 批量上传。
- **存储抽象**：底层支持 AWS S3、阿里云 OSS、MinIO 等兼容 S3 协议的对象存储。
- **文件生命周期**：
  - **上传**：生成预签名 URL (Presigned URL) 进行安全直传。
  - **预览**：支持生成临时访问链接。
  - **关联**：文件删除时，会自动清理关联的数据集引用，保证数据一致性。
- **元数据管理**：记录文件类型、大小、上传者、所属应用等信息。

### 2.2 数据集管理 (Dataset Management)

- **逻辑分组**：用户可以创建自定义数据集（Custom Datasets），将相关图片进行逻辑分组。
- **系统数据集**：平台预置标准数据集（System Datasets）用于演示或基准测试。
- **标签系统**：支持为数据集添加多维度标签（Tags），便于检索和分类。
- **数据流转**：数据集是 AI 任务的基础输入单元，支持批量导入文件到数据集。

### 2.3 AI 模型与任务处理 (AI Models & Tasks)

- **模型仓库**：
  - **去雾模型 (Dehaze)**：专用于处理雾天、低对比度图像。
  - **模型分类**：支持 `general`（通用）、`high_fidelity`（高保真）、`fast_processing`（快速）等类别。
  - **格式支持**：支持 `pth`, `onnx`, `pb` 等主流模型格式。
- **异步任务引擎**：
  - **任务创建**：用户选择数据集和模型创建处理任务。
  - **状态追踪**：任务状态包括 `pending` (等待中), `processing` (处理中), `completed` (完成), `failed` (失败)。
  - **结果映射**：自动建立输入图片 ID 到输出图片 ID 的映射关系。

### 2.4 智能助手 (Agent & RAG)

系统集成了基于 LangChain 的高级智能体服务，采用 ReAct (Reasoning + Acting) 模式，能够自主规划并执行复杂任务。

- **Agent 架构**：
  - **核心模型**：支持 OpenAI, Anthropic, Google Gemini 及本地 Ollama 模型（如 Qwen）。
  - **上下文注入**：自动注入 `userId`, `userPlan`, `sessionId`，无需用户显式提供。
  - **工具集 (Tools)**：
    - `file_management`: 文件搜索、保存、删除、列出最近图片。
    - `application_management`: 应用创建、列表查询、存储配置变更。
    - `knowledge_search`: 基于 RAG 的知识库检索。
    - `image_processing`: 创建去雾任务。
- **RAG 知识库**：
  - **向量检索**：使用 `pgvector` 存储文档向量（默认 1024 维），支持语义搜索。
  - **混合检索**：结合关键词匹配和语义相似度。
  - **知识源**：支持 Markdown 和 JSON 格式的系统文档导入。

### 2.5 实时通知服务 (Real-time Notifications)

系统内置 WebSocket 服务器，用于实时推送长运行任务的状态更新。

- **协议**：自定义 WebSocket 协议。
- **事件类型**：
  - `auth`: 客户端认证（绑定 userId 和 appId）。
  - `subscribe_task`/`unsubscribe_task`: 订阅/取消订阅单个任务状态。
  - `subscribe_batch`/`unsubscribe_batch`: 订阅/取消订阅批处理任务进度。
- **推送消息**：
  - `batch_progress`: 批处理任务进度百分比。
  - `batch_completed`/`batch_failed`: 任务完成或失败通知。

### 2.6 API 集成服务

- **密钥管理**：用户可为不同应用生成独立的 `Client ID` 和 `Client Secret`。
- **RESTful 接口**：提供标准的 HTTP 接口供第三方系统调用核心功能。

## 3. 技术架构与技术栈

### 3.1 前端技术栈

- **框架**：Next.js 16 (App Router)
- **UI 组件库**：Tailwind CSS, Radix UI, Lucide React
- **状态管理**：React Query (TanStack Query)
- **通信**：TRPC (类型安全的 API 调用), WebSocket Client
- **动画**：Framer Motion

### 3.2 后端技术栈

- **运行时**：Node.js
- **数据库**：PostgreSQL (配合 pgvector 扩展)
- **ORM**：Drizzle ORM
- **身份认证**：NextAuth.js v4 (支持 GitHub OAuth 等)
- **AI/LLM**：LangChain.js, Ollama (本地模型支持)
- **实时通信**：原生 WebSocket Server (集成在 Next.js 服务中)

### 3.3 数据模型 (Database Schema)

主要数据表结构如下：

- `users`: 用户信息及认证凭证，包含套餐计划 (`plan`)。
- `files`: 文件元数据，关联 S3 路径。
- `datasets` / `dataset_images`: 数据集及其包含的图片关联。
- `models`: AI 模型元数据及文件地址，包含版本、类型、格式等信息。
- `dehaze_tasks`: 异步任务记录，存储 `inputImageIds` 和 `outputImageIds` 映射及处理时间。
- `chat_sessions`: AI 对话会话记录，包含标题和关联模型。
- `chat_messages`: 具体的对话消息记录，区分 `user` 和 `assistant` 角色。
- `knowledge_base`: RAG 知识库，包含向量字段 `embedding` (1024维)。
- `apiKeys`: API 访问凭证。

## 4. 部署与配置

### 4.1 环境变量 (.env)

系统运行需要配置以下关键环境变量：

```bash
# 数据库连接
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# 身份认证
NEXTAUTH_SECRET="your-secret-key"
AUTH_GITHUB_ID="github-client-id"
AUTH_GITHUB_SECRET="github-client-secret"

# 对象存储 (OSS/S3)
OSS_REGION="cn-region"
OSS_ACCESS_KEY_ID="access-key"
OSS_ACCESS_KEY_SECRET="secret-key"
OSS_BUCKET="bucket-name"
OSS_ENDPOINT="https://oss-endpoint.com"

# AI 模型服务
OLLAMA_BASE_URL="http://localhost:11434"
# 可选：OpenAI/Anthropic/Google API Keys
# OPENAI_API_KEY="..."
# ANTHROPIC_API_KEY="..."
# GOOGLE_API_KEY="..."

# WebSocket 服务 (如果部署在独立端口)
# WS_PORT=3001
```

### 4.2 初始化流程

1. 启动 PostgreSQL 数据库并启用 `vector` 扩展。
2. 运行 `npx drizzle-kit push` 同步数据库表结构。
3. 运行 `npx tsx scripts/init-knowledge-base.ts` 初始化系统知识库。
4. 启动应用：`npm run dev` 或 `npm run build && npm start`。

## 5. 常见问题与排查

- **RAG 检索不到内容**：检查数据库 `knowledge_base` 表是否有数据，确认 `pgvector` 扩展是否安装，检查检索阈值设置。
- **Agent 工具调用失败**：检查 `AgentService` 中的 Schema 定义是否与工具实现匹配，确认用户是否有权限执行该操作。
- **WebSocket 连接失败**：检查网络环境是否支持 WebSocket，确认防火墙配置，或检查 `WS_PORT` 是否被占用。
- **任务一直 Pending**：检查后台任务队列消费者是否正常运行（如需独立 Worker）。
