// LangChain 可观测性管理器
import { ModelProvider } from '../../../types/langchain';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  provider?: ModelProvider;
  requestId?: string;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  cacheHitRate: number;
}

/**
 * 提供商指标
 */
export interface ProviderMetrics {
  provider: ModelProvider;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * 跟踪上下文
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  metadata?: Record<string, any>;
}

/**
 * 可观测性配置
 */
export interface ObservabilityConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  logLevel: LogLevel;
  metricsRetentionDays: number;
  tracingRetentionDays: number;
  excludeSensitiveData: boolean;
}

/**
 * 可观测性管理器
 */
export class ObservabilityManager {
  private config: ObservabilityConfig;
  private logs: LogEntry[] = [];
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private providerMetrics: Map<ModelProvider, ProviderMetrics> = new Map();
  private traces: Map<string, TraceContext> = new Map();
  private activeSpans: Map<string, TraceContext> = new Map();

  constructor(config: ObservabilityConfig) {
    this.config = config;
    
    // 定期清理过期数据
    setInterval(() => {
      this.cleanupExpiredData();
    }, 24 * 60 * 60 * 1000); // 每天清理一次
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, message: string, metadata?: Record<string, any>, provider?: ModelProvider, requestId?: string): void {
    if (!this.config.enableLogging) return;
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata: this.sanitizeMetadata(metadata),
      provider,
      requestId
    };

    this.logs.push(logEntry);

    // 限制日志数量
    if (this.logs.length > 10000) {
      this.logs.shift();
    }

    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  /**
   * 记录调试信息
   */
  debug(message: string, metadata?: Record<string, any>, provider?: ModelProvider, requestId?: string): void {
    this.log(LogLevel.DEBUG, message, metadata, provider, requestId);
  }

  /**
   * 记录信息
   */
  info(message: string, metadata?: Record<string, any>, provider?: ModelProvider, requestId?: string): void {
    this.log(LogLevel.INFO, message, metadata, provider, requestId);
  }

  /**
   * 记录警告
   */
  warn(message: string, metadata?: Record<string, any>, provider?: ModelProvider, requestId?: string): void {
    this.log(LogLevel.WARN, message, metadata, provider, requestId);
  }

  /**
   * 记录错误
   */
  error(message: string, metadata?: Record<string, any>, provider?: ModelProvider, requestId?: string): void {
    this.log(LogLevel.ERROR, message, metadata, provider, requestId);
  }

  /**
   * 记录性能指标
   */
  recordMetrics(key: string, metrics: Partial<PerformanceMetrics>): void {
    if (!this.config.enableMetrics) return;

    const existing = this.metrics.get(key) || {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      throughput: 0,
      activeConnections: 0,
      cacheHitRate: 0
    };

    this.metrics.set(key, { ...existing, ...metrics });
  }

  /**
   * 记录提供商指标
   */
  recordProviderMetrics(provider: ModelProvider, responseTime: number, isError: boolean = false): void {
    if (!this.config.enableMetrics) return;

    const existing = this.providerMetrics.get(provider) || {
      provider,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      healthStatus: 'healthy' as const
    };

    existing.requestCount++;
    existing.lastRequestTime = new Date();

    if (isError) {
      existing.errorCount++;
      existing.healthStatus = existing.errorCount / existing.requestCount > 0.1 ? 'degraded' : 'healthy';
    } else {
      existing.successCount++;
    }

    // 更新平均响应时间
    existing.averageResponseTime = 
      (existing.averageResponseTime * (existing.requestCount - 1) + responseTime) / existing.requestCount;

    this.providerMetrics.set(provider, existing);
  }

  /**
   * 开始跟踪
   */
  startTrace(operation: string, metadata?: Record<string, any>): string {
    if (!this.config.enableTracing) return '';

    const traceId = this.generateId();
    const spanId = this.generateId();

    const trace: TraceContext = {
      traceId,
      spanId,
      operation,
      startTime: new Date(),
      status: 'pending',
      metadata: this.sanitizeMetadata(metadata)
    };

    this.traces.set(traceId, trace);
    this.activeSpans.set(spanId, trace);

    return traceId;
  }

  /**
   * 开始子跨度
   */
  startSpan(traceId: string, operation: string, metadata?: Record<string, any>): string {
    if (!this.config.enableTracing) return '';

    const parentTrace = this.traces.get(traceId);
    if (!parentTrace) return '';

    const spanId = this.generateId();
    const span: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentTrace.spanId,
      operation,
      startTime: new Date(),
      status: 'pending',
      metadata: this.sanitizeMetadata(metadata)
    };

    this.activeSpans.set(spanId, span);
    return spanId;
  }

  /**
   * 结束跨度
   */
  endSpan(spanId: string, status: 'success' | 'error' = 'success', metadata?: Record<string, any>): void {
    if (!this.config.enableTracing) return;

    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;
    
    if (metadata) {
      span.metadata = { ...span.metadata, ...this.sanitizeMetadata(metadata) };
    }

    this.activeSpans.delete(spanId);
  }

  /**
   * 获取日志
   */
  getLogs(level?: LogLevel, provider?: ModelProvider, limit: number = 100): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (provider) {
      filteredLogs = filteredLogs.filter(log => log.provider === provider);
    }

    return filteredLogs.slice(-limit);
  }

  /**
   * 获取性能指标
   */
  getMetrics(key?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (key) {
      return this.metrics.get(key) || {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        activeConnections: 0,
        cacheHitRate: 0
      };
    }
    return new Map(this.metrics);
  }

  /**
   * 获取提供商指标
   */
  getProviderMetrics(provider?: ModelProvider): ProviderMetrics | ProviderMetrics[] {
    if (provider) {
      return this.providerMetrics.get(provider) || {
        provider,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        healthStatus: 'healthy'
      };
    }
    return Array.from(this.providerMetrics.values());
  }

  /**
   * 获取跟踪信息
   */
  getTrace(traceId: string): TraceContext | undefined {
    return this.traces.get(traceId);
  }

  /**
   * 获取所有跟踪
   */
  getAllTraces(limit: number = 100): TraceContext[] {
    return Array.from(this.traces.values()).slice(-limit);
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): Record<string, any> {
    const providerHealth = Array.from(this.providerMetrics.values()).reduce((acc, metrics) => {
      acc[metrics.provider] = {
        status: metrics.healthStatus,
        requestCount: metrics.requestCount,
        errorRate: metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0,
        averageResponseTime: metrics.averageResponseTime
      };
      return acc;
    }, {} as Record<string, any>);

    return {
      overall: this.calculateOverallHealth(),
      providers: providerHealth,
      metrics: {
        totalLogs: this.logs.length,
        totalTraces: this.traces.size,
        activeSpans: this.activeSpans.size
      }
    };
  }

  /**
   * 清理过期数据
   */
  private cleanupExpiredData(): void {
    const now = new Date();
    const metricsRetentionMs = this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const tracingRetentionMs = this.config.tracingRetentionDays * 24 * 60 * 60 * 1000;

    // 清理过期日志
    this.logs = this.logs.filter(log => 
      now.getTime() - log.timestamp.getTime() < metricsRetentionMs
    );

    // 清理过期跟踪
    for (const [traceId, trace] of this.traces.entries()) {
      if (now.getTime() - trace.startTime.getTime() > tracingRetentionMs) {
        this.traces.delete(traceId);
      }
    }
  }

  /**
   * 判断是否应该记录日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * 清理敏感数据
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata || !this.config.excludeSensitiveData) return metadata;

    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    const sanitized = { ...metadata };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  /**
   * 计算整体健康状态
   */
  private calculateOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const providers = Array.from(this.providerMetrics.values());
    if (providers.length === 0) return 'healthy';

    const unhealthyCount = providers.filter(p => p.healthStatus === 'unhealthy').length;
    const degradedCount = providers.filter(p => p.healthStatus === 'degraded').length;

    if (unhealthyCount > providers.length / 2) return 'unhealthy';
    if (degradedCount > 0 || unhealthyCount > 0) return 'degraded';
    return 'healthy';
  }
}