export interface BatchProcessingConfig {
  // 并发控制
  maxConcurrency: number;
  
  // 重试机制
  retryAttempts: number;
  retryDelay: number;
  
  // 超时设置
  timeoutMs: number;
  
  // 限流设置
  rateLimitPerMinute: number;
  
  // WebSocket 设置
  websocket: {
    port: number;
    heartbeatInterval: number;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  
  // Python API 设置
  pythonApi: {
    baseUrl: string;
    timeout: number;
    maxRetries: number;
  };
}

// 根据用户计划获取配置
export function getBatchProcessingConfig(userPlan: 'free' | 'payed'): BatchProcessingConfig {
  const baseConfig: BatchProcessingConfig = {
    maxConcurrency: 2,
    retryAttempts: 3,
    retryDelay: 1000,
    timeoutMs: 300000, // 5 minutes
    rateLimitPerMinute: 10,
    websocket: {
      port: 3001,
      heartbeatInterval: 30000,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
    },
    pythonApi: {
      baseUrl: process.env.PYTHON_API_URL || 'http://localhost:8000',
      timeout: 120000, // 2 minutes
      maxRetries: 2,
    },
  };

  // 付费用户享受更高的并发和更宽松的限制
  if (userPlan === 'payed') {
    return {
      ...baseConfig,
      maxConcurrency: 5,
      rateLimitPerMinute: 50,
      retryAttempts: 5,
      timeoutMs: 600000, // 10 minutes
      pythonApi: {
        ...baseConfig.pythonApi,
        timeout: 300000, // 5 minutes
        maxRetries: 3,
      },
    };
  }

  return baseConfig;
}

// 环境变量配置
export const ENV_CONFIG = {
  PYTHON_API_URL: process.env.PYTHON_API_URL || 'http://localhost:8000',
  WEBSOCKET_PORT: parseInt(process.env.WEBSOCKET_PORT || '3001'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  DATABASE_URL: process.env.DATABASE_URL,
  
  // 存储配置
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
};

// 验证必要的环境变量
export function validateEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'PYTHON_API_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// 批量处理状态
export const BATCH_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type BatchStatus = typeof BATCH_STATUS[keyof typeof BATCH_STATUS];

// 任务优先级
export const TASK_PRIORITY = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

// 错误类型
export const ERROR_TYPES = {
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  API_ERROR: 'api_error',
  PROCESSING_ERROR: 'processing_error',
  VALIDATION_ERROR: 'validation_error',
  QUOTA_EXCEEDED: 'quota_exceeded',
} as const;

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];