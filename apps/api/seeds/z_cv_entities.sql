INSERT INTO experiences (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000101",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "roleTitle":"Systems Designer",
    "organization":"Midst Labs",
    "startDate":"2021-01-01",
    "isCurrent":true,
    "highlights":["Led architecture reviews","Shipped platform refactor"],
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO educations (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000102",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "institution":"Institute of Systems",
    "degree":"MSc",
    "fieldOfStudy":"Design Engineering",
    "startDate":"2018-01-01",
    "endDate":"2020-01-01",
    "isCurrent":false,
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000103",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "name":"Identity Narrative Engine",
    "role":"Lead",
    "startDate":"2022-01-01",
    "isOngoing":true,
    "url":"https://example.com/identity-engine",
    "highlights":["Built narrative templates","Aligned mask taxonomy"],
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO skills (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000104",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "name":"System Design",
    "category":"technical",
    "level":"expert",
    "isPrimary":true,
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO publications (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000105',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000105",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "title":"Narrative Systems at Scale",
    "publicationType":"conference",
    "date":"2023-06-01",
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO awards (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000106',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000106",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "title":"Design Excellence",
    "issuer":"Midst Labs",
    "date":"2023-01-01",
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO certifications (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000107',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000107",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "name":"Platform Architecture",
    "issuer":"Open Systems Institute",
    "issueDate":"2022-05-01",
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO social_links (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000108',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000108",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "platform":"website",
    "url":"https://example.com",
    "sortOrder":1,
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO custom_sections (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000109',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000109",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "title":"Selected Notes",
    "contentMarkdown":"- Built narrative engines\\n- Led cross-domain design research",
    "sortOrder":1,
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO timeline_events (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000110',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000110",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "entityKind":"experience",
    "entityId":"00000000-0000-0000-0000-000000000101",
    "title":"Joined Midst Labs",
    "startDate":"2021-01-01",
    "descriptionMarkdown":"Entered the systems design team.",
    "tags":["systems","design"],
    "lane":1,
    "importance":0.8,
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO verification_logs (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000501",
    "profileId":"00000000-0000-0000-0000-000000000001",
    "entityType":"experience",
    "entityId":"00000000-0000-0000-0000-000000000101",
    "credentialId":"00000000-0000-0000-0000-000000000201",
    "status":"verified",
    "source":"external",
    "verifierLabel":"Employment Credential",
    "notes":"Verified via VC bundle.",
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO verifiable_credentials (id, profile_id, data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id":"00000000-0000-0000-0000-000000000201",
    "issuerIdentityId":"00000000-0000-0000-0000-000000000010",
    "subjectProfileId":"00000000-0000-0000-0000-000000000001",
    "types":["VerifiableCredential","EmploymentCredential"],
    "issuedAt":"2024-01-01T00:00:00.000Z",
    "credentialSubject":{"summary":"Employment verified"},
    "proof":{"type":"stub","signature":"none"},
    "summary":"Employment verified",
    "status":"valid",
    "createdAt":"2024-01-01T00:00:00.000Z",
    "updatedAt":"2024-01-01T00:00:00.000Z"
  }'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO attestation_links (id, profile_id, credential_id, target_type, target_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000201',
  'experience',
  '00000000-0000-0000-0000-000000000101',
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_edges (id, profile_id, from_type, from_id, to_type, to_id, relation_type, metadata, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  'experience',
  '00000000-0000-0000-0000-000000000101',
  'project',
  '00000000-0000-0000-0000-000000000103',
  'led',
  '{}'::jsonb,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_revisions (id, profile_id, entity_type, entity_id, data, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000001',
  'experience',
  '00000000-0000-0000-0000-000000000101',
  '{"snapshot":"initial"}'::jsonb,
  '2024-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;
