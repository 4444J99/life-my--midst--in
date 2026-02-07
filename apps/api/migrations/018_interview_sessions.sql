-- Interview sessions: persistent storage for interview data
-- Replaces the in-memory Map<string, InterviewSession> in interviews.ts

CREATE TABLE IF NOT EXISTS interview_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interviewer_name   TEXT NOT NULL,
  organization_name  TEXT NOT NULL,
  job_title          TEXT NOT NULL,
  job_requirements   JSONB NOT NULL DEFAULT '[]',
  salary_range       JSONB,
  answers            JSONB NOT NULL DEFAULT '[]',
  status             TEXT NOT NULL DEFAULT 'in-progress'
                     CHECK (status IN ('in-progress', 'completed', 'archived')),
  compatibility_score INTEGER,
  compatibility_analysis JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_profile
  ON interview_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status
  ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_org
  ON interview_sessions(organization_name);
