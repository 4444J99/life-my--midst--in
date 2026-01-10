CREATE TABLE IF NOT EXISTS masks (
  id text PRIMARY KEY,
  name text NOT NULL,
  ontology text NOT NULL,
  functional_scope text NOT NULL,
  tone text NOT NULL,
  rhetorical_mode text NOT NULL,
  compression_ratio numeric NOT NULL,
  contexts text[] DEFAULT ARRAY[]::text[],
  triggers text[] DEFAULT ARRAY[]::text[],
  include_tags text[] DEFAULT ARRAY[]::text[],
  exclude_tags text[] DEFAULT ARRAY[]::text[],
  priority_weights jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS epochs (
  id text PRIMARY KEY,
  name text NOT NULL,
  summary text,
  ordering integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stages (
  id text PRIMARY KEY,
  title text NOT NULL,
  summary text,
  tags text[] DEFAULT ARRAY[]::text[],
  epoch_id text REFERENCES epochs(id),
  ordering integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_masks_updated_at ON masks (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_epochs_ordering ON epochs (ordering);
CREATE INDEX IF NOT EXISTS idx_stages_epoch_id ON stages (epoch_id);
