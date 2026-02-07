# Artifact System API Guide

**Version**: 1.0  
**Last Updated**: January 16, 2026  
**Base URL**: `http://localhost:3001` (development) | `https://api.yourdomain.com` (production)

## Table of Contents

1. [Authentication](#authentication)
2. [Artifact Endpoints](#artifact-endpoints)
3. [Integration Endpoints](#integration-endpoints)
4. [OAuth Flow](#oauth-flow)
5. [Pagination & Filtering](#pagination--filtering)
6. [Error Responses](#error-responses)
7. [Rate Limiting](#rate-limiting)
8. [Examples](#examples)

---

## Authentication

### Bearer Token Authentication

All API requests require authentication via JWT bearer token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/profiles/{profileId}/artifacts
```

### Obtaining a Token

```bash
# Login
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}

# Response
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  }
}
```

### Token Expiry

- Tokens expire after **24 hours**
- Refresh token before expiry or re-authenticate
- 401 Unauthorized response indicates expired token

---

## Artifact Endpoints

### List Artifacts

**GET** `/profiles/:profileId/artifacts`

List artifacts with optional filtering and pagination.

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `approved`, `rejected`, `archived`)
- `type` (optional): Filter by artifact type (`academic_paper`, `creative_writing`, etc.)
- `tags` (optional): Filter by tags (comma-separated)
- `sourceProvider` (optional): Filter by source (`google_drive`, `dropbox`, etc.)
- `offset` (optional): Pagination offset (default: 0)
- `limit` (optional): Page size (default: 20, max: 100)

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts?status=pending&limit=10"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": [
    {
      "id": "art-456",
      "profileId": "prof-123",
      "name": "dissertation.pdf",
      "title": "Temporal Dynamics of Narrative Systems",
      "artifactType": "academic_paper",
      "status": "pending",
      "sourceProvider": "google_drive",
      "sourcePath": "/Academic/Papers/dissertation.pdf",
      "mimeType": "application/pdf",
      "fileSize": 2500000,
      "createdDate": "2015-05-20T00:00:00Z",
      "modifiedDate": "2015-05-25T00:00:00Z",
      "capturedDate": "2026-01-16T12:00:00Z",
      "confidence": 0.95,
      "tags": ["research", "phd"],
      "createdAt": "2026-01-16T12:00:00Z",
      "updatedAt": "2026-01-16T12:00:00Z"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 10,
    "total": 142
  }
}
```

### List Pending Artifacts

**GET** `/profiles/:profileId/artifacts/pending`

Shortcut for listing artifacts awaiting approval.

**Query Parameters**: Same as `/artifacts` (except `status` is always `pending`)

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/pending?limit=20"
```

### Get Artifact Details

**GET** `/profiles/:profileId/artifacts/:artifactId`

Retrieve detailed information about a specific artifact.

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/art-456"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": {
    "id": "art-456",
    "profileId": "prof-123",
    "name": "dissertation.pdf",
    "title": "Temporal Dynamics of Narrative Systems",
    "descriptionMarkdown": "Ph.D. dissertation exploring...",
    "artifactType": "academic_paper",
    "status": "pending",
    "sourceProvider": "google_drive",
    "sourceId": "1abc123xyz",
    "sourcePath": "/Academic/Papers/dissertation.pdf",
    "mimeType": "application/pdf",
    "fileSize": 2500000,
    "createdDate": "2015-05-20T00:00:00Z",
    "modifiedDate": "2015-05-25T00:00:00Z",
    "capturedDate": "2026-01-16T12:00:00Z",
    "confidence": 0.95,
    "tags": ["research", "phd", "completed"],
    "authors": ["Jane Doe"],
    "keywords": ["narrative", "temporal", "systems thinking"],
    "integrity": {
      "hash": "sha256:abc123...",
      "timestamp": "2026-01-16T12:00:00Z",
      "did": "did:web:midst.example.com",
      "signature": "base64-encoded-signature"
    },
    "createdAt": "2026-01-16T12:00:00Z",
    "updatedAt": "2026-01-16T12:00:00Z"
  }
}
```

### Update Artifact Metadata

**PATCH** `/profiles/:profileId/artifacts/:artifactId`

Update artifact title, description, type, tags, etc.

**Request Body**:
```json
{
  "title": "Updated Title",
  "descriptionMarkdown": "Updated description",
  "artifactType": "creative_writing",
  "tags": ["poetry", "2024"]
}
```

**Example**:
```bash
curl -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "tags": ["research", "published"]}' \
  "http://localhost:3001/profiles/prof-123/artifacts/art-456"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": {
    "id": "art-456",
    "title": "Updated Title",
    "tags": ["research", "published"],
    "updatedAt": "2026-01-16T13:00:00Z"
  }
}
```

### Approve Artifact

**POST** `/profiles/:profileId/artifacts/:artifactId/approve`

Approve a pending artifact for inclusion in CV.

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/art-456/approve"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": {
    "id": "art-456",
    "status": "approved",
    "updatedAt": "2026-01-16T13:00:00Z"
  }
}
```

### Reject Artifact

**POST** `/profiles/:profileId/artifacts/:artifactId/reject`

Reject an artifact (won't appear in CV).

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/art-456/reject"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": {
    "id": "art-456",
    "status": "rejected",
    "updatedAt": "2026-01-16T13:00:00Z"
  }
}
```

### Archive Artifact

**DELETE** `/profiles/:profileId/artifacts/:artifactId`

Soft-delete an artifact (status set to `archived`).

**Example**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/art-456"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": {
    "id": "art-456",
    "status": "archived",
    "updatedAt": "2026-01-16T13:00:00Z"
  }
}
```

### Link Artifact to Project

**POST** `/profiles/:profileId/artifacts/:artifactId/links`

Link an approved artifact to a Project or Publication.

**Request Body**:
```json
{
  "targetType": "project",
  "targetId": "proj-789",
  "relationship": "deliverable"
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetType": "project", "targetId": "proj-789"}' \
  "http://localhost:3001/profiles/prof-123/artifacts/art-456/links"
```

**Response** (201 Created):
```json
{
  "ok": true,
  "data": {
    "linkId": "link-abc",
    "artifactId": "art-456",
    "targetType": "project",
    "targetId": "proj-789",
    "relationship": "deliverable",
    "createdAt": "2026-01-16T13:00:00Z"
  }
}
```

---

## Integration Endpoints

### List Cloud Storage Integrations

**GET** `/profiles/:profileId/integrations`

List all connected cloud storage providers.

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/integrations"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": [
    {
      "id": "int-123",
      "profileId": "prof-123",
      "provider": "google_drive",
      "status": "connected",
      "folderConfig": {
        "includedFolders": ["/Academic", "/Creative"],
        "excludedPatterns": ["*/Private/*"],
        "maxFileSizeMB": 100
      },
      "lastSyncedAt": "2026-01-16T06:00:00Z",
      "createdAt": "2026-01-10T00:00:00Z",
      "updatedAt": "2026-01-16T06:00:00Z"
    }
  ]
}
```

### Get Integration Details

**GET** `/profiles/:profileId/integrations/:integrationId`

Retrieve details of a specific integration.

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/integrations/int-123"
```

### Update Integration Configuration

**PATCH** `/profiles/:profileId/integrations/:integrationId`

Update folder configuration, exclusion patterns, etc.

**Request Body**:
```json
{
  "folderConfig": {
    "includedFolders": ["/Academic", "/Creative", "/Code"],
    "excludedPatterns": ["*/Private/*", "*/Temp/*"],
    "maxFileSizeMB": 150
  }
}
```

**Example**:
```bash
curl -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folderConfig": {"maxFileSizeMB": 150}}' \
  "http://localhost:3001/profiles/prof-123/integrations/int-123"
```

### Trigger Sync

**POST** `/profiles/:profileId/integrations/:integrationId/sync`

Manually trigger artifact sync (full or incremental).

**Request Body**:
```json
{
  "type": "full"  // or "incremental"
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}' \
  "http://localhost:3001/profiles/prof-123/integrations/int-123/sync"
```

**Response** (202 Accepted):
```json
{
  "ok": true,
  "data": {
    "taskId": "task-xyz",
    "status": "queued",
    "message": "Sync task queued for execution"
  }
}
```

### Disconnect Integration

**DELETE** `/profiles/:profileId/integrations/:integrationId`

Disconnect a cloud storage provider (artifacts preserved).

**Example**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/profiles/prof-123/integrations/int-123"
```

**Response** (200 OK):
```json
{
  "ok": true,
  "data": {
    "id": "int-123",
    "status": "disconnected",
    "message": "Integration disconnected. Artifacts preserved."
  }
}
```

---

## OAuth Flow

### OAuth Flow Diagram

```
┌──────────┐                    ┌──────────┐                ┌────────────────┐
│  User    │                    │   API    │                │ Cloud Provider │
│ (Browser)│                    │ Service  │                │  (Google/DBX)  │
└────┬─────┘                    └────┬─────┘                └────────┬───────┘
     │                               │                               │
     │ 1. Click "Connect Google"     │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │ 2. GET /integrations/         │                               │
     │    cloud-storage/connect      │                               │
     │                               │                               │
     │ 3. Redirect to OAuth URL      │                               │
     │<──────────────────────────────┤                               │
     │                               │                               │
     │ 4. Redirect to provider       │                               │
     ├───────────────────────────────┼──────────────────────────────>│
     │                               │                               │
     │ 5. User grants permission     │                               │
     │<──────────────────────────────┼───────────────────────────────┤
     │                               │                               │
     │ 6. Redirect to callback       │                               │
     │    with authorization code    │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ 7. Exchange code for tokens   │
     │                               ├──────────────────────────────>│
     │                               │                               │
     │                               │ 8. Return access + refresh    │
     │                               │<──────────────────────────────┤
     │                               │                               │
     │                               │ 9. Store encrypted tokens     │
     │                               │    in database                │
     │                               │                               │
     │ 10. Redirect to success page  │                               │
     │<──────────────────────────────┤                               │
     │                               │                               │
```

### Step 1: Initiate OAuth Flow

**POST** `/integrations/cloud-storage/connect`

**Request Body**:
```json
{
  "provider": "google_drive",
  "profileId": "prof-123"
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "authorizationUrl": "https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&scope=..."
}
```

User is redirected to `authorizationUrl` to grant permission.

### Step 2: OAuth Callback

**GET** `/integrations/cloud-storage/callback?code=AUTHORIZATION_CODE&state=STATE`

Provider redirects user back to this endpoint with authorization code.

Backend exchanges code for tokens and stores encrypted in database.

**Response** (302 Redirect):
```
Location: /settings/integrations?success=true
```

---

## Pagination & Filtering

### Pagination

All list endpoints support pagination via `offset` and `limit` parameters:

```bash
# Page 1 (items 0-19)
curl "http://localhost:3001/profiles/prof-123/artifacts?offset=0&limit=20"

# Page 2 (items 20-39)
curl "http://localhost:3001/profiles/prof-123/artifacts?offset=20&limit=20"

# Page 3 (items 40-59)
curl "http://localhost:3001/profiles/prof-123/artifacts?offset=40&limit=20"
```

**Response includes pagination metadata**:
```json
{
  "ok": true,
  "data": [...],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 142
  }
}
```

### Filtering

**By Status**:
```bash
curl "http://localhost:3001/profiles/prof-123/artifacts?status=pending"
curl "http://localhost:3001/profiles/prof-123/artifacts?status=approved"
```

**By Artifact Type**:
```bash
curl "http://localhost:3001/profiles/prof-123/artifacts?type=academic_paper"
curl "http://localhost:3001/profiles/prof-123/artifacts?type=visual_art"
```

**By Tags** (comma-separated):
```bash
curl "http://localhost:3001/profiles/prof-123/artifacts?tags=research,published"
```

**By Source Provider**:
```bash
curl "http://localhost:3001/profiles/prof-123/artifacts?sourceProvider=google_drive"
```

**Multiple Filters**:
```bash
curl "http://localhost:3001/profiles/prof-123/artifacts?status=pending&type=academic_paper&tags=research&limit=10"
```

---

## Error Responses

### Error Format

All errors follow consistent JSON structure:

```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

### Common HTTP Status Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **202 Accepted**: Request accepted for async processing
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily down

### Example Error Responses

**401 Unauthorized**:
```json
{
  "ok": false,
  "error": "unauthorized",
  "message": "Authentication token is missing or expired"
}
```

**404 Not Found**:
```json
{
  "ok": false,
  "error": "not_found",
  "message": "Artifact with id 'art-456' not found"
}
```

**400 Bad Request**:
```json
{
  "ok": false,
  "error": "validation_error",
  "message": "Invalid request parameters",
  "details": {
    "artifactType": "Must be one of: academic_paper, creative_writing, visual_art, ..."
  }
}
```

**429 Rate Limited**:
```json
{
  "ok": false,
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

---

## Rate Limiting

### Limits

- **Authenticated requests**: 1000 requests/hour per user
- **OAuth endpoints**: 10 requests/hour per IP
- **Sync triggers**: 5 requests/hour per integration

### Headers

Rate limit information included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1610000000
```

### Handling Rate Limits

When rate limited (429 response):
1. Check `Retry-After` header (seconds to wait)
2. Implement exponential backoff
3. Cache responses to reduce API calls

---

## Examples

### Complete Workflow: Connect Google Drive & Review Artifacts

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}' \
  | jq -r '.token')

# 2. Initiate OAuth flow
AUTH_URL=$(curl -X POST http://localhost:3001/integrations/cloud-storage/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"google_drive","profileId":"prof-123"}' \
  | jq -r '.authorizationUrl')

echo "Visit: $AUTH_URL"
# User completes OAuth in browser

# 3. List integrations (after OAuth complete)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/profiles/prof-123/integrations" | jq

# 4. Trigger sync
INTEGRATION_ID="int-123"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"full"}' \
  "http://localhost:3001/profiles/prof-123/integrations/$INTEGRATION_ID/sync"

# 5. Wait for sync to complete (check logs or poll)
sleep 60

# 6. List pending artifacts
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/pending?limit=10" | jq

# 7. Approve first artifact
ARTIFACT_ID=$(curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/pending?limit=1" \
  | jq -r '.data[0].id')

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/profiles/prof-123/artifacts/$ARTIFACT_ID/approve"

echo "Artifact $ARTIFACT_ID approved!"
```

---

**Document Version**: 1.0  
**Last Updated**: January 16, 2026  
**API Spec**: OpenAPI 3.0 available at `/api-docs`
