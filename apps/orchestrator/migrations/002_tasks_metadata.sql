ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;
