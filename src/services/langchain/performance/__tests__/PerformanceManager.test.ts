// 性能管理器测试
import { PerformanceManager, ConnectionPool, type PerformanceConfig } from '../PerformanceManager';
import { ModelProvider } from '../../../../types/langchain';

describe('PerformanceManager', () => {
  let performanceManager: PerformanceManager;
  let config: PerformanceConfig;

  beforeEach(() => {
    config = {
      connectionPoolSize: 5,
      requestTimeout: 5000,
      cacheSize: 100,
      cacheTTL: 60000,
      enableMetrics: true
    };
    performanceManager = new PerformanceManager(config);
  });

  afterEach(() => {
    performanceManager.resetMetrics();
  });

  describe('缓存功能', () => {
    it('应该能够设置和获取缓存数据', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      performanceManager.setCache(key, data);
      const cached = performanceManager.getCache(key);

      expect(cached).toEqual(data);
    });

    it('应该在数据过期后返回null', async () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const shortTTL = 100; // 100ms

      performanceManager.setCache(key, data, shortTTL);
      
      // 等待数据过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cached = performanceManager.getCache(key);
      expect(cached).toBeNull();
    });

    it('应该限制缓存大小', () => {
      const smallConfig = { ...config, cacheSize: 2 };
      const smallCacheManager = new PerformanceManager(smallConfig);

      // 添加超过缓存大小的数据
      smallCacheManager.setCache('key1', 'data1');
      smallCacheManager.setCache('key2', 'data2');
      smallCacheManager.setCache('key3', 'data3');

      // 第一个应该被移除
      expect(smallCacheManager.getCache('key1')).toBeNull();
      expect(smallCacheManager.getCache('key2')).not.toBeNull();
      expect(smallCacheManager.getCache('key3')).not.toBeNull();
    });
  });

  describe('性能指标', () => {
    it('应该记录请求指标', () => {
      const responseTime = 1000;
      
      performanceManager.recordRequest(responseTime, false);
      
      const metrics = performanceManager.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.averageResponseTime).toBe(responseTime);
      expect(metrics.errorRate).toBe(0);
    });

    it('应该正确计算错误率', () => {
      performanceManager.recordRequest(1000, false);
      performanceManager.recordRequest(1500, true);
      performanceManager.recordRequest(800, false);

      const metrics = performanceManager.getMetrics();
      expect(metrics.requestCount).toBe(3);
      expect(metrics.errorRate).toBeCloseTo(1/3, 2);
    });

    it('应该正确计算平均响应时间', () => {
      const times = [1000, 2000, 3000];
      times.forEach(time => performanceManager.recordRequest(time, false));

      const metrics = performanceManager.getMetrics();
      const expectedAverage = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(metrics.averageResponseTime).toBe(expectedAverage);
    });
  });

  describe('超时处理', () => {
    it('应该在超时时抛出错误', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 1000));
      const shortTimeout = 100;

      await expect(
        performanceManager.withTimeout(slowOperation, shortTimeout)
      ).rejects.toThrow('Operation timed out after 100ms');
    });

    it('应该在操作完成时返回结果', async () => {
      const fastOperation = () => Promise.resolve('success');
      const longTimeout = 1000;

      const result = await performanceManager.withTimeout(fastOperation, longTimeout);
      expect(result).toBe('success');
    });
  });

  describe('批量操作', () => {
    it('应该能够批量处理操作', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = (item: number) => Promise.resolve(item * 2);
      const batchSize = 2;

      const results = await performanceManager.batchOperation(items, operation, batchSize);
      
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });
  });

  describe('缓存统计', () => {
    it('应该返回正确的缓存统计', () => {
      performanceManager.setCache('key1', 'data1');
      performanceManager.setCache('key2', 'data2');

      const stats = performanceManager.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(config.cacheSize);
    });
  });
});

describe('ConnectionPool', () => {
  let connectionPool: ConnectionPool;

  beforeEach(() => {
    connectionPool = new ConnectionPool({
      maxConnections: 3,
      minConnections: 1,
      acquireTimeout: 5000,
      idleTimeout: 30000
    });
  });

  describe('连接管理', () => {
    it('应该能够获取和释放连接', async () => {
      const provider = ModelProvider.OLLAMA;
      
      const connection = await connectionPool.acquire(provider);
      expect(connection).toBeDefined();
      expect(connection.provider).toBe(provider);
      expect(connection.id).toBeDefined();

      await connectionPool.release(provider, connection);
      expect(connectionPool.getActiveConnections()).toBe(1);
    });

    it('应该重用已释放的连接', async () => {
      const provider = ModelProvider.OLLAMA;
      
      const connection1 = await connectionPool.acquire(provider);
      await connectionPool.release(provider, connection1);
      
      const connection2 = await connectionPool.acquire(provider);
      expect(connection2.id).toBe(connection1.id);
    });

    it('应该限制连接池大小', async () => {
      const provider = ModelProvider.OLLAMA;
      const connections = [];

      // 获取多个连接
      for (let i = 0; i < 5; i++) {
        const conn = await connectionPool.acquire(provider);
        connections.push(conn);
      }

      // 释放所有连接
      for (const conn of connections) {
        await connectionPool.release(provider, conn);
      }

      // 连接池应该只保留最大数量的连接
      expect(connectionPool.getActiveConnections()).toBeLessThanOrEqual(3);
    });
  });
});