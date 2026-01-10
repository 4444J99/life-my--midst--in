ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS llm jsonb DEFAULT '{}'::jsonb;
