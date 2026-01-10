CREATE TABLE IF NOT EXISTS profile_backups (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL,
  bundle jsonb NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_backups_profile_id_idx ON profile_backups(profile_id);
