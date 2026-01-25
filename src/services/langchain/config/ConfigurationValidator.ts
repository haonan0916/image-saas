// 配置验证器
import { 
  ChatServiceConfig, 
  ModelConfig, 
  ValidationResult,
  ModelProvider 
} from '../interfaces';

/**
 * 配置验证器
 * 提供详细的配置验证功能
 */
export class ConfigurationValidator {
  /**
   * 验证完整的聊天服务配置
   */
  static validateChatServiceConfig(config: ChatServiceConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基本结构
    if (!config) {
      return {
        isValid: false,
        errors: ['Configuration is required'],
        warnings: []
      };
    }

    // 验证默认模型
    const defaultModelErrors = this.validateDefaultModel(config);
    errors.push(...defaultModelErrors);

    // 验证回退链
    const fallbackErrors = this.validateFallbackChain(config);
    errors.push(...fallbackErrors);

    // 验证提供商配置
    const providerResults = this.validateProviders(config.providers);
    errors.push(...providerResults.errors);
    warnings.push(...providerResults.warnings);

    // 验证性能配置
    const performanceErrors = this.validatePerformanceConfig(config.performance);
    errors.push(...performanceErrors);

    // 验证安全配置
    const securityErrors = this.validateSecurityConfig(config.security);
    errors.push(...securityErrors);

    // 交叉验证
    const crossValidationResults = this.performCrossValidation(config);
    errors.push(...crossValidationResults.errors);
    warnings.push(...crossValidationResults.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证默认模型
   */
  private static validateDefaultModel(config: ChatServiceConfig): string[] {
    const errors: string[] = [];

    if (!config.defaultModel) {
      errors.push('Default model is required');
    } else if (typeof config.defaultModel !== 'string') {
      errors.push('Default model must be a string');
    } else if (!Object.values(ModelProvider).includes(config.defaultModel as ModelProvider)) {
      errors.push(`Invalid default model provider: ${config.defaultModel}`);
    }

    return errors;
  }

  /**
   * 验证回退链
   */
  private static validateFallbackChain(config: ChatServiceConfig): string[] {
    const errors: string[] = [];

    if (!Array.isArray(config.fallbackChain)) {
      errors.push('Fallback chain must be an array');
    } else if (config.fallbackChain.length === 0) {
      errors.push('Fallback chain must contain at least one provider');
    } else {
      // 检查回退链中的每个提供商
      for (const provider of config.fallbackChain) {
        if (typeof provider !== 'string') {
          errors.push('All fallback providers must be strings');
        } else if (!Object.values(ModelProvider).includes(provider as ModelProvider)) {
          errors.push(`Invalid fallback provider: ${provider}`);
        }
      }

      // 检查重复的提供商
      const uniqueProviders = new Set(config.fallbackChain);
      if (uniqueProviders.size !== config.fallbackChain.length) {
        errors.push('Fallback chain contains duplicate providers');
      }
    }

    return errors;
  }

  /**
   * 验证提供商配置
   */
  private static validateProviders(providers: Record<string, ModelConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!providers || typeof providers !== 'object') {
      return {
        isValid: false,
        errors: ['Providers configuration is required and must be an object'],
        warnings: []
      };
    }

    let enabledCount = 0;

    for (const [providerId, config] of Object.entries(providers)) {
      // 验证提供商ID
      if (!Object.values(ModelProvider).includes(providerId as ModelProvider)) {
        errors.push(`Invalid provider ID: ${providerId}`);
        continue;
      }

      // 验证提供商配置
      const providerErrors = this.validateModelConfig(providerId, config);
      errors.push(...providerErrors);

      if (config.enabled) {
        enabledCount++;
      }
    }

    // 检查是否至少有一个提供商启用
    if (enabledCount === 0) {
      errors.push('At least one provider must be enabled');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证单个模型配置
   */
  static validateModelConfig(providerId: string, config: ModelConfig): string[] {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      return [`Provider ${providerId} configuration is required and must be an object`];
    }

    // 验证启用状态
    if (typeof config.enabled !== 'boolean') {
      errors.push(`Provider ${providerId}: enabled must be a boolean`);
    }

    // 验证 API 密钥（非 Ollama 提供商需要）
    if (config.enabled && providerId !== ModelProvider.OLLAMA) {
      if (!config.apiKey || typeof config.apiKey !== 'string') {
        errors.push(`Provider ${providerId}: API key is required`);
      }
    }

    // 验证基础 URL
    if (config.baseUrl && typeof config.baseUrl !== 'string') {
      errors.push(`Provider ${providerId}: baseUrl must be a string`);
    }

    // 验证超时
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      errors.push(`Provider ${providerId}: timeout must be a positive number`);
    }

    // 验证重试次数
    if (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0) {
      errors.push(`Provider ${providerId}: retryAttempts must be a non-negative number`);
    }

    // 验证模型列表
    if (!Array.isArray(config.models)) {
      errors.push(`Provider ${providerId}: models must be an array`);
    } else if (config.models.length === 0) {
      errors.push(`Provider ${providerId}: must have at least one model`);
    } else {
      for (const model of config.models) {
        if (typeof model !== 'string') {
          errors.push(`Provider ${providerId}: all models must be strings`);
        }
      }
    }

    // 验证默认模型
    if (config.defaultModel) {
      if (typeof config.defaultModel !== 'string') {
        errors.push(`Provider ${providerId}: defaultModel must be a string`);
      } else if (!config.models.includes(config.defaultModel)) {
        errors.push(`Provider ${providerId}: defaultModel must be in the models list`);
      }
    }

    // 验证速率限制
    const rateLimitErrors = this.validateRateLimits(providerId, config.rateLimits);
    errors.push(...rateLimitErrors);

    return errors;
  }

  /**
   * 验证速率限制配置
   */
  private static validateRateLimits(providerId: string, rateLimits: any): string[] {
    const errors: string[] = [];

    if (!rateLimits || typeof rateLimits !== 'object') {
      return [`Provider ${providerId}: rateLimits is required and must be an object`];
    }

    if (typeof rateLimits.requestsPerMinute !== 'number' || rateLimits.requestsPerMinute <= 0) {
      errors.push(`Provider ${providerId}: requestsPerMinute must be a positive number`);
    }

    if (typeof rateLimits.requestsPerHour !== 'number' || rateLimits.requestsPerHour <= 0) {
      errors.push(`Provider ${providerId}: requestsPerHour must be a positive number`);
    }

    if (typeof rateLimits.burstLimit !== 'number' || rateLimits.burstLimit <= 0) {
      errors.push(`Provider ${providerId}: burstLimit must be a positive number`);
    }

    // 逻辑验证
    if (rateLimits.requestsPerHour < rateLimits.requestsPerMinute) {
      errors.push(`Provider ${providerId}: requestsPerHour should be >= requestsPerMinute`);
    }

    return errors;
  }

  /**
   * 验证性能配置
   */
  private static validatePerformanceConfig(performance: any): string[] {
    const errors: string[] = [];

    if (!performance || typeof performance !== 'object') {
      return ['Performance configuration is required and must be an object'];
    }

    if (typeof performance.connectionPoolSize !== 'number' || performance.connectionPoolSize <= 0) {
      errors.push('connectionPoolSize must be a positive number');
    }

    if (typeof performance.cacheEnabled !== 'boolean') {
      errors.push('cacheEnabled must be a boolean');
    }

    if (typeof performance.cacheTTL !== 'number' || performance.cacheTTL <= 0) {
      errors.push('cacheTTL must be a positive number');
    }

    if (typeof performance.requestTimeout !== 'number' || performance.requestTimeout <= 0) {
      errors.push('requestTimeout must be a positive number');
    }

    return errors;
  }

  /**
   * 验证安全配置
   */
  private static validateSecurityConfig(security: any): string[] {
    const errors: string[] = [];

    if (!security || typeof security !== 'object') {
      return ['Security configuration is required and must be an object'];
    }

    if (typeof security.validateInput !== 'boolean') {
      errors.push('validateInput must be a boolean');
    }

    if (typeof security.sanitizeOutput !== 'boolean') {
      errors.push('sanitizeOutput must be a boolean');
    }

    if (typeof security.logSensitiveData !== 'boolean') {
      errors.push('logSensitiveData must be a boolean');
    }

    if (typeof security.rateLimitEnabled !== 'boolean') {
      errors.push('rateLimitEnabled must be a boolean');
    }

    return errors;
  }

  /**
   * 执行交叉验证
   */
  private static performCrossValidation(config: ChatServiceConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查 providers 是否存在
    if (!config.providers || typeof config.providers !== 'object') {
      return {
        isValid: false,
        errors: ['Providers configuration is required for cross validation'],
        warnings: []
      };
    }

    const enabledProviders = Object.entries(config.providers)
      .filter(([_, providerConfig]) => providerConfig.enabled)
      .map(([providerId, _]) => providerId);

    // 检查默认模型是否在启用的提供商中
    if (config.defaultModel && !enabledProviders.includes(config.defaultModel)) {
      errors.push(`Default model provider '${config.defaultModel}' is not enabled`);
    }

    // 检查回退链中的提供商是否都启用
    if (Array.isArray(config.fallbackChain)) {
      for (const provider of config.fallbackChain) {
        if (!enabledProviders.includes(provider)) {
          warnings.push(`Fallback provider '${provider}' is not enabled`);
        }
      }
    }

    // 检查性能配置的合理性
    if (config.performance) {
      if (config.performance.requestTimeout < 1000) {
        warnings.push('Request timeout is very low (< 1 second), this may cause frequent timeouts');
      }

      if (config.performance.connectionPoolSize > 50) {
        warnings.push('Connection pool size is very high (> 50), this may consume excessive resources');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}