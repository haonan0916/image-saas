"use client";

import { Bot, FileText, FolderOpen, Search, Sparkles } from "lucide-react";

/**
 * Agent 欢迎提示组件
 * 显示在聊天对话框中，引导用户使用 Agent 功能
 */
export function AgentWelcome() {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-blue-500 to-purple-600 mb-4">
          <Bot className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2">🤖 智能助手 Agent</h3>
        <p className="text-sm text-muted-foreground">
          通过自然语言操作平台，让复杂的操作变得简单
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-sm">文件管理</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            搜索、上传、删除文件
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-sm">应用管理</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            创建、查看应用列表
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-sm">知识查询</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            搜索平台文档和 FAQ
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-orange-600" />
            <h4 className="font-medium text-sm">图像处理</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            创建去雾任务
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2 text-blue-900">💡 试试这些问题：</h4>
        <div className="space-y-2 text-sm text-blue-700">
          <p className="cursor-pointer hover:text-blue-900 transition-colors">
            • &quot;帮我列出所有应用&quot;
          </p>
          <p className="cursor-pointer hover:text-blue-900 transition-colors">
            • &quot;搜索最近上传的图片&quot;
          </p>
          <p className="cursor-pointer hover:text-blue-900 transition-colors">
            • &quot;如何通过 API 上传文件？&quot;
          </p>
          <p className="cursor-pointer hover:text-blue-900 transition-colors">
            • &quot;创建一个名为 Test 的应用&quot;
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p>切换到 <span className="font-medium text-blue-600">🤖 智能助手 (Agent)</span> 模式开始使用</p>
      </div>
    </div>
  );
}
