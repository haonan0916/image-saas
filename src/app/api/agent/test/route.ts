import { NextRequest, NextResponse } from "next/server";
import { agentService } from "@/services/langchain/AgentService";

/**
 * Agent 测试端点
 * 用于快速测试 Agent 功能，无需前端
 * 
 * 使用方法：
 * POST /api/agent/test
 * Body: {
 *   "message": "帮我列出所有应用",
 *   "userId": "test-user-id",
 *   "userPlan": "free"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId = "test-user", userPlan = "free", modelId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log(`[Agent Test] Processing: "${message}"`);

    const response = await agentService.invoke(
      [
        {
          role: "user",
          content: message,
        },
      ],
      {
        userId,
        userPlan,
        modelId: modelId || "ollama/qwen3:0.6b",
      }
    );

    return NextResponse.json({
      success: true,
      response: response.content,
      toolCalls: response.toolCalls,
      modelId: response.modelId,
      timestamp: response.timestamp,
    });
  } catch (error) {
    console.error("[Agent Test] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 获取测试示例
 */
export async function GET() {
  return NextResponse.json({
    message: "Agent Test Endpoint",
    usage: "POST /api/agent/test with JSON body",
    examples: [
      {
        description: "List applications",
        body: {
          message: "帮我列出所有应用",
          userId: "test-user-id",
          userPlan: "free",
        },
      },
      {
        description: "Search files",
        body: {
          message: "搜索包含 'logo' 的文件",
          userId: "test-user-id",
          userPlan: "pro",
        },
      },
      {
        description: "Knowledge search",
        body: {
          message: "如何通过 API 上传文件？",
          userId: "test-user-id",
          userPlan: "free",
        },
      },
      {
        description: "Create application",
        body: {
          message: "创建一个名为 'Test App' 的应用",
          userId: "test-user-id",
          userPlan: "pro",
        },
      },
    ],
    availableModels: [
      "ollama/qwen3:0.6b",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4o",
      "anthropic/claude-3-haiku-20240307",
    ],
  });
}
