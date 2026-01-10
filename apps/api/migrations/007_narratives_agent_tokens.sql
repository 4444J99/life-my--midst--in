CREATE TABLE IF NOT EXISTS narrative_snapshots (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mask_id text,
  status text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_narrative_snapshots_profile_id ON narrative_snapshots (profile_id);
CREATE INDEX IF NOT EXISTS idx_narrative_snapshots_status ON narrative_snapshots (status);
CREATE INDEX IF NOT EXISTS idx_narrative_snapshots_mask_status ON narrative_snapshots (profile_id, mask_id, status);

CREATE TABLE IF NOT EXISTS agent_tokens (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label text,
  token_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_tokens_hash ON agent_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_agent_tokens_profile_id ON agent_tokens (profile_id);
