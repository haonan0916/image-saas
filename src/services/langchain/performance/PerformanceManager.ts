// LangChain 性能管理器
import { ModelProvider } from '../../../types/langchain';

/**
 * 性能配置
 */
export interface PerformanceConfig {
  connectionPoolSize: number;
  requestTimeout: number;
  cacheSize: number;
  cacheTTL: number;
  enableMetrics: boolean;
}

/**
 * 连接池配置
 */
export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
}

/**
 * 连接对象
 */
export interface Connection {
  provider: ModelProvider;
  id: string;
  createdAt: number;
  lastUsed: number;
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  activeConnections: number;
}

/**
 * 连接池管理器
 */
export class ConnectionPool {
  private connections: Map<string, Connection[]> = new Map();
  private config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig) {
    this.config = config;
  }

  /**
   * 获取连接
   */
  async acquire(provider: ModelProvider): Promise<Connection> {
    const providerKey = provider.toString();
    let pool = this.connections.get(providerKey);
    
    if (!pool) {
      pool = [];
      this.connections.set(providerKey, pool);
    }

    // 如果有可用连接，直接返回
    if (pool.length > 0) {
      const connection = pool.pop()!;
      connection.lastUsed = Date.now();
      return connection;
    }

    // 创建新连接
    return this.createConnection(provider);
  }

  /**
   * 释放连接
   */
  async release(provider: ModelProvider, connection: Connection): Promise<void> {
    const providerKey = provider.toString();
    const pool = this.connections.get(providerKey) || [];
    
    if (pool.length < this.config.maxConnections) {
      connection.lastUsed = Date.now();
      pool.push(connection);
    } else {
      // 连接池已满，关闭连接
      await this.closeConnection(connection);
    }
  }

  /**
   * 创建新连接
   */
  private async createConnection(provider: ModelProvider): Promise<Connection> {
    const now = Date.now();
    return {
      provider,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: now,
      lastUsed: now
    };
  }

  /**
   * 关闭连接
   */
  private async closeConnection(connection: Connection): Promise<void> {
    console.log(`Closing connection ${connection.id} for provider ${connection.provider}`);
  }

  /**
   * 获取活跃连接数
   */
  getActiveConnections(): number {
    let total = 0;
    for (const pool of this.connections.values()) {
      total += pool.length;
    }
    return total;
  }

  /**
   * 清理空闲连接
   */
  cleanupIdleConnections(): void {
    const now = Date.now();
    for (const [provider, pool] of this.connections.entries()) {
      const activeConnections = pool.filter(conn => 
        now - conn.lastUsed < this.config.idleTimeout
      );
      
      // 关闭空闲连接
      const idleConnections = pool.filter(conn => 
        now - conn.lastUsed >= this.config.idleTimeout
      );
      
      idleConnections.forEach(conn => this.closeConnection(conn));
      this.connections.set(provider, activeConnections);
    }
  }
}

/**
 * 性能管理器
 */
export class PerformanceManager {
  private config: PerformanceConfig;
  private connectionPool: ConnectionPool;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0,
    activeConnections: 0
  };
  private responseTimes: number[] = [];
  private cacheHits = 0;
  private cacheRequests = 0;

  constructor(config: PerformanceConfig) {
    this.config = config;
    this.connectionPool = new ConnectionPool({
      maxConnections: config.connectionPoolSize,
      minConnections: Math.floor(config.connectionPoolSize / 2),
      acquireTimeout: config.requestTimeout,
      idleTimeout: 30000
    });

    // 定期清理过期缓存和空闲连接
    setInterval(() => {
      this.cleanupCache();
      this.connectionPool.cleanupIdleConnections();
    }, 60000);
  }

  /**
   * 获取连接
   */
  async getConnection(provider: ModelProvider): Promise<Connection> {
    return this.connectionPool.acquire(provider);
  }

  /**
   * 释放连接
   */
  async releaseConnection(provider: ModelProvider, connection: Connection): Promise<void> {
    return this.connectionPool.release(provider, connection);
  }

  /**
   * 缓存数据
   */
  setCache<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.enableMetrics) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL
    };

    this.cache.set(key, entry);

    // 限制缓存大小
    if (this.cache.size > this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * 获取缓存数据
   */
  getCache<T>(key: string): T | null {
    if (!this.config.enableMetrics) return null;

    this.cacheRequests++;
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cacheHits++;
    return entry.data as T;
  }

  /**
   * 记录请求指标
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    if (!this.config.enableMetrics) return;

    this.metrics.requestCount++;
    this.responseTimes.push(responseTime);

    // 保持最近1000个响应时间记录
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    // 更新平均响应时间
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

    // 更新错误率
    if (isError) {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.requestCount - 1) + 1) / this.metrics.requestCount;
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.requestCount - 1)) / this.metrics.requestCount;
    }

    // 更新缓存命中率
    this.metrics.cacheHitRate = this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0;

    // 更新活跃连接数
    this.metrics.activeConnections = this.connectionPool.getActiveConnections();
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      activeConnections: 0
    };
    this.responseTimes = [];
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheSize,
      hitRate: this.metrics.cacheHitRate
    };
  }

  /**
   * 执行带超时的操作
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    const timeout = timeoutMs || this.config.requestTimeout;
    
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * 批量操作优化
   */
  async batchOperation<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => operation(item))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}