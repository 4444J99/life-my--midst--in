/**
 * Embeddings Repository
 *
 * Stores and queries vector embeddings using pgvector for semantic search.
 * Supports both profile embeddings and job posting vector search.
 */

import { Pool } from 'pg';

export interface ProfileEmbedding {
  id: string;
  profileId: string;
  contentType: string;
  contentHash: string;
  embedding: number[];
  createdAt: string;
  updatedAt: string;
}

export interface SimilarityResult<T = unknown> {
  item: T;
  score: number; // cosine similarity (0-1, higher = more similar)
}

export interface EmbeddingsRepo {
  /** Upsert a profile embedding (one per profile+contentType) */
  upsertProfileEmbedding(
    profileId: string,
    contentType: string,
    contentHash: string,
    embedding: number[],
  ): Promise<void>;

  /** Find profiles similar to a given embedding vector */
  searchProfilesBySimilarity(
    embedding: number[],
    limit?: number,
  ): Promise<SimilarityResult<{ profileId: string; contentType: string }>[]>;

  /** Find job postings similar to a given embedding vector */
  searchJobsBySimilarity(
    embedding: number[],
    limit?: number,
    profileId?: string,
  ): Promise<SimilarityResult<{ id: string; title: string; company: string }>[]>;

  /** Store embedding for a job posting */
  updateJobEmbedding(jobId: string, embedding: number[]): Promise<void>;

  /** Check if a profile embedding is stale (content changed) */
  isStale(profileId: string, contentType: string, contentHash: string): Promise<boolean>;
}

export class PostgresEmbeddingsRepo implements EmbeddingsRepo {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async upsertProfileEmbedding(
    profileId: string,
    contentType: string,
    contentHash: string,
    embedding: number[],
  ): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`;
    await this.pool.query(
      `INSERT INTO profile_embeddings (profile_id, content_type, content_hash, embedding)
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (profile_id, content_type)
       DO UPDATE SET
         content_hash = EXCLUDED.content_hash,
         embedding = EXCLUDED.embedding,
         updated_at = NOW()`,
      [profileId, contentType, contentHash, vectorStr],
    );
  }

  async searchProfilesBySimilarity(
    embedding: number[],
    limit = 10,
  ): Promise<SimilarityResult<{ profileId: string; contentType: string }>[]> {
    const vectorStr = `[${embedding.join(',')}]`;
    const result = await this.pool.query(
      `SELECT profile_id, content_type,
              1 - (embedding <=> $1::vector) AS score
       FROM profile_embeddings
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    );

    return result.rows.map((row: { profile_id: string; content_type: string; score: number }) => ({
      item: { profileId: row.profile_id, contentType: row.content_type },
      score: row.score,
    }));
  }

  async searchJobsBySimilarity(
    embedding: number[],
    limit = 10,
    profileId?: string,
  ): Promise<SimilarityResult<{ id: string; title: string; company: string }>[]> {
    const vectorStr = `[${embedding.join(',')}]`;

    // Only search jobs that have embeddings
    const whereClause = profileId
      ? 'WHERE vectors IS NOT NULL AND profile_id = $3'
      : 'WHERE vectors IS NOT NULL';

    const params: (string | number)[] = [vectorStr, limit];
    if (profileId) params.push(profileId);

    const result = await this.pool.query(
      `SELECT id, title, company,
              1 - (vectors <=> $1::vector) AS score
       FROM job_postings
       ${whereClause}
       ORDER BY vectors <=> $1::vector
       LIMIT $2`,
      params,
    );

    return result.rows.map(
      (row: { id: string; title: string; company: string; score: number }) => ({
        item: { id: row.id, title: row.title, company: row.company },
        score: row.score,
      }),
    );
  }

  async updateJobEmbedding(jobId: string, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`;
    await this.pool.query(
      `UPDATE job_postings SET vectors = $2::vector, updated_at = NOW() WHERE id = $1`,
      [jobId, vectorStr],
    );
  }

  async isStale(profileId: string, contentType: string, contentHash: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT content_hash FROM profile_embeddings
       WHERE profile_id = $1 AND content_type = $2`,
      [profileId, contentType],
    );

    const row = result.rows[0] as { content_hash: string } | undefined;
    if (!row) return true; // No embedding yet = stale
    return row.content_hash !== contentHash;
  }
}

/** In-memory implementation for testing */
export class InMemoryEmbeddingsRepo implements EmbeddingsRepo {
  private profiles = new Map<
    string,
    { profileId: string; contentType: string; contentHash: string; embedding: number[] }
  >();
  private jobs = new Map<string, number[]>();

  private key(profileId: string, contentType: string): string {
    return `${profileId}:${contentType}`;
  }

  upsertProfileEmbedding(
    profileId: string,
    contentType: string,
    contentHash: string,
    embedding: number[],
  ): Promise<void> {
    this.profiles.set(this.key(profileId, contentType), {
      profileId,
      contentType,
      contentHash,
      embedding,
    });
    return Promise.resolve();
  }

  searchProfilesBySimilarity(
    embedding: number[],
    limit = 10,
  ): Promise<SimilarityResult<{ profileId: string; contentType: string }>[]> {
    return Promise.resolve(
      Array.from(this.profiles.values())
        .map((p) => ({
          item: { profileId: p.profileId, contentType: p.contentType },
          score: cosineSimilarity(embedding, p.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit),
    );
  }

  searchJobsBySimilarity(
    embedding: number[],
    limit = 10,
  ): Promise<SimilarityResult<{ id: string; title: string; company: string }>[]> {
    return Promise.resolve(
      Array.from(this.jobs.entries())
        .map(([id, vec]) => ({
          item: { id, title: '', company: '' },
          score: cosineSimilarity(embedding, vec),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit),
    );
  }

  updateJobEmbedding(jobId: string, embedding: number[]): Promise<void> {
    this.jobs.set(jobId, embedding);
    return Promise.resolve();
  }

  isStale(profileId: string, contentType: string, contentHash: string): Promise<boolean> {
    const existing = this.profiles.get(this.key(profileId, contentType));
    if (!existing) return Promise.resolve(true);
    return Promise.resolve(existing.contentHash !== contentHash);
  }
}

/** Compute cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
