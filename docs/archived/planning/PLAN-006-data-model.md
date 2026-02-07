# Data Model Expansion (Draft)

Updated: 2025-12-28  
Scope: CV entities, external IDs/settings, credentials, content graph, revisions.

## Core profile storage
- `profiles` (existing): `id uuid` (PK), `data jsonb`, `created_at`, `updated_at`.
- External IDs + settings live inside `profiles.data.externalIds` and `profiles.data.settings`.

## CV entity tables (new, JSONB payloads)
Each table: `id uuid` (PK), `profile_id uuid` (FK -> profiles.id, ON DELETE CASCADE), `data jsonb`, `created_at`, `updated_at`.
- `experiences`
- `educations`
- `projects`
- `skills`
- `publications`
- `awards`
- `certifications`
- `social_links`

## Verifiable credentials + attestations (new)
- `verifiable_credentials`: `id uuid` (PK), `profile_id uuid` (FK -> profiles.id), `data jsonb`, `created_at`, `updated_at`.
- `attestation_links`: `id uuid` (PK), `profile_id uuid` (FK -> profiles.id), `credential_id uuid` (FK -> verifiable_credentials.id),
  `target_type text`, `target_id uuid`, `visibility text`, `label_override text`, `created_at`, `updated_at`.
  - `target_type` enum (application): `experience|education|project|skill|publication|award|certification|socialLink`.

## Content relationship graph (new)
- `content_edges`: `id uuid` (PK), `profile_id uuid` (FK), `from_type text`, `from_id uuid`, `to_type text`, `to_id uuid`,
  `relation_type text`, `metadata jsonb`, `created_at`, `updated_at`.

## Content revisions (new)
- `content_revisions`: `id uuid` (PK), `profile_id uuid` (FK), `entity_type text`, `entity_id uuid`, `data jsonb`, `created_at`.
  - Immutable history for item snapshots.

## Indexes
- Per table: index on `profile_id`.
- `attestation_links`: indexes on `credential_id`, `(target_type, target_id)`.
- `content_edges`: indexes on `(from_type, from_id)`, `(to_type, to_id)`.
- `content_revisions`: index on `(entity_type, entity_id)`.
