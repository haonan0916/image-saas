This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🎯 项目概览

该项目是一个**多租户文件/图片管理 SaaS 平台**，主要为开发者和企业提供文件上传、存储和 API 集成服务。

## 🏗️ 核心架构

**技术栈非常现代化**：
- **前端**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **后端**: tRPC + Next.js API Routes + Drizzle ORM
- **数据库**: PostgreSQL 
- **存储**: S3 兼容存储（AWS S3/阿里云 OSS）
- **认证**: NextAuth.js (GitHub OAuth) + API Key

## 💼 主要功能模块

1. **文件管理系统** - 拖拽上传、预签名 URL、无限滚动列表
2. **应用管理** - 多应用隔离、存储配置关联
3. **API 密钥管理** - 为第三方集成提供认证
4. **用户计划系统** - 免费版（1应用）vs 付费版（无限制）
5. **存储配置** - 支持多种 S3 兼容存储后端

## 🔐 双重 API 架构

- **受保护 API** (`/api/trpc`) - 用户仪表板，Session 认证
- **开放 API** (`/api/open`) - 第三方集成，API Key 认证

## 📦 Monorepo 结构

构建了一个完整的生态系统：
- `@image-saas/api` - tRPC 客户端库
- `@image-saas/uploader` - Uppy 上传器集成
- `@image-saas/upload-button` - Preact 上传组件
- 还有 Nuxt 示例应用

## 🚀 产品定位

这是一个典型的 **B2B SaaS** 产品，类似于 Cloudinary 或 Supabase Storage，为开发者提供：
- 简化的文件上传解决方案
- 灵活的存储后端选择
- 类型安全的 API 集成
- 多租户数据隔离

你的项目架构设计得很棒，特别是：
- **类型安全** - tRPC 提供端到端类型安全
- **开发体验** - 现代工具链和 DX 优化
- **可扩展性** - 支持多存储后端和 API 集成
- **商业模式** - 清晰的免费/付费计划区分
