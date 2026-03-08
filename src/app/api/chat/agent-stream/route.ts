import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/auth";
import { db } from "@/server/db/db";
import { chatSessions, chatMessages } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { agentService } from "@/services/langchain/AgentService";

/**
 * Agent 流式聊天 API
 * 集成到现有的聊天系统中
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, content, model } = body;

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 验证会话属于当前用户
    const sessionCheck = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.userId, session.user.id),
          isNull(chatSessions.deletedAt),
        ),
      )
      .limit(1);

    if (!sessionCheck.length) {
      return NextResponse.json(
        { error: "Session not found or access denied" },
        { status: 404 },
      );
    }

    // 获取用户计划
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
      columns: {
        plan: true,
      },
    });

    const userPlan = user?.plan || "free";

    // 保存用户消息
    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        id: crypto.randomUUID(),
        sessionId,
        role: "user",
        content,
      })
      .returning();

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送用户消息确认
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "userMessage",
                message: userMessage,
                sessionId,
              })}\n\n`,
            ),
          );

          // 发送流开始信号
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "streamStart",
                sessionId,
              })}\n\n`,
            ),
          );

          // 获取会话历史
          const messages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, sessionId))
            .orderBy(chatMessages.createdAt);

          // 转换为 Agent 消息格式
          const agentMessages = messages.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          }));

          let fullContent = "";
          const toolCallsInfo: Array<{
            toolName: string;
            args: Record<string, unknown>;
          }> = [];

          // 使用 Agent 流式响应
          const agentStream = agentService.stream(agentMessages, {
            modelId: model || "ollama/qwen3:0.6b",
            userId: session.user.id,
            userPlan: userPlan,
            sessionId,
          });

          for await (const chunk of agentStream) {
            // Check if controller is still desired state (though we can't check 'closed' directly on standard ReadableStreamDefaultController easily without try/catch wrapper logic or keeping external state)
            // But we can wrap the enqueue in a try/catch block to safely handle closure.
            try {
              if (!chunk.isComplete) {
                fullContent += chunk.content;

                // 发送流式内容
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "streamChunk",
                      content: chunk.content,
                      fullContent,
                      sessionId,
                    })}\n\n`,
                  ),
                );
              }
            } catch (e) {
              // If enqueue fails (e.g. controller closed), we should stop processing the stream
              console.warn(
                "[Agent Stream] Controller closed, stopping stream processing",
              );
              break;
            }
          }

          // 保存 AI 回复
          await db.insert(chatMessages).values({
            id: crypto.randomUUID(),
            sessionId,
            role: "assistant",
            content: fullContent,
          });

          // 更新会话时间
          await db
            .update(chatSessions)
            .set({ updatedAt: new Date() })
            .where(eq(chatSessions.id, sessionId));

          // 发送流结束信号
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "streamEnd",
                  sessionId,
                  toolCalls:
                    toolCallsInfo.length > 0 ? toolCallsInfo : undefined,
                })}\n\n`,
              ),
            );
            controller.close();
          } catch (closeError) {
            // Ignore errors if controller is already closed or stream cancelled
          }
        } catch (error) {
          console.error("[Agent Stream] Error:", error);
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                  sessionId,
                })}\n\n`,
              ),
            );
            controller.close();
          } catch (closeError) {
            // Ignore errors during error handling if controller is already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Agent Stream] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
