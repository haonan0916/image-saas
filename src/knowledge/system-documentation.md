---
title: Image SaaS 系统完整技术文档
type: documentation
category: system
tags: [系统架构, 功能详解, 技术栈, API, 数据模型, 部署]
---

# Image SaaS 系统完整技术文档

## 1. 系统概述
Image SaaS 是一个现代化的图像处理服务平台，集成了文件管理、数据集组织、AI 模型处理（如去雾）以及对外 API 服务。系统基于 Next.js 16 构建，采用前后端分离架构（App Router），支持多种存储后端（S3 兼容），并内置了基于 RAG（检索增强生成）的智能助手功能。

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

### 2.4 智能助手 (RAG Knowledge Base)
- **知识库构建**：支持 JSON 和 Markdown 格式的文档导入。
- **向量检索**：使用 `pgvector` 存储文档向量，支持基于语义的相似度搜索。
- **混合权限控制**：检索时同时考虑用户私有文档、系统公开文档和公共知识库。
- **智能问答**：基于 LLM (如 Qwen) 结合检索结果，提供精准的系统使用建议。

### 2.5 API 集成服务
- **密钥管理**：用户可为不同应用生成独立的 `Client ID` 和 `Client Secret`。
- **RESTful 接口**：提供标准的 HTTP 接口供第三方系统调用核心功能。

## 3. 技术架构与技术栈

### 3.1 前端技术栈
- **框架**：Next.js 16 (App Router)
- **UI 组件库**：Tailwind CSS, Radix UI, Lucide React
- **状态管理**：React Query (TanStack Query)
- **动画**：Framer Motion

### 3.2 后端技术栈
- **运行时**：Node.js
- **数据库**：PostgreSQL (配合 pgvector 扩展)
- **ORM**：Drizzle ORM
- **身份认证**：NextAuth.js v4 (支持 GitHub OAuth 等)
- **AI/LLM**：LangChain.js, Ollama (本地模型支持)

### 3.3 数据模型 (Database Schema)
主要数据表结构如下：
- `users`: 用户信息及认证凭证。
- `files`: 文件元数据，关联 S3 路径。
- `datasets` / `dataset_images`: 数据集及其包含的图片关联。
- `models`: AI 模型元数据及文件地址。
- `dehaze_tasks`: 异步任务记录，存储输入输出映射。
- `apiKeys`: API 访问凭证。
- `knowledge_base`: RAG 知识库，包含向量字段 `embedding`。
- `rag_queries`: 用户提问与系统回答的历史记录。

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
OLLAMA_EMBEDDING_MODEL="qwen3-embedding:0.6b"
```

### 4.2 初始化流程
1. 启动 PostgreSQL 数据库并启用 `vector` 扩展。
2. 运行 `npx drizzle-kit push` 同步数据库表结构。
3. 运行 `npx tsx scripts/init-knowledge-base.ts` 初始化系统知识库。
4. 启动应用：`npm run dev` 或 `npm run build && npm start`。

## 5. 常见问题与排查
- **RAG 检索不到内容**：检查数据库 `knowledge_base` 表是否有数据，确认 `pgvector` 扩展是否安装，检查检索阈值设置。
- **文件上传失败**：检查 S3/OSS 配置是否正确，特别是 Bucket 权限和 CORS 设置。
- **任务一直 Pending**：检查后台任务队列消费者是否正常运行（如需独立 Worker）。
