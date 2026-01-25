-- RAG 知识库表
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'document',
    category VARCHAR(100),
    tags JSON DEFAULT '[]',
    source VARCHAR(255),
    embedding JSON,
    user_id TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- RAG 查询历史表
CREATE TABLE IF NOT EXISTS rag_queries (
    id UUID PRIMARY KEY,
    query TEXT NOT NULL,
    retrieved_docs JSON NOT NULL,
    response TEXT NOT NULL,
    session_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type ON knowledge_base(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_is_public ON knowledge_base(is_public);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_deleted_at ON knowledge_base(deleted_at);

CREATE INDEX IF NOT EXISTS idx_rag_queries_user_id ON rag_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_session_id ON rag_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created_at ON rag_queries(created_at);