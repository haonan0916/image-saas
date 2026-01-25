// Jest 测试设置文件
import { config } from 'dotenv';

// 加载测试环境变量
config({ path: '.env.local' });

// 设置测试超时
jest.setTimeout(30000);

// 全局测试配置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};