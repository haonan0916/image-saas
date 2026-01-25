interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
  num_ctx?: number;
  // QWen 思考模式参数
  enable_thinking?: boolean;
  thinking_budget?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'qwen3:0.6b') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages: OllamaMessage[], options?: OllamaOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
            num_ctx: 4096,
            // 启用思考模式
            enable_thinking: true,
            thinking_budget: 20000,
            ...options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw new Error(`Failed to get response from Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *chatStream(messages: OllamaMessage[], options?: OllamaOptions): AsyncGenerator<{ type: 'thinking' | 'response'; content: string }, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
            num_ctx: 4096,
            // 启用思考模式
            enable_thinking: true,
            thinking_budget: 20000,
            ...options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: OllamaStreamResponse = JSON.parse(line);
                if (data.message?.content) {
                  const content = data.message.content;
                  
                  // 检查是否包含思考标签或推理内容
                  if (content.includes('<think>') || content.includes('</think>')) {
                    const thinkingMatch = content.match(/<think>([\s\S]*?)<\/think>/);
                    if (thinkingMatch) {
                      yield { type: 'thinking', content: thinkingMatch[1].trim() };
                    }
                    const responseContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                    if (responseContent) {
                      yield { type: 'response', content: responseContent };
                    }
                  } else {
                    // 智能检测推理内容
                    const reasoningPatterns = [
                      /^根据.*条件/,
                      /^逐步推理/,
                      /^分析.*过程/,
                      /^\d+\.\s*\*\*.*\*\*/,  // 数字列表格式
                      /^[一二三四五]\s*[、.]/,  // 中文数字列表
                      /计算步骤/,
                      /推理过程/,
                      /思考过程/
                    ];
                    
                    const isReasoningContent = reasoningPatterns.some(pattern => 
                      pattern.test(content.trim())
                    );
                    
                    if (isReasoningContent) {
                      yield { type: 'thinking', content };
                    } else {
                      yield { type: 'response', content };
                    }
                  }
                }
                if (data.done) {
                  return;
                }
              } catch {
                console.warn('Failed to parse Ollama stream response:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Ollama stream error:', error);
      throw new Error(`Failed to stream from Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((model: { name: string }) => model.name) || [];
    } catch {
      console.error('Failed to list Ollama models');
      return [];
    }
  }

  async isModelAvailable(modelName?: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      const targetModel = modelName || this.model;
      return models.some(model => model.includes(targetModel));
    } catch {
      return false;
    }
  }

  setModel(model: string) {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }
}

export const ollamaClient = new OllamaClient();