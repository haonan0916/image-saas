import { db } from "../db/db";
import { knowledgeBase, ragQueries } from "../db/schema";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

export interface RAGDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  category?: string;
  tags: string[];
  source?: string;
  similarity?: number;
}

export interface RAGResponse {
  answer: string;
  sources: RAGDocument[];
  query: string;
}

export class RAGService {
  private static instance: RAGService;
  private embeddings: OllamaEmbeddings;
  private chatModel: ChatOllama;
  
  private constructor() {
    // 初始化 Ollama embeddings
    this.embeddings = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:0.6b",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    });

    // 初始化 Ollama chat model
    this.chatModel = new ChatOllama({
      model: process.env.OLLAMA_DEFAULT_MODEL || "qwen3:0.6b",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    });
  }
  
  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  /**
   * 测试 embedding 模型连接
   */
  async testEmbeddingConnection(): Promise<{ success: boolean; model: string; error?: string }> {
    try {
      const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'qwen3-embedding:0.6b';
      
      // 测试简单的文本嵌入
      const testText = "测试文本";
      const embedding = await this.embeddings.embedQuery(testText);
      
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        return {
          success: false,
          model: embeddingModel,
          error: 'Invalid embedding response format'
        };
      }

      return {
        success: true,
        model: embeddingModel
      };
    } catch (error) {
      return {
        success: false,
        model: process.env.OLLAMA_EMBEDDING_MODEL || 'qwen3-embedding:0.6b',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 使用 LangChain 计算向量相似度
   */
  private async calculateSimilarity(queryEmbedding: number[], docEmbedding: number[]): Promise<number> {
    // 使用余弦相似度公式
    if (queryEmbedding.length !== docEmbedding.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < queryEmbedding.length; i++) {
      dotProduct += queryEmbedding[i] * docEmbedding[i];
      normA += queryEmbedding[i] * queryEmbedding[i];
      normB += docEmbedding[i] * docEmbedding[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 添加文档到知识库
   */
  async addDocument(
    title: string,
    content: string,
    type: string,
    category?: string,
    tags: string[] = [],
    source?: string,
    userId: string = 'system'
  ): Promise<string> {
    // 使用 LangChain 的 embeddings 生成向量
    const embedding = await this.embeddings.embedQuery(content);
    
    // 保存到数据库
    const [doc] = await db
      .insert(knowledgeBase)
      .values({
        id: crypto.randomUUID(),
        title,
        content,
        type,
        category,
        tags,
        source,
        embedding,
        userId,
        isPublic: userId === 'system', // 系统文档默认公开
      })
      .returning();

    return doc.id;
  }

  /**
   * 使用 LangChain embeddings 检索相关文档
   */
  async retrieveRelevantDocs(
    query: string,
    userId: string,
    limit: number = 5,
    threshold: number = 0.3
  ): Promise<RAGDocument[]> {
    // 使用 LangChain 的 embeddings 生成查询向量
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // 获取所有文档，然后在应用层过滤
    const allDocs = await db
      .select()
      .from(knowledgeBase);

    // 在应用层过滤可访问的文档
    const docs = allDocs.filter(doc => 
      !doc.deletedAt && (doc.isPublic || doc.userId === userId)
    );

    // 使用 LangChain 计算相似度并排序
    const docsWithSimilarity = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        similarity: doc.embedding 
          ? await this.calculateSimilarity(queryEmbedding, doc.embedding)
          : this.simpleTextSimilarity(query, doc.content)
      }))
    );

    // 过滤、排序和限制结果
    const filteredDocs = docsWithSimilarity
      .filter(doc => doc.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return filteredDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      type: doc.type,
      category: doc.category || undefined,
      tags: doc.tags || [],
      source: doc.source || undefined,
      similarity: doc.similarity,
    }));
  }

  /**
   * 简单的文本相似度计算（备选方案）
   */
  private simpleTextSimilarity(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.includes(word)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  /**
   * 使用 LangChain 生成 RAG 增强的回答
   */
  async generateRAGResponse(
    query: string,
    sessionId: string,
    userId: string,
    model?: string
  ): Promise<RAGResponse> {
    // 使用 LangChain embeddings 检索相关文档
    const relevantDocs = await this.retrieveRelevantDocs(query, userId);
    
    try {
      // 设置模型
      if (model) {
        this.chatModel = new ChatOllama({
          model: model,
          baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        });
      }

      let answer: string;

      if (relevantDocs.length > 0) {
        // 使用 LangChain 的 RAG 链
        const prompt = PromptTemplate.fromTemplate(`
基于以下系统文档信息回答用户问题：

=== 相关文档 ===
{context}

=== 用户问题 ===
{question}

请基于上述文档信息回答问题。如果文档中没有相关信息，请说明并提供一般性建议。
`);

        // 创建 RAG 链
        const ragChain = RunnableSequence.from([
          {
            context: () => {
              return relevantDocs
                .map(doc => `【${doc.title}】\n${doc.content}`)
                .join('\n\n');
            },
            question: new RunnablePassthrough(),
          },
          prompt,
          this.chatModel,
          new StringOutputParser(),
        ]);

        // 执行 RAG 链
        answer = await ragChain.invoke({ question: query });
      } else {
        // 没有相关文档时的普通回答
        const response = await this.chatModel.invoke([
          {
            role: "system",
            content: "你是一个专业的系统助手，专门帮助用户了解和使用图像处理SaaS系统。"
          },
          {
            role: "user", 
            content: query
          }
        ]);
        answer = response.content as string;
      }

      // 保存查询历史
      await db.insert(ragQueries).values({
        id: crypto.randomUUID(),
        query,
        retrievedDocs: relevantDocs.map(doc => doc.id),
        response: answer,
        sessionId,
        userId,
      });

      return {
        answer,
        sources: relevantDocs,
        query,
      };
    } catch (error) {
      console.error('RAG response generation failed:', error);
      throw error;
    }
  }

  /**
   * 初始化系统知识库
   */
  async initializeSystemKnowledge(): Promise<void> {
    const systemDocs = [
      {
        title: "系统概述",
        content: `这是一个图像处理SaaS系统，主要功能包括：
1. 文件管理：上传、存储和管理图像文件
2. 数据集管理：创建和管理图像数据集
3. 模型管理：管理AI模型，支持图像去雾等处理
4. 任务管理：创建和监控图像处理任务
5. API接口：提供RESTful API供第三方集成
6. 存储配置：支持S3兼容的对象存储
7. 用户认证：支持GitHub等第三方登录`,
        type: "guide",
        category: "system",
        tags: ["概述", "功能", "系统介绍"]
      },
      {
        title: "文件管理功能",
        content: `文件管理功能说明：
- 支持拖拽上传图像文件
- 支持批量上传和删除
- 文件预览和URL生成
- 文件按时间排序显示
- 支持复制文件URL
- 删除文件时会同步删除相关数据集中的引用`,
        type: "guide",
        category: "usage",
        tags: ["文件", "上传", "管理"]
      },
      {
        title: "数据集管理",
        content: `数据集管理功能：
- 创建自定义数据集
- 从文件列表添加图像到数据集
- 查看数据集详情和图像预览
- 删除数据集和其中的图像
- 数据集用于AI模型训练和处理任务`,
        type: "guide",
        category: "usage",
        tags: ["数据集", "图像", "管理"]
      },
      {
        title: "存储配置",
        content: `存储配置说明：
- 支持S3兼容的对象存储
- 需要配置访问密钥、区域、存储桶等信息
- 每个应用可以配置不同的存储后端
- 上传文件前需要先配置存储`,
        type: "guide",
        category: "configuration",
        tags: ["存储", "S3", "配置"]
      },
      {
        title: "API密钥管理",
        content: `API密钥管理：
- 为每个应用创建API密钥
- 包含客户端ID和密钥
- 用于第三方系统集成
- 支持创建多个密钥
- 可以查看和复制密钥信息`,
        type: "guide",
        category: "api",
        tags: ["API", "密钥", "集成"]
      }
    ];

    for (const doc of systemDocs) {
      try {
        await this.addDocument(
          doc.title,
          doc.content,
          doc.type,
          doc.category,
          doc.tags,
          "system",
          "system"
        );
      } catch (error) {
        console.error(`Failed to add system document: ${doc.title}`, error);
      }
    }
  }
}

export const ragService = RAGService.getInstance();