// LangChain 配置管理
import { ModelProvider } from '../types/langchain';

export const langChainConfig = {
  defaultProvider: (process.env.LANGCHAIN_DEFAULT_PROVIDER || ModelProvider.OLLAMA) as ModelProvider,
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'qwen3:0.6b',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
  },
  timeout: parseInt(process.env.LANGCHAIN_REQUEST_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.LANGCHAIN_MAX_RETRIES || '3'),
};
