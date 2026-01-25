// 适配器统一导出

export { BaseAdapter } from './BaseAdapter';
export { OllamaAdapter } from './OllamaAdapter';
export { OpenAIAdapter } from './OpenAIAdapter';
export { AnthropicAdapter } from './AnthropicAdapter';
export { GeminiAdapter } from './GeminiAdapter';

// 导出配置类型
export type { OllamaConfig } from './OllamaAdapter';
export type { OpenAIConfig } from './OpenAIAdapter';
export type { AnthropicConfig } from './AnthropicAdapter';
export type { GeminiConfig } from './GeminiAdapter';