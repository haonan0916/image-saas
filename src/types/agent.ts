/**
 * Agent 相关类型定义
 */

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface AgentChatRequest {
  messages: AgentMessage[];
  modelId?: string;
  sessionId?: string;
  options?: AgentChatOptions;
}

export interface AgentChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AgentChatResponse {
  content: string;
  toolCalls?: ToolCallInfo[];
  modelId: string;
  timestamp: Date;
  sessionId?: string;
}

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, any>;
  result: string;
}

export interface AgentStreamChunk {
  content: string;
  isComplete: boolean;
  timestamp?: Date;
}

/**
 * Agent 会话管理
 */
export interface AgentSession {
  id: string;
  userId: string;
  messages: AgentMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent 统计信息
 */
export interface AgentStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  toolUsageCount: Record<string, number>;
}
