CREATE TABLE IF NOT EXISTS profile_keys (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  did text NOT NULL,
  public_key_jwk jsonb NOT NULL,
  private_key_enc jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_keys_profile_id ON profile_keys (profile_id);

CREATE TABLE IF NOT EXISTS attestation_blocks (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  signer_did text NOT NULL,
  signer_label text,
  status text NOT NULL,
  hash text NOT NULL,
  signature text NOT NULL,
  payload jsonb,
  timestamp timestamptz NOT NULL,
  context text,
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_attestation_blocks_profile_id ON attestation_blocks (profile_id);
CREATE INDEX IF NOT EXISTS idx_attestation_blocks_entity ON attestation_blocks (entity_type, entity_id);
