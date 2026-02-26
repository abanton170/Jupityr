CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for fast similarity search (after tables are created by Prisma)
-- This will need to be run after `prisma db push` or migrations
-- CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON "Chunk"
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_agent_id TEXT,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  source_id TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.content,
    c."sourceId" as source_id,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM "Chunk" c
  WHERE c."agentId" = match_agent_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
