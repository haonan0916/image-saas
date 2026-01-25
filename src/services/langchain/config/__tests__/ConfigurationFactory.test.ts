// 配置工厂测试
import { ConfigurationFactory } from '../ConfigurationFactory';
import { ConfigurationManager } from '../../interfaces';

describe('ConfigurationFactory', () => {
  afterEach(() => {
    ConfigurationFactory.reset();
  });

  describe('Singleton Management', () => {
    test('should return the same instance on multiple calls', async () => {
      const instance1 = await ConfigurationFactory.getInstance();
      const instance2 = await ConfigurationFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    test('should initialize configuration on first call', async () => {
      const instance = await ConfigurationFactory.getInstance();
      
      expect(instance).toBeDefined();
      expect(typeof instance.getCurrentConfig).toBe('function');
      expect(typeof instance.loadConfig).toBe('function');
    });

    test('should handle concurrent initialization requests', async () => {
      const promises = [
        ConfigurationFactory.getInstance(),
        ConfigurationFactory.getInstance(),
        ConfigurationFactory.getInstance()
      ];
      
      const instances = await Promise.all(promises);
      
      // 所有实例应该是同一个
      expect(instances[0]).toBe(instances[1]);
      expect(instances[1]).toBe(instances[2]);
    });
  });

  describe('Instance Creation', () => {
    test('should create new instance without singleton', async () => {
      const instance1 = await ConfigurationFactory.createInstance();
      const instance2 = await ConfigurationFactory.createInstance();
      
      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
    });

    test('should create initialized instances', async () => {
      const instance = await ConfigurationFactory.createInstance();
      
      const config = instance.getCurrentConfig();
      expect(config).toBeDefined();
      expect(config.defaultModel).toBeDefined();
      expect(config.providers).toBeDefined();
    });
  });

  describe('Reset Functionality', () => {
    test('should reset singleton instance', async () => {
      const instance1 = await ConfigurationFactory.getInstance();
      
      ConfigurationFactory.reset();
      
      const instance2 = await ConfigurationFactory.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });

    test('should dispose previous instance on reset', async () => {
      const instance = await ConfigurationFactory.getInstance();
      const disposeSpy = jest.spyOn(instance as any, 'dispose');
      
      ConfigurationFactory.reset();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors', async () => {
      // 模拟环境变量错误
      const originalEnv = process.env.LANGCHAIN_DEFAULT_PROVIDER;
      process.env.LANGCHAIN_DEFAULT_PROVIDER = 'invalid-provider';
      
      ConfigurationFactory.reset();
      
      try {
        await expect(ConfigurationFactory.getInstance()).rejects.toThrow();
      } finally {
        // 恢复环境变量
        if (originalEnv !== undefined) {
          process.env.LANGCHAIN_DEFAULT_PROVIDER = originalEnv;
        } else {
          delete process.env.LANGCHAIN_DEFAULT_PROVIDER;
        }
      }
    });

    test('should reset initialization flag on error', async () => {
      // 模拟初始化错误
      const originalEnv = process.env.LANGCHAIN_DEFAULT_PROVIDER;
      process.env.LANGCHAIN_DEFAULT_PROVIDER = 'invalid-provider';
      
      ConfigurationFactory.reset();
      
      try {
        await ConfigurationFactory.getInstance();
      } catch (error) {
        // 忽略错误
      }
      
      // 恢复环境变量
      if (originalEnv !== undefined) {
        process.env.LANGCHAIN_DEFAULT_PROVIDER = originalEnv;
      } else {
        delete process.env.LANGCHAIN_DEFAULT_PROVIDER;
      }
      
      // 应该能够重新初始化
      const instance = await ConfigurationFactory.getInstance();
      expect(instance).toBeDefined();
    });
  });

  describe('Configuration Manager Interface', () => {
    test('should return instance implementing ConfigurationManager interface', async () => {
      const instance = await ConfigurationFactory.getInstance();
      
      // 验证接口方法存在
      expect(typeof instance.loadConfig).toBe('function');
      expect(typeof instance.getModelConfig).toBe('function');
      expect(typeof instance.updateConfig).toBe('function');
      expect(typeof instance.validateConfig).toBe('function');
      expect(typeof instance.onConfigChange).toBe('function');
      expect(typeof instance.offConfigChange).toBe('function');
      expect(typeof instance.getCurrentConfig).toBe('function');
      expect(typeof instance.reloadConfig).toBe('function');
      expect(typeof instance.saveConfig).toBe('function');
    });

    test('should provide working configuration methods', async () => {
      const instance = await ConfigurationFactory.getInstance();
      
      const config = instance.getCurrentConfig();
      expect(config).toBeDefined();
      
      const validation = instance.validateConfig(config);
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });
  });
});