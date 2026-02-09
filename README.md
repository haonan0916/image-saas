# 视界清云 SaaS

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.30-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)

视界清云 SaaS 是一个现代化的图像处理服务平台，集成了文件管理、数据集组织、AI 模型处理（如智能去雾）以及基于 RAG 的智能助手功能。系统采用前后端分离架构（Next.js App Router），旨在为开发者和企业提供高效的图像数据流转与处理能力。

## 核心功能

- **高级文件管理**
  - 支持拖拽上传、批量操作。
  - 兼容 AWS S3、阿里云 OSS、腾讯云 COS 等对象存储服务。
  - 安全的预签名 URL (Presigned URL) 上传与临时访问机制。

- **数据集管理**
  - 自定义数据集创建与逻辑分组。
  - 支持多维度标签（Tags）分类与检索。
  - 图片与数据集的灵活关联管理。

- **AI 图像处理**
  - 内置异步任务引擎，支持耗时 AI 任务处理。
  - **去雾模型 (Dehaze)**：针对低对比度、雾天图像的增强处理。
  - 完整的任务状态追踪（Pending -> Processing -> Completed）。

- **RAG 智能助手**
  - 基于 `pgvector` 的向量检索知识库。
  - 支持 Markdown 和 JSON 格式的知识自动导入。
  - 智能回答关于系统使用、API 调用等技术问题。

- **开放 API**
  - 提供 RESTful 接口供第三方集成。
  - 基于 Client ID / Secret 的 API 密钥管理。

## 技术栈

- **前端**：Next.js 16 (App Router), Tailwind CSS, Radix UI, React Query, Framer Motion
- **后端**：Node.js API Routes (Server Actions), NextAuth.js v5
- **数据库**：PostgreSQL (with `pgvector` extension)
- **ORM**：Drizzle ORM
- **AI/LLM**：LangChain.js, Ollama (Local LLM Support)
- **存储**：S3 Compatible Object Storage

## 快速开始

### 前置要求

- Node.js >= 18
- PostgreSQL >= 15 (需安装 `vector` 插件)
- Ollama (用于本地 Embedding 和 RAG 功能)

### 1. 克隆项目与安装依赖

```bash
git clone <repository-url>
cd image-saas
pnpm install
```

### 2. 环境配置

复制示例配置文件并填入你的真实配置：

```bash
cp .env.example .env
```

主要配置项说明：

- `DATABASE_URL`: PostgreSQL 连接字符串。
- `OSS_*`: 对象存储配置（用于文件上传）。
- `OLLAMA_*`: AI 服务地址。

### 3. 数据库初始化

确保 PostgreSQL 服务已启动，然后同步数据库表结构：

```bash
# 生成 SQL 迁移文件
npx drizzle-kit generate

# 推送变更到数据库
npx drizzle-kit push

# 打开可视化数据库网站
npx drizzle-kit studio
```

### 4. 初始化知识库 (可选)

如果你想使用 RAG 智能助手功能，需要初始化向量知识库：

```bash
# 扫描 src/knowledge 目录下的 .md/.json 文件并向量化存入数据库
npx tsx scripts/init-knowledge-base.ts
```

### 5. 启动开发服务器

```bash
pnpm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看效果。

## 项目结构

```
├── src/
│   ├── app/                 # Next.js App Router 页面与 API
│   ├── components/          # React UI 组件
│   ├── server/              # 后端逻辑
│   │   ├── db/              # Drizzle ORM Schema 与连接配置
│   │   ├── services/        # 核心业务逻辑 (RAG, File, Task)
│   │   └── actions/         # Server Actions
│   ├── knowledge/           # RAG 知识库源文件 (Markdown/JSON)
│   └── lib/                 # 通用工具函数
├── scripts/                 # 运维与初始化脚本
├── drizzle.config.ts        # Drizzle 配置文件
└── ...
```

## 许可证

[MIT](LICENSE)
