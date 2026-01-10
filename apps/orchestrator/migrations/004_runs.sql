ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS run_id text;

CREATE INDEX IF NOT EXISTS idx_tasks_run_id ON tasks (run_id);

CREATE TABLE IF NOT EXISTS runs (
  id text PRIMARY KEY,
  type text NOT NULL,
  status text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  task_ids jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_status ON runs (status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC);
