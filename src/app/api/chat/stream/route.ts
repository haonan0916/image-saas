import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/auth";
import { db } from "@/server/db/db";
import { chatSessions, chatMessages } from "@/server/db/schema";
import { ollamaClient } from "@/server/services/ollamaClient";
import { ragService } from "@/server/services/ragService";

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

    // 验证会话属于当前用户
    const allSessions = await db.select().from(chatSessions);
    const sessionCheck = allSessions.filter(s => 
      s.id === sessionId && 
      s.userId === session.user.id && 
      !s.deletedAt
    );

    if (!sessionCheck.length) {
      return new NextResponse("Session not found", { status: 404 });
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
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

          // 发送用户消息确认
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'userMessage',
              message: userMessage,
              sessionId
            })}\n\n`)
          );

          let aiResponse: string;
          let sources: Array<{ id: string; title: string; content: string; similarity?: number }> = [];

          if (useRAG) {
            // 使用 RAG 增强回答
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'streamStart',
                message: '正在检索相关知识...',
                sessionId
              })}\n\n`)
            );

            const ragResponse = await ragService.generateRAGResponse(
              content,
              sessionId,
              session.user.id,
              model
            );
            
            aiResponse = ragResponse.answer;
            sources = ragResponse.sources;

            // 模拟流式输出 RAG 回答
            const words = aiResponse.split(' ');
            let currentContent = '';
            
            for (let i = 0; i < words.length; i++) {
              currentContent += (i > 0 ? ' ' : '') + words[i];
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'streamChunk',
                  chunk: words[i],
                  fullContent: currentContent,
                  sessionId
                })}\n\n`)
              );

              // 添加小延迟以模拟流式效果
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } else {
            // 普通聊天模式 - 使用真正的流式处理
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'streamStart',
                message: 'AI 正在思考...',
                sessionId
              })}\n\n`)
            );

            // 获取会话历史消息
            const allMessages = await db
              .select()
              .from(chatMessages);

            // 过滤出属于当前会话的消息
            const messages = allMessages.filter(msg => msg.sessionId === sessionId)
              .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

            // 准备发送给 Ollama 的消息格式，添加系统提示以启用思考模式
            const systemMessage = {
              role: "system" as const,
              content: "你是一个会深度思考的AI助手。对于复杂问题，请先在<think></think>标签中展示你的详细思考过程，包括分析步骤、推理逻辑等，然后再给出最终答案。思考过程要详细、清晰，帮助用户理解你的推理过程。"
            };

            const ollamaMessages = [
              systemMessage,
              ...messages.map((msg: { role: string; content: string }) => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
              }))
            ];

            // 设置模型
            if (model) {
              ollamaClient.setModel(model);
            }

            // 使用真正的流式处理
            let fullResponse = '';
            let thinkingContent = '';
            let isThinking = false;

            try {
              for await (const chunk of ollamaClient.chatStream(ollamaMessages)) {
                if (chunk.type === 'thinking') {
                  // 发送思考过程
                  thinkingContent += chunk.content;
                  isThinking = true;
                  
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'thinking',
                      content: chunk.content,
                      fullThinking: thinkingContent,
                      sessionId
                    })}\n\n`)
                  );
                } else if (chunk.type === 'response') {
                  // 如果之前在思考，先发送思考结束信号
                  if (isThinking) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        type: 'thinkingEnd',
                        sessionId
                      })}\n\n`)
                    );
                    isThinking = false;
                  }

                  // 发送回答内容
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
            } catch (streamError) {
              console.error('Stream processing error:', streamError);
              // 如果流式处理失败，回退到非流式
              aiResponse = await ollamaClient.chat(ollamaMessages);
              
              // 模拟流式输出
              const words = aiResponse.split(' ');
              let currentContent = '';
              
              for (let i = 0; i < words.length; i++) {
                currentContent += (i > 0 ? ' ' : '') + words[i];
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'streamChunk',
                    chunk: words[i],
                    fullContent: currentContent,
                    sessionId
                  })}\n\n`)
                );

                // 添加小延迟以模拟流式效果
                await new Promise(resolve => setTimeout(resolve, 30));
              }
            }
          }

          // 保存 AI 回复
          const [assistantMessage] = await db
            .insert(chatMessages)
            .values({
              id: crypto.randomUUID(),
              sessionId,
              role: "assistant",
              content: aiResponse,
            })
            .returning();

          // 更新会话时间（简化版本，跳过可能的类型错误）
          try {
            await db
              .update(chatSessions)
              .set({ updatedAt: new Date() });
          } catch (updateError) {
            console.warn('Failed to update session timestamp:', updateError);
          }

          // 发送完成信号
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
          
          // 发送错误信息
          const errorMessage = `抱歉，我遇到了一些问题：${error instanceof Error ? error.message : "未知错误"}`;
          
          // 保存错误消息
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