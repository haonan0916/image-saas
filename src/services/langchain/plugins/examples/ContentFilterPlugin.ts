// 内容过滤插件示例
import { PreprocessorPlugin, PluginPriority, PluginContext } from '../PluginManager';
import { ChatMessage, ChatOptions } from '../../../../types/langchain';

/**
 * 内容过滤预处理器插件
 * 过滤敏感内容和不当言论
 */
export class ContentFilterPlugin implements PreprocessorPlugin {
  name = 'content-filter';
  version = '1.0.0';
  priority = PluginPriority.HIGH;
  enabled = true;

  private sensitiveWords = [
    '敏感词1', '敏感词2', '不当言论'
    // 实际应用中应该从配置文件或数据库加载
  ];

  private replacementText = '[已过滤]';

  async preprocess(
    messages: ChatMessage[],
    options: ChatOptions,
    context: PluginContext
  ): Promise<{ messages: ChatMessage[]; options: ChatOptions }> {
    const filteredMessages = messages.map(message => ({
      ...message,
      content: this.filterContent(message.content)
    }));

    // 记录过滤日志
    const hasFiltered = messages.some((msg, index) => 
      msg.content !== filteredMessages[index].content
    );

    if (hasFiltered) {
      console.log(`Content filtered for session ${context.sessionId}`);
    }

    return {
      messages: filteredMessages,
      options
    };
  }

  private filterContent(content: string): string {
    let filtered = content;
    
    for (const word of this.sensitiveWords) {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, this.replacementText);
    }

    return filtered;
  }

  /**
   * 添加敏感词
   */
  addSensitiveWord(word: string): void {
    if (!this.sensitiveWords.includes(word)) {
      this.sensitiveWords.push(word);
    }
  }

  /**
   * 移除敏感词
   */
  removeSensitiveWord(word: string): void {
    const index = this.sensitiveWords.indexOf(word);
    if (index > -1) {
      this.sensitiveWords.splice(index, 1);
    }
  }

  /**
   * 设置替换文本
   */
  setReplacementText(text: string): void {
    this.replacementText = text;
  }
}