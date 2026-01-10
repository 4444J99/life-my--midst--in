CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  role text NOT NULL,
  description text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL,
  result jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
