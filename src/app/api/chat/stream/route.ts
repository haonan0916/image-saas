import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/auth";
import { db } from "@/server/db/db";
import { chatSessions, chatMessages } from "@/server/db/schema";
import { ragService } from "@/server/services/ragService";
import { langchainService } from "@/services/langchain/LangChainService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sessionId, content, model, useRAG } = await request.json();

    if (!sessionId || !content) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const allSessions = await db.select().from(chatSessions);
    const sessionCheck = allSessions.filter(s =>
      s.id === sessionId &&
      s.userId === session.user.id &&
      !s.deletedAt
    );

    if (!sessionCheck.length) {
      return new NextResponse("Session not found", { status: 404 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const [userMessage] = await db
            .insert(chatMessages)
            .values({
              id: crypto.randomUUID(),
              sessionId,
              role: "user",
              content,
            })
            .returning();

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'userMessage',
              message: userMessage,
              sessionId
            })}\n\n`)
          );

          let aiResponse = "";
          let sources: Array<{ id: string; title: string; content: string; similarity?: number }> = [];

          if (useRAG) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'streamStart',
                message: '正在检索相关知识...',
                sessionId
              })}\n\n`)
            );

            const ragResult = await ragService.generateRAGResponse(
              content,
              sessionId,
              session.user.id,
              model
            );
            sources = ragResult.sources;

            const allMessages = await db.select().from(chatMessages);
            const messages = allMessages
              .filter(msg => msg.sessionId === sessionId)
              .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
            const systemMessage = {
              role: "system" as const,
              content: `以下是与用户问题相关的知识源，优先依据其中信息回答。\n\n${sources.map(s => `【${s.title}】\n${s.content}`).join('\n\n')}`
            };
            const langchainMessages = [
              systemMessage,
              ...messages.map((msg: { role: string; content: string }) => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
              }))
            ];
            const modelId = model || "ollama/qwen3:0.6b";
            let fullResponse = "";
            for await (const chunk of langchainService.sendMessageStream({
              messages: langchainMessages,
              modelId,
              sessionId,
              options: { stream: true, temperature: 0.7, maxTokens: 2048 }
            })) {
              if (chunk.content) {
                fullResponse += chunk.content;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'streamChunk',
                    chunk: chunk.content,
                    fullContent: fullResponse,
                    sessionId
                  })}\n\n`)
                );
              }
            }
            aiResponse = fullResponse;
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'streamStart',
                message: 'AI 正在思考...',
                sessionId
              })}\n\n`)
            );

            const allMessages = await db
              .select()
              .from(chatMessages);
            const messages = allMessages.filter(msg => msg.sessionId === sessionId)
              .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
            const systemMessage = {
              role: "system" as const,
              content: "你是一个会深度思考的AI助手。对于复杂问题，请先在<think></think>标签中展示你的详细思考过程，包括分析步骤、推理逻辑等，然后再给出最终答案。思考过程要详细、清晰，帮助用户理解你的推理过程。"
            };
            const lcMessages = [
              systemMessage,
              ...messages.map((msg: { role: string; content: string }) => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
              }))
            ];
            const modelId = model || "ollama/qwen3:0.6b";
            let fullResponse = '';
            for await (const chunk of langchainService.sendMessageStream({
              messages: lcMessages,
              modelId,
              sessionId,
              options: { stream: true, temperature: 0.7, maxTokens: 2048 }
            })) {
              if (chunk.content) {
                fullResponse += chunk.content;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'streamChunk',
                    chunk: chunk.content,
                    fullContent: fullResponse,
                    sessionId
                  })}\n\n`)
                );
              }
            }
            aiResponse = fullResponse;
          }

          const [assistantMessage] = await db
            .insert(chatMessages)
            .values({
              id: crypto.randomUUID(),
              sessionId,
              role: "assistant",
              content: aiResponse,
            })
            .returning();

          try {
            await db
              .update(chatSessions)
              .set({ updatedAt: new Date() });
          } catch (updateError) {
            console.warn('Failed to update session timestamp:', updateError);
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'streamEnd',
              message: assistantMessage,
              sources: useRAG ? sources : undefined,
              sessionId
            })}\n\n`)
          );

        } catch (error) {
          console.error('Stream error:', error);
          const errorMessage = `抱歉，我遇到了一些问题：${error instanceof Error ? error.message : "未知错误"}`;
          const [errorMsg] = await db
            .insert(chatMessages)
            .values({
              id: crypto.randomUUID(),
              sessionId,
              role: "assistant",
              content: errorMessage,
            })
            .returning();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: errorMessage,
              message: errorMsg,
              sessionId
            })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
