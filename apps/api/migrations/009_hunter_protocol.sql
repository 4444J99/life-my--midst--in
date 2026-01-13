-- Hunter Protocol Tables

-- Job Postings
CREATE TABLE IF NOT EXISTS job_postings (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    description_markdown TEXT,
    url TEXT,
    salary_range TEXT,
    location TEXT,
    vectors FLOAT8[], -- Requires pgvector extension if we were using it, but for now array is fine
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_posting_id TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft',
    cover_letter_markdown TEXT,
    resume_snapshot_id TEXT, -- Can link to a specific resume version/mask
    applied_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hunter Tasks (Agent Tasks specific to Hunter Protocol, if needed separate from Orchestrator)
-- For now, we'll assume the Orchestrator handles the task execution state, 
-- but we might want a 'search_runs' or similar if we strictly follow the schema.
-- Let's stick to the core entities for now.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_profile_id ON job_postings(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_profile_id ON job_applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON job_applications(job_posting_id);
