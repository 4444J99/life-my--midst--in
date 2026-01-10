CREATE TABLE IF NOT EXISTS custom_sections (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_logs (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_sections_profile_id ON custom_sections (profile_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_profile_id ON timeline_events (profile_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_profile_id ON verification_logs (profile_id);

CREATE INDEX IF NOT EXISTS idx_custom_sections_updated_at ON custom_sections (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_updated_at ON timeline_events (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_logs_updated_at ON verification_logs (updated_at DESC);
