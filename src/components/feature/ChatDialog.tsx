"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { trpcClientReact } from "@/utils/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  Plus,
  Trash2,
  Edit3,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import { AgentWelcome } from "./AgentWelcome";

// 类型定义
interface ChatSession {
  id: string;
  title: string;
  userId: string;
  model: string;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  messages?: ChatMessage[];
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string | null;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

// 用户头像组件
const UserAvatar = ({ user }: { user: { name?: string | null; image?: string | null } | undefined }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
      {user?.image && !imageError ? (
        <Image
          src={user.image}
          alt={user.name || "User"}
          width={32}
          height={32}
          className="w-full h-full object-cover"
          unoptimized={true}
          onError={() => setImageError(true)}
        />
      ) : (
        <User className="h-4 w-4 text-gray-600" />
      )}
    </div>
  );
};

export function ChatDialog({ open, onOpenChange }: Omit<ChatDialogProps, 'userId'>) {
  const { dict } = useLocale();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [useRAG, setUseRAG] = useState(false); // RAG 开关
  const [useAgent, setUseAgent] = useState(false); // Agent 开关

  // 使用本地状态管理临时消息和加载状态
  const [tempMessages, setTempMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [thinkingStates, setThinkingStates] = useState<Map<string, string>>(new Map()); // 存储思考内容

  // 获取当前会话的加载状态
  const isLoading = currentSessionId ? (loadingStates.get(currentSessionId) || false) : false;

  // 设置特定会话的加载状态
  const setSessionLoading = (sessionId: string, loading: boolean) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      if (loading) {
        newMap.set(sessionId, true);
      } else {
        newMap.delete(sessionId);
      }
      return newMap;
    });
  };

  // 清理会话状态
  const clearSessionState = (sessionId: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(sessionId);
      return newMap;
    });
    setTempMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(sessionId);
      return newMap;
    });
    setThinkingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(sessionId);
      return newMap;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 获取用户会话信息
  const { data: session } = useSession();

  // 获取 query client 用于手动更新缓存
  const queryClient = trpcClientReact.useUtils();

  // 自动调整输入框高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 128; // max-h-32 = 8rem = 128px
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, []);

  // 当消息内容变化时调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // 获取会话列表
  const { data: sessions, refetch: refetchSessions } = trpcClientReact.chat.getSessions.useQuery(
    undefined,
    { enabled: open }
  );

  // 获取当前会话详情
  const { data: sessionData, refetch: refetchCurrentSession } = trpcClientReact.chat.getSession.useQuery(
    { sessionId: currentSessionId! },
    {
      enabled: !!currentSessionId && !!sessions?.find(s => s.id === currentSessionId) // 确保会话存在于列表中
    }
  );

  // 将后端返回的数据结构转换为前端期望的格式，并合并临时消息
  const currentSession = sessionData ? {
    ...sessionData.session,
    messages: (() => {
      let messages = sessionData.messages || [];

      // 合并当前会话的临时消息
      if (currentSessionId && tempMessages.has(currentSessionId)) {
        const sessionTempMessages = tempMessages.get(currentSessionId) || [];

        // 只过滤重复的用户消息，AI消息直接添加
        const filteredTempMessages = sessionTempMessages.filter(tempMsg => {
          if (tempMsg.role === 'user') {
            // 检查是否已经有相同内容的用户消息
            const isDuplicate = messages.some(dbMsg =>
              dbMsg.role === 'user' && dbMsg.content === tempMsg.content
            );
            return !isDuplicate;
          }
          // AI消息直接通过，不过滤
          return true;
        });

        messages = [...messages, ...filteredTempMessages];
      }

      return messages;
    })()
  } : null;

  // 检查连接状态
  const { data: connectionStatus } = trpcClientReact.chat.checkConnection.useQuery(
    undefined,
    { enabled: open, refetchInterval: 30000 }
  );

  // Mutations
  const createSessionMutation = trpcClientReact.chat.createSession.useMutation();
  const deleteSessionMutation = trpcClientReact.chat.deleteSession.useMutation();
  const updateTitleMutation = trpcClientReact.chat.updateSessionTitle.useMutation();

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      const scrollContainer = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 50);
      }
    }
  }, []);

  // 强制滚动到底部
  const forceScrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      const scrollContainer = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 150);
      }
    }
  }, []);

  // 当消息变化时滚动到底部
  useEffect(() => {
    if (currentSession?.messages) {
      scrollToBottom();
    }
  }, [currentSession?.messages, scrollToBottom]);

  // 当对话框打开且有当前会话时，自动滚动到底部
  useEffect(() => {
    if (open && currentSession?.messages && currentSession.messages.length > 0) {
      const timer = setTimeout(() => {
        forceScrollToBottom();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, currentSession?.messages, forceScrollToBottom]);

  // 当切换会话时，也自动滚动到底部
  useEffect(() => {
    if (currentSessionId && currentSession?.messages && currentSession.messages.length > 0) {
      const timer = setTimeout(() => {
        forceScrollToBottom();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentSessionId, currentSession?.messages, forceScrollToBottom]);

  // 当切换到一个会话时，如果该会话正在加载，重新获取数据以确保不丢失回复
  useEffect(() => {
    if (currentSessionId && loadingStates.get(currentSessionId)) {
      const timer = setTimeout(() => {
        refetchCurrentSession();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentSessionId, loadingStates, refetchCurrentSession]);

  // 创建新会话
  const handleCreateSession = useCallback(async () => {
    try {
      const session = await createSessionMutation.mutateAsync({
        title: dict.chat.newChat,
      });
      setCurrentSessionId(session.id);
      await refetchSessions();
      toast.success("创建新对话成功");
    } catch (error) {
      toast.error("创建对话失败");
      console.error(error);
    }
  }, [createSessionMutation, refetchSessions, dict.chat.newChat]);

  // 发送消息（流式）
  const handleSendMessage = async () => {
    if (!message.trim() || !currentSessionId || isLoading) return;

    const userMessage = message.trim();
    const targetSessionId = currentSessionId; // 保存发送时的会话ID
    setMessage("");

    // 设置当前会话的加载状态
    setSessionLoading(targetSessionId, true);

    // 立即创建一个临时的用户消息对象和空的AI消息对象
    const tempUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: targetSessionId,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    const tempAIMessageId = crypto.randomUUID();
    const tempAIMessage: ChatMessage = {
      id: tempAIMessageId,
      sessionId: targetSessionId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    // 使用本地状态立即添加临时消息，提供即时反馈
    setTempMessages(prev => {
      const newMap = new Map(prev);
      const sessionTempMessages = newMap.get(targetSessionId) || [];
      newMap.set(targetSessionId, [...sessionTempMessages, tempUserMessage, tempAIMessage]);
      return newMap;
    });

    try {
      // 如果使用 Agent 模式，调用 Agent API
      if (useAgent) {
        // 使用 Agent 流式 API
        const response = await fetch('/api/chat/agent-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: targetSessionId,
            content: userMessage,
            model: connectionStatus?.model,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'userMessage') {
                    continue;
                  } else if (data.type === 'streamStart') {
                    continue;
                  } else if (data.type === 'toolCall') {
                    // 显示工具调用信息
                    if (data.sessionId === targetSessionId) {
                      setThinkingStates(prev => {
                        const newMap = new Map(prev);
                        newMap.set(targetSessionId, `🔧 正在调用工具: ${data.toolName}\n参数: ${JSON.stringify(data.args, null, 2)}`);
                        return newMap;
                      });
                    }
                  } else if (data.type === 'toolResult') {
                    // 显示工具执行结果
                    if (data.sessionId === targetSessionId) {
                      setThinkingStates(prev => {
                        const newMap = new Map(prev);
                        const current = newMap.get(targetSessionId) || '';
                        newMap.set(targetSessionId, `${current}\n\n✅ 工具执行完成`);
                        return newMap;
                      });
                      // 2秒后清除工具调用信息
                      setTimeout(() => {
                        setThinkingStates(prev => {
                          const newMap = new Map(prev);
                          newMap.delete(targetSessionId);
                          return newMap;
                        });
                      }, 2000);
                    }
                  } else if (data.type === 'streamChunk') {
                    // 更新本地状态中的临时AI消息
                    if (data.sessionId === targetSessionId) {
                      setTempMessages(prev => {
                        const newMap = new Map(prev);
                        const sessionTempMessages = newMap.get(targetSessionId) || [];
                        const updatedMessages = sessionTempMessages.map(msg => {
                          if (msg.id === tempAIMessageId) {
                            return { ...msg, content: data.fullContent };
                          }
                          return msg;
                        });
                        newMap.set(targetSessionId, updatedMessages);
                        return newMap;
                      });
                    }
                  } else if (data.type === 'streamEnd') {
                    // 流式结束，清除临时消息并重新获取数据
                    if (data.sessionId === targetSessionId) {
                      setTempMessages(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(targetSessionId);
                        return newMap;
                      });
                      setSessionLoading(targetSessionId, false);
                      setTimeout(() => {
                        queryClient.chat.getSession.invalidate({ sessionId: targetSessionId });
                      }, 100);
                    }
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch {
                  console.warn('Failed to parse stream data:', line);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // 使用原有的流式API（普通模式或 RAG 模式）
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: targetSessionId,
            content: userMessage,
            model: connectionStatus?.model,
            useRAG: useRAG,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'userMessage') {
                    continue;
                  } else if (data.type === 'streamStart') {
                    continue;
                  } else if (data.type === 'thinking') {
                    if (data.sessionId === targetSessionId) {
                      setThinkingStates(prev => {
                        const newMap = new Map(prev);
                        newMap.set(targetSessionId, data.fullThinking || data.content);
                        return newMap;
                      });
                    }
                  } else if (data.type === 'thinkingEnd') {
                    if (data.sessionId === targetSessionId) {
                      setThinkingStates(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(targetSessionId);
                        return newMap;
                      });
                    }
                  } else if (data.type === 'streamChunk') {
                    if (data.sessionId === targetSessionId) {
                      setTempMessages(prev => {
                        const newMap = new Map(prev);
                        const sessionTempMessages = newMap.get(targetSessionId) || [];
                        const updatedMessages = sessionTempMessages.map(msg => {
                          if (msg.id === tempAIMessageId) {
                            return { ...msg, content: data.fullContent };
                          }
                          return msg;
                        });
                        newMap.set(targetSessionId, updatedMessages);
                        return newMap;
                      });
                    }
                  } else if (data.type === 'streamEnd') {
                    if (data.sessionId === targetSessionId) {
                      setTempMessages(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(targetSessionId);
                        return newMap;
                      });
                      setSessionLoading(targetSessionId, false);
                      setTimeout(() => {
                        queryClient.chat.getSession.invalidate({ sessionId: targetSessionId });
                      }, 100);
                    }
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch {
                  console.warn('Failed to parse stream data:', line);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // 重新获取会话列表以更新时间戳
      await refetchSessions();
    } catch (error) {
      // 发送失败时，清除临时消息
      setTempMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(targetSessionId);
        return newMap;
      });
      toast.error("发送消息失败");
      console.error(error);
    } finally {
      // 清除目标会话的加载状态
      setSessionLoading(targetSessionId, false);
      inputRef.current?.focus();
    }
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string) => {
    try {
      const isDeletingCurrentSession = currentSessionId === sessionId;

      // 先清理当前会话状态
      if (isDeletingCurrentSession) {
        setCurrentSessionId(null);
        clearSessionState(sessionId);
        queryClient.chat.getSession.setData({ sessionId }, undefined);
      }

      await deleteSessionMutation.mutateAsync({ sessionId });
      const updatedSessions = await refetchSessions();

      // 如果删除的是当前会话，且还有其他会话，则切换到第一个会话
      if (isDeletingCurrentSession && updatedSessions.data && updatedSessions.data.length > 0) {
        // 确保切换到的会话不是刚删除的会话
        const nextSession = updatedSessions.data.find(s => s.id !== sessionId);
        if (nextSession) {
          setTimeout(() => {
            setCurrentSessionId(nextSession.id);
          }, 100);
        }
      }

      toast.success("删除对话成功");
    } catch (error) {
      toast.error("删除对话失败");
      console.error(error);
    }
  };

  // 更新会话标题
  const handleUpdateTitle = async (sessionId: string, title: string) => {
    try {
      await updateTitleMutation.mutateAsync({ sessionId, title });
      await refetchSessions();
      setEditingTitle(null);
      toast.success("更新标题成功");
    } catch (error) {
      toast.error("更新标题失败");
      console.error(error);
    }
  };

  // 当对话框关闭时清理状态
  useEffect(() => {
    if (!open) {
      setLoadingStates(new Map());
      setTempMessages(new Map());
      setThinkingStates(new Map());
      setCurrentSessionId(null);
      setMessage("");
      setEditingTitle(null);
      setNewTitle("");
    }
  }, [open]);

  // 检查当前会话是否仍然存在，如果不存在则清理状态
  useEffect(() => {
    if (currentSessionId && sessions && sessions.length > 0) {
      const currentSessionExists = sessions.find(s => s.id === currentSessionId);
      if (!currentSessionExists) {
        // 当前会话已被删除，清理状态
        setCurrentSessionId(null);
        clearSessionState(currentSessionId);
      }
    } else if (currentSessionId && sessions && sessions.length === 0) {
      // 所有会话都被删除了，清理状态
      setCurrentSessionId(null);
      setTempMessages(new Map());
      setLoadingStates(new Map());
    }
  }, [sessions, currentSessionId]);

  // 自动选择第一个会话（不自动创建）
  useEffect(() => {
    if (open && sessions && sessions.length > 0 && !currentSessionId) {
      // 确保选择的会话确实存在于会话列表中
      const firstValidSession = sessions[0];
      if (firstValidSession) {
        setCurrentSessionId(firstValidSession.id);
      }
    }
  }, [open, sessions, currentSessionId]);

  const getConnectionStatusIcon = () => {
    if (!connectionStatus) return <AlertCircle className="h-4 w-4 text-gray-400" />;
    if (connectionStatus.connected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getConnectionStatusText = () => {
    if (!connectionStatus) return "检查中...";
    if (connectionStatus.connected) return `已连接 (${connectionStatus.model})`;
    return "连接失败";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-full w-[90vw] h-[85vh] max-h-[800px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              AI 助手
              {useAgent && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  🤖 Agent 模式
                </span>
              )}
              {useRAG && !useAgent && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  📚 知识库模式
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {getConnectionStatusIcon()}
              <span className="text-sm text-muted-foreground">
                {getConnectionStatusText()}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 侧边栏 - 会话列表 */}
          <div className="w-64 border-r bg-muted/30 flex flex-col min-h-0">
            <div className="p-4 border-b shrink-0">
              <Button
                onClick={handleCreateSession}
                className="w-full"
                size="sm"
                disabled={createSessionMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                新对话
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-2 space-y-1">
                {sessions?.map((session: ChatSession) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative p-3 rounded-lg cursor-pointer transition-colors",
                      "hover:bg-muted",
                      currentSessionId === session.id && "bg-muted border"
                    )}
                    onClick={() => setCurrentSessionId(session.id)}
                  >
                    {editingTitle === session.id ? (
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={() => {
                          if (newTitle.trim()) {
                            handleUpdateTitle(session.id, newTitle.trim());
                          } else {
                            setEditingTitle(null);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && newTitle.trim()) {
                            handleUpdateTitle(session.id, newTitle.trim());
                          }
                        }}
                        className="h-6 text-sm"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="text-sm font-medium truncate pr-8">
                          {session.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : ''}
                        </div>

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTitle(session.id);
                                setNewTitle(session.title);
                              }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除对话</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除对话 &quot;{session.title}&quot; 吗？
                                    <br />
                                    <span className="text-red-600 font-medium">
                                      此操作不可撤销，对话中的所有消息都将被永久删除。
                                    </span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSession(session.id)}
                                    disabled={deleteSessionMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {deleteSessionMutation.isPending ? "删除中..." : dict.chat.confirmDelete}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 主聊天区域 */}
          <div className="flex-1 flex flex-col min-h-0">
            {currentSession ? (
              <>
                {/* 消息区域 */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea ref={scrollContainerRef} className="h-full">
                    <div className="p-4 space-y-4">
                      {currentSession.messages?.map((msg: ChatMessage) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.role === "assistant" && (
                            <div className="shrink-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                          )}

                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-4 py-2 wrap-break-word",
                              msg.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-muted"
                            )}
                          >
                            <div className="text-sm whitespace-pre-wrap wrap-break-word overflow-wrap-anywhere">
                              {msg.content ? (
                                msg.content
                              ) : msg.role === "assistant" && !msg.content && loadingStates.get(msg.sessionId) ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                  </div>
                                  <span className="text-sm text-muted-foreground">AI 正在思考...</span>
                                </div>
                              ) : (
                                msg.content || ""
                              )}
                            </div>
                          </div>

                          {msg.role === "user" && (
                            <div className="shrink-0">
                              <UserAvatar user={session?.user} />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* 显示思考过程 */}
                      {currentSessionId && thinkingStates.get(currentSessionId) && (
                        <div className="flex gap-3 justify-start">
                          <div className="shrink-0">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-purple-600" />
                            </div>
                          </div>
                          <div className="max-w-[70%] rounded-lg px-4 py-2 bg-purple-50 border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                              </div>
                              <span className="text-sm text-purple-600 font-medium">AI 正在深度思考...</span>
                            </div>
                            <div className="text-sm text-purple-700 whitespace-pre-wrap bg-white rounded p-2 border border-purple-100">
                              {thinkingStates.get(currentSessionId)}
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* 输入区域 */}
                <div className="border-t p-4 shrink-0">
                  {/* 模式选择 */}
                  <div className="flex items-center gap-4 mb-3 pb-2 border-b">
                    {/* 普通模式 */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="chatMode"
                        checked={!useRAG && !useAgent}
                        onChange={() => {
                          setUseRAG(false);
                          setUseAgent(false);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-muted-foreground">
                        💬 普通对话
                      </span>
                    </label>

                    {/* RAG 模式 */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="chatMode"
                        checked={useRAG && !useAgent}
                        onChange={() => {
                          setUseRAG(true);
                          setUseAgent(false);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-muted-foreground">
                        🧠 知识库增强
                      </span>
                    </label>

                    {/* Agent 模式 */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="chatMode"
                        checked={useAgent}
                        onChange={() => {
                          setUseRAG(false);
                          setUseAgent(true);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-muted-foreground">
                        🤖 智能助手 (Agent)
                      </span>
                    </label>

                    {/* 模式说明 */}
                    {useAgent && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded ml-auto">
                        ✨ 可执行操作：文件管理、应用管理、知识查询
                      </div>
                    )}
                    {useRAG && !useAgent && (
                      <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded ml-auto">
                        📚 基于系统知识库回答
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 items-end">
                    <Textarea
                      ref={inputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
                      disabled={isLoading || !connectionStatus?.connected}
                      className="flex-1 min-h-[44px] max-h-32 resize-none overflow-y-auto"
                      rows={1}
                      style={{ height: '44px' }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isLoading || !connectionStatus?.connected}
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {!connectionStatus?.connected && (
                    <div className="mt-2 text-sm text-red-500 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      无法连接到 Ollama，请确保 Ollama 服务正在运行
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                {useAgent ? (
                  <AgentWelcome />
                ) : (
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">选择一个对话开始聊天</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}