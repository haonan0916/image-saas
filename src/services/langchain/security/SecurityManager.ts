// LangChain 安全管理器
import { 
  ChatMessage, 
  ChatOptions, 
  ChatServiceError,
  ValidationResult 
} from '../../../types/langchain';

/**
 * 安全配置
 */
export interface SecurityConfig {
  enableInputValidation: boolean;
  enableOutputSanitization: boolean;
  enableRateLimit: boolean;
  maxMessageLength: number;
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  allowedRoles: string[];
  blockedPatterns: RegExp[];
  sensitiveDataPatterns: RegExp[];
}

/**
 * 速率限制状态
 */
interface RateLimitState {
  minuteCount: number;
  hourCount: number;
  lastMinuteReset: number;
  lastHourReset: number;
}

/**
 * 安全管理器
 * 处理输入验证、输出清理、速率限制等安全功能
 */
export class SecurityManager {
  private config: SecurityConfig;
  private rateLimitStates: Map<string, RateLimitState> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableInputValidation: true,
      enableOutputSanitization: true,
      enableRateLimit: true,
      maxMessageLength: 10000,
      maxMessagesPerMinute: 60,
      maxMessagesPerHour: 1000,
      allowedRoles: ['user', 'assistant', 'system'],
      blockedPatterns: [
        /(?:password|secret|key|token)\s*[:=]\s*\S+/gi,
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /data:text\/html/gi
      ],
      sensitiveDataPatterns: [
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
        /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g // Phone numbers
      ],
      ...config
    };
  }

  /**
   * 验证聊天消息
   */
  validateChatMessages(messages: ChatMessage[]): ValidationResult {
    if (!this.config.enableInputValidation) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查消息数组
    if (!Array.isArray(messages)) {
      errors.push('Messages must be an array');
      return { isValid: false, errors, warnings };
    }

    if (messages.length === 0) {
      errors.push('Messages array cannot be empty');
      return { isValid: false, errors, warnings };
    }

    if (messages.length > 100) {
      errors.push('Too many messages in conversation (max: 100)');
      return { isValid: false, errors, warnings };
    }

    // 验证每个消息
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageErrors = this.validateSingleMessage(message, i);
      errors.push(...messageErrors.errors);
      warnings.push(...messageErrors.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证单个消息
   */
  private validateSingleMessage(message: ChatMessage, index: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查消息结构
    if (!message || typeof message !== 'object') {
      errors.push(`Message at index ${index} must be an object`);
      return { isValid: false, errors, warnings };
    }

    // 检查必需字段
    if (!message.role) {
      errors.push(`Message at index ${index} missing required field: role`);
    } else if (!this.config.allowedRoles.includes(message.role)) {
      errors.push(`Message at index ${index} has invalid role: ${message.role}`);
    }

    if (!message.content) {
      errors.push(`Message at index ${index} missing required field: content`);
    } else if (typeof message.content !== 'string') {
      errors.push(`Message at index ${index} content must be a string`);
    } else {
      // 检查内容长度
      if (message.content.length > this.config.maxMessageLength) {
        errors.push(`Message at index ${index} exceeds maximum length (${this.config.maxMessageLength} characters)`);
      }

      // 检查被阻止的模式
      for (const pattern of this.config.blockedPatterns) {
        if (pattern.test(message.content)) {
          errors.push(`Message at index ${index} contains blocked content`);
          break;
        }
      }

      // 检查敏感数据
      for (const pattern of this.config.sensitiveDataPatterns) {
        if (pattern.test(message.content)) {
          warnings.push(`Message at index ${index} may contain sensitive data`);
          break;
        }
      }
    }

    // 检查时间戳
    if (message.timestamp && !(message.timestamp instanceof Date)) {
      warnings.push(`Message at index ${index} has invalid timestamp format`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证聊天选项
   */
  validateChatOptions(options?: ChatOptions): ValidationResult {
    if (!this.config.enableInputValidation || !options) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证温度参数
    if (options.temperature !== undefined) {
      if (typeof options.temperature !== 'number') {
        errors.push('Temperature must be a number');
      } else if (options.temperature < 0 || options.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
    }

    // 验证最大令牌数
    if (options.maxTokens !== undefined) {
      if (typeof options.maxTokens !== 'number') {
        errors.push('MaxTokens must be a number');
      } else if (options.maxTokens < 1 || options.maxTokens > 100000) {
        errors.push('MaxTokens must be between 1 and 100000');
      }
    }

    // 验证 topP 参数
    if (options.topP !== undefined) {
      if (typeof options.topP !== 'number') {
        errors.push('TopP must be a number');
      } else if (options.topP < 0 || options.topP > 1) {
        errors.push('TopP must be between 0 and 1');
      }
    }

    // 验证超时
    if (options.timeout !== undefined) {
      if (typeof options.timeout !== 'number') {
        errors.push('Timeout must be a number');
      } else if (options.timeout < 1000 || options.timeout > 300000) {
        warnings.push('Timeout should be between 1000ms and 300000ms');
      }
    }

    // 验证模型名称
    if (options.model !== undefined) {
      if (typeof options.model !== 'string') {
        errors.push('Model must be a string');
      } else if (options.model.length === 0) {
        errors.push('Model name cannot be empty');
      } else if (!/^[a-zA-Z0-9\-_\/:.]+$/.test(options.model)) {
        errors.push('Model name contains invalid characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 清理输出内容
   */
  sanitizeOutput(content: string): string {
    if (!this.config.enableOutputSanitization) {
      return content;
    }

    let sanitized = content;

    // 移除潜在的脚本标签
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // 移除 javascript: 协议
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // 移除 data: URLs
    sanitized = sanitized.replace(/data:text\/html[^"'\s>]*/gi, '');

    // 移除其他潜在的危险内容
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    return sanitized;
  }

  /**
   * 检查速率限制
   */
  checkRateLimit(clientId: string): { allowed: boolean; resetTime?: number } {
    if (!this.config.enableRateLimit) {
      return { allowed: true };
    }

    const now = Date.now();
    let state = this.rateLimitStates.get(clientId);

    if (!state) {
      state = {
        minuteCount: 0,
        hourCount: 0,
        lastMinuteReset: now,
        lastHourReset: now
      };
      this.rateLimitStates.set(clientId, state);
    }

    // 重置分钟计数器
    if (now - state.lastMinuteReset >= 60000) {
      state.minuteCount = 0;
      state.lastMinuteReset = now;
    }

    // 重置小时计数器
    if (now - state.lastHourReset >= 3600000) {
      state.hourCount = 0;
      state.lastHourReset = now;
    }

    // 检查限制
    if (state.minuteCount >= this.config.maxMessagesPerMinute) {
      return {
        allowed: false,
        resetTime: state.lastMinuteReset + 60000
      };
    }

    if (state.hourCount >= this.config.maxMessagesPerHour) {
      return {
        allowed: false,
        resetTime: state.lastHourReset + 3600000
      };
    }

    // 增加计数器
    state.minuteCount++;
    state.hourCount++;

    return { allowed: true };
  }

  /**
   * 安全地处理 API 密钥
   */
  secureApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '[INVALID]';
    }

    // 只显示前4个和后4个字符
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.max(0, apiKey.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * 检查字符串是否包含敏感数据
   */
  containsSensitiveData(text: string): boolean {
    for (const pattern of this.config.sensitiveDataPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 移除敏感数据
   */
  removeSensitiveData(text: string): string {
    let cleaned = text;
    
    for (const pattern of this.config.sensitiveDataPatterns) {
      cleaned = cleaned.replace(pattern, '[REDACTED]');
    }
    
    return cleaned;
  }

  /**
   * 验证请求来源
   */
  validateRequestOrigin(origin?: string, allowedOrigins: string[] = []): boolean {
    if (!origin || allowedOrigins.length === 0) {
      return true; // 如果没有配置限制，允许所有来源
    }

    return allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.startsWith('*.')) {
        const domain = allowed.substring(2);
        return origin.endsWith(domain);
      }
      return origin === allowed;
    });
  }

  /**
   * 生成安全的会话ID
   */
  generateSecureSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return `${timestamp}-${randomBytes}`;
  }

  /**
   * 清理速率限制状态（定期清理）
   */
  cleanupRateLimitStates(): void {
    const now = Date.now();
    const oneHour = 3600000;

    for (const [clientId, state] of this.rateLimitStates.entries()) {
      // 如果状态超过1小时没有更新，删除它
      if (now - state.lastHourReset > oneHour) {
        this.rateLimitStates.delete(clientId);
      }
    }
  }

  /**
   * 获取安全统计信息
   */
  getSecurityStats(): {
    totalClients: number;
    activeRateLimits: number;
    config: Partial<SecurityConfig>;
  } {
    return {
      totalClients: this.rateLimitStates.size,
      activeRateLimits: Array.from(this.rateLimitStates.values())
        .filter(state => state.minuteCount > 0 || state.hourCount > 0).length,
      config: {
        enableInputValidation: this.config.enableInputValidation,
        enableOutputSanitization: this.config.enableOutputSanitization,
        enableRateLimit: this.config.enableRateLimit,
        maxMessageLength: this.config.maxMessageLength,
        maxMessagesPerMinute: this.config.maxMessagesPerMinute,
        maxMessagesPerHour: this.config.maxMessagesPerHour
      }
    };
  }

  /**
   * 更新安全配置
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}