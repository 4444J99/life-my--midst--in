-- DID Document Registry
-- Provides persistent storage for W3C DID Core documents,
-- replacing the in-memory MemoryDIDRegistry.

CREATE TABLE IF NOT EXISTS did_documents (
    did TEXT PRIMARY KEY,
    document JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for listing active DIDs
CREATE INDEX IF NOT EXISTS idx_did_documents_active
    ON did_documents(did) WHERE deactivated = FALSE;

-- GIN index for querying DID document contents (verification methods, services)
CREATE INDEX IF NOT EXISTS idx_did_documents_document
    ON did_documents USING GIN (document);
