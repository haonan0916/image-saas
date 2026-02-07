import { db } from "../db/db";
import { ragQueries, knowledgeBase } from "../db/schema";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { langchainService } from "@/services/langchain/LangChainService";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import fs from "fs/promises";
import path from "path";

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
  query: string;
  sources: RAGDocument[];
}

export class RAGService {
  private static instance: RAGService;
  private vectorStore: PGVectorStore | null = null;
  private embeddings: OllamaEmbeddings;

  private constructor() {
    // 初始化嵌入模型
    this.embeddings = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:0.6b",
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
   * 初始化向量存储
   */
  private async getVectorStore(): Promise<PGVectorStore> {
    if (this.vectorStore) return this.vectorStore;

    // qwen3-embedding:0.6b 维度，确认 Ollama 模型维度
    const embeddingDimension = 1024;

    const config = {
      postgresConnectionOptions: {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
      tableName: "knowledge_base",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
      embeddingDimension,
    };

    this.vectorStore = await PGVectorStore.initialize(this.embeddings, config);
    return this.vectorStore;
  }

  /**
   * 测试 embedding 模型连接
   */
  async testEmbeddingConnection(): Promise<{
    success: boolean;
    model: string;
    error?: string;
  }> {
    try {
      const embeddingModel =
        process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:0.6b";
      const testText = "测试文本";
      const embedding = await this.embeddings.embedQuery(testText);

      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        return {
          success: false,
          model: embeddingModel,
          error: "Invalid embedding response format",
        };
      }
      return { success: true, model: embeddingModel };
    } catch (error) {
      return {
        success: false,
        model: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:0.6b",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 添加单个文档到知识库（使用 LangChain 标准方式）
   */
  async addDocument(
    title: string,
    content: string,
    type: string,
    category?: string,
    tags: string[] = [],
    source?: string,
    userId: string = "system",
  ): Promise<string[]> {
    console.log(`[RAG] Adding document: ${title}`);

    // 1. 使用优化的文本切分器
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
      separators: ["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
      keepSeparator: true,
    });

    const originalId = crypto.randomUUID();

    // 2. 创建 LangChain Document 对象（标准格式）
    const docs = await splitter.createDocuments(
      [content],
      [
        {
          // 核心元数据（用于检索和过滤）
          title,
          type,
          category: category || "general",
          tags: tags || [],
          source: source || null,
          userId,
          isPublic: userId === "system",
          // 关联同一文档的所有分片
          originalId,
          // 时间戳
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    );

    // 3. 为每个分片添加索引信息
    docs.forEach((doc, index) => {
      doc.metadata.chunkIndex = index;
      doc.metadata.totalChunks = docs.length;
      doc.metadata.chunkTitle = `${title} (Part ${index + 1}/${docs.length})`;
    });

    console.log(`[RAG] Split into ${docs.length} chunks`);

    // 4. 使用 LangChain 标准方法批量添加到向量存储
    const vectorStore = await this.getVectorStore();
    await vectorStore.addDocuments(docs);

    console.log(`[RAG] Added ${docs.length} document chunks`);

    // PGVectorStore.addDocuments() doesn't return IDs, so we return an empty array
    return [];
  }

  /**
   * 批量添加文档（性能优化版本）
   */
  async addDocuments(
    documents: Array<{
      title: string;
      content: string;
      type: string;
      category?: string;
      tags?: string[];
      source?: string;
      userId?: string;
    }>,
  ): Promise<string[]> {
    console.log(`[RAG] Batch adding ${documents.length} documents`);

    const allDocs: Document[] = [];
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
      separators: ["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
      keepSeparator: true,
    });

    // 1. 处理所有文档并创建 Document 对象
    for (const doc of documents) {
      const originalId = crypto.randomUUID();
      const userId = doc.userId || "system";

      const chunks = await splitter.createDocuments(
        [doc.content],
        [
          {
            title: doc.title,
            type: doc.type,
            category: doc.category || "general",
            tags: doc.tags || [],
            source: doc.source || null,
            userId,
            isPublic: userId === "system",
            originalId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      );

      // 添加分片索引
      chunks.forEach((chunk, index) => {
        chunk.metadata.chunkIndex = index;
        chunk.metadata.totalChunks = chunks.length;
        chunk.metadata.chunkTitle = `${doc.title} (Part ${index + 1}/${chunks.length})`;
      });

      allDocs.push(...chunks);
    }

    console.log(`[RAG] Total chunks to add: ${allDocs.length}`);

    // 2. 批量添加到向量存储
    try {
      const vectorStore = await this.getVectorStore();
      await vectorStore.addDocuments(allDocs);
      console.log(`[RAG] Successfully added ${allDocs.length} chunks`);
      // PGVectorStore.addDocuments() doesn't return IDs, so we return an empty array
      return [];
    } catch (error) {
      console.error("[RAG] Failed to batch add documents:", error);
      throw error;
    }
  }

  /**
   * 查询重写（必要操作）
   */
  private async rewriteQuery(query: string): Promise<string> {
    try {
      const chatModel = langchainService.getModel("ollama/qwen3:0.6b", {});

      const rewritePrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `你是一个查询优化助手。请将用户的问题重写为更适合检索的形式。
规则：
1. 提取关键词和核心概念
2. 扩展缩写和简称
3. 添加相关的同义词
4. 保持原意，但使查询更清晰
5. 只返回重写后的查询，不要解释

示例：
用户查询：怎么用API
重写查询：如何使用 API 接口 应用程序编程接口 调用方法`,
        ],
        ["user", "{query}"],
      ]);

      const chain = RunnableSequence.from([
        rewritePrompt,
        chatModel,
        new StringOutputParser(),
      ]);

      const rewritten = await chain.invoke({ query });
      console.log(`[RAG] Query rewritten: "${query}" -> "${rewritten}"`);
      return rewritten.trim() || query;
    } catch (error) {
      console.error("[RAG] Query rewrite failed:", error);
      return query;
    }
  }

  /**
   * 检索相关文档
   */
  async retrieveRelevantDocs(
    query: string,
    userId: string,
    limit: number = 5,
    useQueryRewrite: boolean = true,
    useMMR: boolean = true,
  ): Promise<RAGDocument[]> {
    const finalQuery = useQueryRewrite ? await this.rewriteQuery(query) : query;
    const vectorStore = await this.getVectorStore();

    const docsWithScores = await vectorStore.similaritySearchWithScore(
      finalQuery,
      limit * 2,
    );

    const filtered = docsWithScores.filter(([doc]) => {
      const meta = doc.metadata;
      return meta.userId === userId || meta.isPublic === true || meta.userId === "system";
    });

    return filtered.slice(0, limit).map(([doc, similarity]) => ({
      id: (doc.metadata.id as string) || crypto.randomUUID(),
      title: (doc.metadata.chunkTitle || doc.metadata.title) as string,
      content: doc.pageContent,
      type: (doc.metadata.type as string) || "document",
      category: (doc.metadata.category as string) || "general",
      tags: (doc.metadata.tags as string[]) || [],
      source: (doc.metadata.source as string) || "",
      similarity,
    }));
  }

  /**
   * 生成 RAG 回答
   */                    
  async generateRAGResponse(
    query: string,
    sessionId: string,
    userId: string,
    model?: string,
    options?: {
      useQueryRewrite?: boolean;
      useMMR?: boolean;
      topK?: number;
    },
  ): Promise<RAGResponse> {
    console.log(
      `[RAG] Generating response for query: "${query}" (User: ${userId}, Session: ${sessionId})`,
    );

    try {
      const {
        useQueryRewrite = true,
        useMMR = true,
        topK = 5,
      } = options || {};

      const sources = await this.retrieveRelevantDocs(
        query,
        userId,
        topK,
        useQueryRewrite,
        useMMR,
      );

      if (sources.length === 0) {
        console.warn(`[RAG] No relevant documents found for query: "${query}"`);
        
        await db.insert(ragQueries).values({
          id: crypto.randomUUID(),
          query,
          retrievedDocs: [],
          response: "资料库中未找到相关信息。请尝试调整查询或咨询管理员。",
          sessionId,
          userId,
        });

        return {
          answer: "资料库中未找到相关信息。请尝试调整查询或咨询管理员。",
          query,
          sources: [],
        };
      }

      const context = sources
        .map(
          (d, i) =>
            `[文档 ${i + 1}] 标题: ${d.title}\n相似度: ${(d.similarity || 0).toFixed(3)}\n内容: ${d.content}`,
        )
        .join("\n\n---\n\n");

      const chatModel = langchainService.getModel(
        model || "ollama/qwen3:0.6b",
        {},
      );

      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `你是一个专业的知识库助手。请严格基于以下提供的【相关文档】内容来回答用户的提问。

  规则：
  1. 如果文档中包含答案，请整理并准确回答
  2. 引用文档时请标注来源（如：根据文档1...）
  3. 如果文档中没有相关信息，请直接说明"资料库中未找到相关信息"
  4. 严禁编造或提供文档外的信息
  5. 回答要简洁、准确、有条理

  【相关文档】
  {context}`,
        ],
        ["user", `{question}`],
      ]);

      const ragChain = prompt.pipe(chatModel).pipe(new StringOutputParser());

      const answer = await ragChain.invoke({
        context,
        question: query,
      });

      await db.insert(ragQueries).values({
        id: crypto.randomUUID(),
        query,
        retrievedDocs: sources.map((s) => s.id),
        response: answer,
        sessionId,
        userId,
      });

      return {
        answer,
        query,
        sources,
      };
    } catch (error) {
      console.error("[RAG] Response generation failed:", error);
      throw error;
    }
  }

  /**
   * 初始化系统知识库
   */
  async initializeSystemKnowledge(): Promise<void> {
    console.log("[RAG] Initializing system knowledge base...");

    await db.delete(knowledgeBase);
    console.log("[RAG] Cleared existing knowledge base");

    const knowledgeDir = path.join(process.cwd(), "src/knowledge");

    try {
      const files = await fs.readdir(knowledgeDir);
      
      const allDocuments = (await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(knowledgeDir, file);
          const stats = await fs.stat(filePath);

          if (stats.isDirectory()) return [];

          const ext = path.extname(file).toLowerCase();
          const content = await fs.readFile(filePath, "utf-8");

          console.log(`[RAG] Processing knowledge file: ${file}`);

          try {
            if (ext === ".json") {
              return await this.parseJsonFile(content, file);
            } else if (ext === ".md") {
              return [await this.parseMarkdownFile(content, file)];
            }
            return [];
          } catch (err) {
            console.error(`[RAG] Failed to process file ${file}:`, err);
            return [];
          }
        })
      )).flat();

      if (allDocuments.length > 0) {
        console.log(`[RAG] Adding ${allDocuments.length} documents to knowledge base...`);
        await this.addDocuments(allDocuments);
        console.log("[RAG] System knowledge base initialized successfully!");
      } else {
        console.warn("[RAG] No documents found to add");
      }
    } catch (error) {
      console.error("[RAG] Failed to load system knowledge:", error);
      throw error;
    }
  }

  /**
   * 解析 JSON 文件
   */
  private async parseJsonFile(
    fileContent: string,
    filename: string,
  ): Promise<
    Array<{
      title: string;
      content: string;
      type: string;
      category?: string;
      tags?: string[];
      source?: string;
    }>
  > {
    const items = JSON.parse(fileContent);
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      title: item.title,
      content: item.content,
      type: item.type || "document",
      category: item.category,
      tags: item.tags || [],
      source: filename,
    }));
  }

  /**
   * 解析 Markdown 文件
   */
  private async parseMarkdownFile(
    fileContent: string,
    filename: string,
  ): Promise<{
    title: string;
    content: string;
    type: string;
    category?: string;
    tags?: string[];
    source?: string;
  }> {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = fileContent.match(frontmatterRegex);

    let title = path.basename(filename, ".md");
    let type = "document";
    let category = "general";
    let tags: string[] = [];
    let content = fileContent;

    if (match) {
      const frontmatter = match[1];
      content = fileContent.replace(match[0], "").trim();

      const lines = frontmatter.split("\n");
      for (const line of lines) {
        const [key, ...values] = line.split(":");
        if (!key || !values) continue;

        const value = values.join(":").trim();
        const cleanKey = key.trim();

        if (cleanKey === "title") title = value;
        if (cleanKey === "type") type = value;
        if (cleanKey === "category") category = value;
        if (cleanKey === "tags") {
          const tagStr = value.replace(/^\[|\]$/g, "");
          tags = tagStr.split(",").map((t) => t.trim());
        }
      }
    }

    return {
      title,
      content,
      type,
      category,
      tags,
      source: filename,
    };
  }
}

export const ragService = RAGService.getInstance();
