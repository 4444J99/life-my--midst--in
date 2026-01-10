CREATE TABLE IF NOT EXISTS verifiable_credentials (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attestation_links (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credential_id uuid NOT NULL REFERENCES verifiable_credentials(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  visibility text NOT NULL DEFAULT 'public',
  label_override text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_edges (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_type text NOT NULL,
  from_id uuid NOT NULL,
  to_type text NOT NULL,
  to_id uuid NOT NULL,
  relation_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_revisions (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifiable_credentials_profile_id ON verifiable_credentials (profile_id);
CREATE INDEX IF NOT EXISTS idx_attestation_links_profile_id ON attestation_links (profile_id);
CREATE INDEX IF NOT EXISTS idx_attestation_links_credential_id ON attestation_links (credential_id);
CREATE INDEX IF NOT EXISTS idx_attestation_links_target ON attestation_links (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_content_edges_profile_id ON content_edges (profile_id);
CREATE INDEX IF NOT EXISTS idx_content_edges_from ON content_edges (from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_content_edges_to ON content_edges (to_type, to_id);

CREATE INDEX IF NOT EXISTS idx_content_revisions_profile_id ON content_revisions (profile_id);
CREATE INDEX IF NOT EXISTS idx_content_revisions_entity ON content_revisions (entity_type, entity_id);
