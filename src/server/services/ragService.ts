import { db } from "../db/db";
import { ragQueries } from "../db/schema";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { langchainService } from "@/services/langchain/LangChainService";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";

import path from "path";
import fs from "fs/promises";

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

type RetrievalResults = {
  bm25: Document[];
  vector: Array<[Document, number]>; // 向量检索结果包含相似度分数
};

export class RAGService {
  private static instance: RAGService;
  private vectorStore: PGVectorStore | null = null;
  private embeddings: OllamaEmbeddings;
  private bm25Retrievers: Map<string, BM25Retriever> = new Map(); // 缓存不同用户的BM25检索器

  private constructor() {
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

  // ─── Vector Store ────────────────────────────────────────────────────────────

  private async getVectorStore(): Promise<PGVectorStore> {
    if (this.vectorStore) return this.vectorStore;

    this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
      },
      tableName: "knowledge_base",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
      // embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || "1024"),
    });

    return this.vectorStore;
  }

  // ─── BM25 Retriever 初始化（新增）────────────────────────────────────────────
  /**
   * 初始化BM25检索器（按用户权限过滤文档）
   */
  private async getBM25Retriever(userId: string): Promise<BM25Retriever> {
    // 缓存key：区分公开文档+用户私有文档
    const cacheKey = `${userId}`;
    if (this.bm25Retrievers.has(cacheKey)) {
      return this.bm25Retrievers.get(cacheKey)!;
    }

    const vectorStore = await this.getVectorStore();
    // 从PGVectorStore中加载所有符合权限的文档（公开+当前用户+system）
    const allDocs = await vectorStore.similaritySearch("*", 10000); // 加载足够多的文档
    const filteredDocs = allDocs.filter((doc) => {
      const meta = doc.metadata;
      return (
        meta.isPublic === true ||
        meta.userId === "system" ||
        meta.userId === userId
      );
    });

    // 初始化BM25检索器
    const bm25Retriever = BM25Retriever.fromDocuments(filteredDocs, {
      k: parseInt(process.env.BM25_TOP_K || "10"), // BM25召回数量
    });
    this.bm25Retrievers.set(cacheKey, bm25Retriever);

    // 定期清理缓存（可选，避免内存泄漏）
    setTimeout(
      () => {
        this.bm25Retrievers.delete(cacheKey);
      },
      30 * 60 * 1000,
    ); // 30分钟后清理

    return bm25Retriever;
  }

  // ─── Embedding Test ──────────────────────────────────────────────────────────

  async testEmbeddingConnection(): Promise<{
    success: boolean;
    model: string;
    dimension?: number;
    error?: string;
  }> {
    const embeddingModel =
      process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:0.6b";
    try {
      const embedding = await this.embeddings.embedQuery("测试文本");

      if (!Array.isArray(embedding) || embedding.length === 0) {
        return {
          success: false,
          model: embeddingModel,
          error: "Invalid embedding response format",
        };
      }

      console.log(`[RAG] Embedding dimension: ${embedding.length}`);
      return {
        success: true,
        model: embeddingModel,
        dimension: embedding.length,
      };
    } catch (error) {
      return {
        success: false,
        model: embeddingModel,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ─── Add Documents ───────────────────────────────────────────────────────────

  async addDocuments(
    documents: Array<{
      title?: string;
      content: string;
      type: string;
      category?: string;
      tags?: string[];
      source?: string;
      userId?: string;
    }>,
  ): Promise<void> {
    console.log(`[RAG] Batch adding ${documents.length} documents`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: parseInt(process.env.CHUNK_SIZE || "1000"),
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || "100"),
      separators: ["\n\n", "\n", "。", "！", "？", "；", " ", ""],
      keepSeparator: false,
    });

    const allDocs: Document[] = [];

    for (const doc of documents) {
      const chunks = await splitter.createDocuments(
        [doc.content],
        [
          {
            title: doc.title || "",
            type: doc.type || "document",
            category: doc.category || "general",
            tags: JSON.stringify(doc.tags || []),
            source: doc.source || "",
            userId: doc.userId || "system",
            isPublic: !doc.userId || doc.userId === "system",
            originalId: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        ],
      );
      allDocs.push(...chunks);
    }

    console.log(`[RAG] Total chunks to embed: ${allDocs.length}`);

    const BATCH_SIZE = 50;
    const vectorStore = await this.getVectorStore();

    for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
      const batch = allDocs.slice(i, i + BATCH_SIZE);
      await vectorStore.addDocuments(batch);
      console.log(
        `[RAG] Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allDocs.length / BATCH_SIZE)}`,
      );
    }

    // 新增：添加文档后清空BM25缓存，确保新文档能被检索到
    this.bm25Retrievers.clear();

    console.log(`[RAG] Done. Added ${allDocs.length} chunks.`);
  }

  // ─── 多路结果融合（新增）──────────────────────────────────────────────────────
  /**
   * 融合BM25和向量检索结果
   * @param results 多路检索结果
   * @param userId 用户ID（用于权限过滤）
   * @returns 融合后的文档（带相似度分数）
   */
  private fuseRetrievalResults(
    results: RetrievalResults,
    userId: string,
  ): Array<[Document, number]> {
    // 1. 给BM25结果分配默认相似度（0.8-0.5区间，高于向量检索的低相似度结果）
    const bm25DocsWithScore = results.bm25.map((doc, index) => {
      // 按BM25召回顺序分配分数：第1个0.8，第2个0.75，依次递减
      const score = Math.max(0.5, 0.8 - index * 0.05);
      return [doc, score] as [Document, number];
    });

    // 2. 合并所有结果（向量+BM25）
    const allResults = [...results.vector, ...bm25DocsWithScore];

    // 3. 去重（基于originalId，避免重复chunk）
    const seenIds = new Set<string>();
    const uniqueResults = allResults.filter(([doc]) => {
      const originalId = doc.metadata.originalId as string;
      if (seenIds.has(originalId)) return false;
      seenIds.add(originalId);
      return true;
    });

    // 4. 权限过滤（复用原有逻辑）
    const filteredResults = uniqueResults.filter(([doc]) => {
      const meta = doc.metadata;
      return (
        meta.isPublic === true ||
        meta.userId === "system" ||
        meta.userId === userId
      );
    });

    // 5. 按相似度降序排序
    filteredResults.sort(([, a], [, b]) => b - a);

    return filteredResults;
  }

  // ─── Retrieval ───────────────────────────────────────────────────────────────

  /**
   * 检索相关文档
   * 采用多路召回策略：通过 BM25 结合向量相似度策略，合并去重后按相似度排序
   */
  async retrieveRelevantDocs(
    query: string,
    userId: string,
    limit: number = 5,
  ): Promise<RAGDocument[]> {
    const vectorStore = await this.getVectorStore();
    const bm25Retriever = await this.getBM25Retriever(userId); // 新增：初始化BM25检索器

    // 修改：并行调用向量检索和BM25检索
    const [vectorResults, bm25Results] = await Promise.all([
      vectorStore.similaritySearchWithScore(query, limit * 3), // 向量检索多召回一些
      bm25Retriever.invoke(query), // BM25检索
    ]);

    // 新增：融合多路结果
    const fusedResults = this.fuseRetrievalResults(
      {
        vector: vectorResults,
        bm25: bm25Results,
      },
      userId,
    );

    // 原有逻辑：截取topN并转换格式（仅修改了数据源从merged→fusedResults）
    return fusedResults.slice(0, limit).map(([doc, similarity]) => ({
      id: (doc.metadata.originalId as string) || crypto.randomUUID(),
      title: (doc.metadata.title as string) || "",
      content: doc.pageContent,
      type: (doc.metadata.type as string) || "document",
      category: (doc.metadata.category as string) || "general",
      tags: this.parseTags(doc.metadata.tags),
      source: (doc.metadata.source as string) || "",
      similarity,
    }));
  }

  private parseTags(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return [];
  }

  // ─── Generate Response ───────────────────────────────────────────────────────

  async generateRAGResponse(
    query: string,
    sessionId: string,
    userId: string,
    model?: string,
    options?: { topK?: number },
  ): Promise<RAGResponse> {
    console.log(
      `[RAG] Query: "${query}" (User: ${userId}, Session: ${sessionId})`,
    );

    const { topK = 5 } = options || {};
    const sources = await this.retrieveRelevantDocs(query, userId, topK);

    // 未找到任何文档
    if (sources.length === 0) {
      const noAnswerText =
        "资料库中未找到相关信息。请尝试调整查询或咨询管理员。";
      await db.insert(ragQueries).values({
        id: crypto.randomUUID(),
        query,
        retrievedDocs: [],
        response: noAnswerText,
        sessionId,
        userId,
      });
      return { answer: noAnswerText, query, sources: [] };
    }

    // 相似度阈值过滤，避免低质量文档污染 context
    const SIMILARITY_THRESHOLD = 0.4;
    const relevantSources = sources.filter(
      (s) => (s.similarity ?? 0) >= SIMILARITY_THRESHOLD,
    );

    if (relevantSources.length === 0) {
      return {
        answer: "找到了一些文档，但相关度较低，建议重新描述问题。",
        query,
        sources,
      };
    }

    // 构建 context（已按相似度降序排列）
    const context = relevantSources
      .map((d, i) => `[文档 ${i + 1}]\n标题: ${d.title}\n内容:\n${d.content}`)
      .join("\n\n---\n\n");

    const chatModel = langchainService.getModel(
      model || "openai/doubao-seed-2-0-pro-260215",
      {},
    );

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `你是一个专业的知识库助手。请严格基于以下【参考文档】回答问题。

规则：
1. 只使用文档中的信息，禁止编造
2. 引用来源时注明"根据文档X"
3. 文档中无相关信息时，直接说明"资料库中未找到相关信息"
4. 回答简洁、准确、有条理

【参考文档】
{context}`,
      ],
      ["user", "{question}"],
    ]);

    const answer = await prompt
      .pipe(chatModel)
      .pipe(new StringOutputParser())
      .invoke({ context, question: query });

    await db.insert(ragQueries).values({
      id: crypto.randomUUID(),
      query,
      retrievedDocs: sources.map((s) => s.id),
      response: answer,
      sessionId,
      userId,
    });

    return { answer, query, sources };
  }

  // ─── Initialize Knowledge Base ───────────────────────────────────────────────

  async initializeSystemKnowledge(): Promise<void> {
    console.log("[RAG] Initializing system knowledge base...");

    const knowledgeDir = path.join(process.cwd(), "src/knowledge");
    const files = await fs.readdir(knowledgeDir);

    const allDocuments: Array<{
      title: string;
      content: string;
      type: string;
      category?: string;
      tags?: string[];
      source?: string;
    }> = [];

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) continue;

      const ext = path.extname(file).toLowerCase();
      console.log(`[RAG] Processing: ${file}`);

      try {
        if (ext === ".json") {
          allDocuments.push(...(await this.parseJsonFile(filePath)));
        } else if (ext === ".md") {
          allDocuments.push(...(await this.parseMarkdownFile(filePath)));
        }
      } catch (err) {
        console.error(`[RAG] Failed to process ${file}:`, err);
      }
    }

    if (allDocuments.length > 0) {
      console.log(`[RAG] Adding ${allDocuments.length} documents...`);
      await this.addDocuments(allDocuments);
      console.log("[RAG] Knowledge base initialized!");
    } else {
      console.warn("[RAG] No documents found in knowledge directory");
    }
  }

  // ─── File Parsers ────────────────────────────────────────────────────────────

  /**
   * 解析 JSON 文件
   */
  private async parseJsonFile(filePath: string): Promise<
    Array<{
      title: string;
      content: string;
      type: string;
      category?: string;
      tags?: string[];
      source: string;
    }>
  > {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : [data];

    return items
      .filter((item) => !!item.content)
      .map((item) => ({
        title: item.title || path.basename(filePath, ".json"),
        content: item.content as string,
        type: (item.type as string) || "document",
        category: item.category as string | undefined,
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        source: filePath,
      }));
  }

  /**
   * 解析 Markdown 文件
   */
  private async parseMarkdownFile(filePath: string): Promise<
    Array<{
      title: string;
      content: string;
      type: string;
      source: string;
    }>
  > {
    const loader = new TextLoader(filePath);
    const docs = await loader.load();

    return docs.map((doc) => {
      const titleMatch = doc.pageContent.match(/^#\s+(.+)/m);
      const title = titleMatch?.[1] || path.basename(filePath, ".md");

      return {
        title,
        content: doc.pageContent,
        type: "markdown",
        source: filePath,
      };
    });
  }
}

export const ragService = RAGService.getInstance();
