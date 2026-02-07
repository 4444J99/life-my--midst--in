-- Migration: 019_sbt_tokens
-- Soulbound Token records linking attestations to on-chain ERC-5192 tokens

CREATE TABLE IF NOT EXISTS sbt_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attestation_id UUID NOT NULL,
  contract_address TEXT NOT NULL,
  token_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 11155111,
  wallet_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'minted', 'revoked', 'failed')),
  minted_at TIMESTAMPTZ,
  burned_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sbt_tokens_profile_id ON sbt_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_sbt_tokens_wallet_address ON sbt_tokens(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sbt_tokens_attestation_id ON sbt_tokens(attestation_id);
CREATE INDEX IF NOT EXISTS idx_sbt_tokens_chain_contract ON sbt_tokens(chain_id, contract_address);

-- Wallet connections table: tracks which wallets are bound to which profiles
CREATE TABLE IF NOT EXISTS wallet_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 11155111,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  signature TEXT,
  message TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, wallet_address, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_connections_profile ON wallet_connections(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_address ON wallet_connections(wallet_address);
