// LangChain 配置测试
import { LangChainConfig } from '../langchain';
import { ModelProvider } from '../../types/langchain';

describe('LangChain Configuration', () => {
  let config: LangChainConfig;

  beforeEach(() => {
    config = LangChainConfig.getInstance();
  });

  test('should load default configuration', () => {
    const serviceConfig = config.getConfig();
    
    expect(serviceConfig).toBeDefined();
    expect(serviceConfig.defaultModel).toBeDefined();
    expect(serviceConfig.providers).toBeDefined();
    expect(serviceConfig.performance).toBeDefined();
    expect(serviceConfig.security).toBeDefined();
  });

  test('should have Ollama provider enabled by default', () => {
    const isEnabled = config.isProviderEnabled(ModelProvider.OLLAMA);
    expect(isEnabled).toBe(true);
  });

  test('should validate configuration', () => {
    const validation = config.validateConfig();
    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('errors');
    expect(Array.isArray(validation.errors)).toBe(true);
  });

  test('should get enabled providers', () => {
    const enabledProviders = config.getEnabledProviders();
    expect(Array.isArray(enabledProviders)).toBe(true);
    expect(enabledProviders.length).toBeGreaterThan(0);
  });

  test('should get provider config', () => {
    const ollamaConfig = config.getProviderConfig(ModelProvider.OLLAMA);
    expect(ollamaConfig).toBeDefined();
    expect(ollamaConfig?.enabled).toBe(true);
  });
});