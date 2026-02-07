-- 为 knowledge_base 表的 id 列添加默认值
-- 这样 PGVectorStore 在插入时如果不提供 ID，数据库会自动生成

ALTER TABLE knowledge_base 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 验证修改
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'knowledge_base' AND column_name = 'id';
