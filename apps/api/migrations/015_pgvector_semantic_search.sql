-- pgvector Semantic Search Infrastructure
-- Enables vector similarity search for job postings and profile embeddings.

-- Enable pgvector extension (available via pgvector/pgvector Docker image)
CREATE EXTENSION IF NOT EXISTS vector;

-- Convert job_postings.vectors from FLOAT8[] to vector(1536)
-- text-embedding-3-small produces 1536-dimensional embeddings
DO $$
BEGIN
  -- Only alter if column exists and is float8[]
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_postings' AND column_name = 'vectors'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE job_postings ALTER COLUMN vectors TYPE vector(1536)
      USING vectors::vector(1536);
  END IF;
END $$;

-- Profile embeddings for semantic profile matching
CREATE TABLE IF NOT EXISTS profile_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL,
    content_type TEXT NOT NULL,  -- 'summary', 'experience', 'skills', 'full_profile'
    content_hash TEXT NOT NULL,  -- SHA-256 of source text (for cache invalidation)
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(profile_id, content_type)
);

-- HNSW index for fast approximate nearest-neighbor search on job postings
-- cosine distance is standard for text embeddings
CREATE INDEX IF NOT EXISTS idx_job_postings_vectors_hnsw
    ON job_postings USING hnsw (vectors vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- HNSW index for profile embeddings
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_hnsw
    ON profile_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Index for profile embedding lookups
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_profile_id
    ON profile_embeddings(profile_id);
