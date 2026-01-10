CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles ((data->>'updatedAt'));
