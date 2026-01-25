// 响应增强插件示例
import { PostprocessorPlugin, PluginPriority, PluginContext } from '../PluginManager';
import { ChatMessage } from '../../../../types/langchain';

/**
 * 响应增强后处理器插件
 * 为AI响应添加格式化、表情符号和有用的链接
 */
export class ResponseEnhancerPlugin implements PostprocessorPlugin {
  name = 'response-enhancer';
  version = '1.0.0';
  priority = PluginPriority.NORMAL;
  enabled = true;

  private emojiMap = {
    '问题': '❓',
    '解决': '✅',
    '错误': '❌',
    '警告': '⚠️',
    '信息': 'ℹ️',
    '成功': '🎉',
    '失败': '😞',
    '代码': '💻',
    '文档': '📚',
    '链接': '🔗'
  };

  async postprocess(
    response: string,
    originalMessages: ChatMessage[],
    context: PluginContext
  ): Promise<string> {
    let enhanced = response;

    // 1. 添加表情符号
    enhanced = this.addEmojis(enhanced);

    // 2. 格式化代码块
    enhanced = this.formatCodeBlocks(enhanced);

    // 3. 添加有用的链接
    enhanced = this.addHelpfulLinks(enhanced);

    // 4. 改善格式
    enhanced = this.improveFormatting(enhanced);

    return enhanced;
  }

  private addEmojis(text: string): string {
    let result = text;
    
    for (const [keyword, emoji] of Object.entries(this.emojiMap)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      result = result.replace(regex, `${emoji} ${keyword}`);
    }

    return result;
  }

  private formatCodeBlocks(text: string): string {
    // 改善代码块的格式
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    });
  }

  private addHelpfulLinks(text: string): string {
    let result = text;

    // 为常见技术术语添加文档链接
    const linkMap = {
      'JavaScript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      'TypeScript': 'https://www.typescriptlang.org/docs/',
      'React': 'https://reactjs.org/docs/',
      'Node.js': 'https://nodejs.org/docs/',
      'Python': 'https://docs.python.org/',
      'Docker': 'https://docs.docker.com/',
      'Git': 'https://git-scm.com/doc'
    };

    for (const [term, url] of Object.entries(linkMap)) {
      const regex = new RegExp(`\\b${term}\\b(?!\\]\\()`, 'gi');
      result = result.replace(regex, `[${term}](${url})`);
    }

    return result;
  }

  private improveFormatting(text: string): string {
    let result = text;

    // 改善列表格式
    result = result.replace(/^(\d+)\.\s/gm, '$1. ');
    result = result.replace(/^-\s/gm, '• ');

    // 添加适当的换行
    result = result.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');

    // 清理多余的空行
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
  }

  /**
   * 添加自定义表情符号映射
   */
  addEmojiMapping(keyword: string, emoji: string): void {
    this.emojiMap[keyword] = emoji;
  }

  /**
   * 移除表情符号映射
   */
  removeEmojiMapping(keyword: string): void {
    delete this.emojiMap[keyword];
  }
}