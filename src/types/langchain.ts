// LangChain 相关类型定义

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
  modelId?: string;
  options?: ChatOptions;
  sessionId?: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  timeout?: number;
  model?: string; // 允许在选项中指定模型
}

export interface ChatResponse {
  content: string;
  modelId: string;
  usage?: TokenUsage;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface ChatStreamChunk {
  content: string;
  isComplete: boolean;
  modelId: string;
  timestamp?: Date;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  providerId: string;
  capabilities: ModelCapabilities;
  pricing?: ModelPricing;
  description?: string;
  version?: string;
}

export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  maxTokens: number;
  supportedLanguages: string[];
  supportsVision?: boolean;
  supportsAudio?: boolean;
}

export interface ModelPricing {
  inputTokenPrice: number;
  outputTokenPrice: number;
  currency: string;
}

export interface ChatServiceConfig {
  defaultModel: string;
  fallbackChain: string[];
  providers: Record<string, ModelConfig>;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

export interface ModelConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout: number;
  retryAttempts: number;
  rateLimits: RateLimitConfig;
  models: string[];
  defaultModel?: string; // 该提供商的默认模型
}

export interface PerformanceConfig {
  connectionPoolSize: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  requestTimeout: number;
}

export interface SecurityConfig {
  validateInput: boolean;
  sanitizeOutput: boolean;
  logSensitiveData: boolean;
  rateLimitEnabled: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface ModelHealthStatus {
  modelId: string;
  providerId: string;
  isHealthy: boolean;
  lastChecked: Date;
  responseTime?: number;
  errorMessage?: string;
  availability?: number; // 可用性百分比
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 模型提供商枚举
export enum ModelProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini'
}

// 回退策略枚举
export enum FallbackStrategy {
  SEQUENTIAL = 'sequential',
  PRIORITY = 'priority',
  ROUND_ROBIN = 'round_robin'
}

// 故障统计信息
export interface FailureStats {
  providerId: ModelProvider;
  failureCount: number;
  lastFailureTime?: Date;
  isHealthy: boolean;
  successRate: number;
  totalRequests: number;
  isCircuitBreakerOpen: boolean;
}

// 聊天事件类型
export enum ChatEventType {
  MESSAGE_START = 'message_start',
  MESSAGE_CHUNK = 'message_chunk',
  MESSAGE_END = 'message_end',
  ERROR = 'error',
  MODEL_SWITCH = 'model_switch'
}

// 聊天事件接口
export interface ChatEvent {
  type: ChatEventType;
  data: any;
  timestamp: Date;
  sessionId?: string;
  modelId?: string;
}

// 错误类型
export class ChatServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public modelId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

export class ModelUnavailableError extends ChatServiceError {
  constructor(modelId: string, provider: string) {
    super(`Model ${modelId} is unavailable`, 'MODEL_UNAVAILABLE', provider, modelId);
    this.name = 'ModelUnavailableError';
  }
}

export class ConfigurationError extends ChatServiceError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class RateLimitError extends ChatServiceError {
  constructor(provider: string, modelId?: string) {
    super(`Rate limit exceeded for provider ${provider}`, 'RATE_LIMIT_EXCEEDED', provider, modelId);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends ChatServiceError {
  constructor(provider: string, modelId?: string, timeout?: number) {
    super(`Request timeout after ${timeout}ms for provider ${provider}`, 'REQUEST_TIMEOUT', provider, modelId);
    this.name = 'TimeoutError';
  }
}