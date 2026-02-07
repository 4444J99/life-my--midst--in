# API Reference

**Version:** 0.2.0  
**Base URL (Development):** `http://localhost:3001`  
**Base URL (Production):** `https://api.inmidstmylife.com`

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Interactive API Documentation](#interactive-api-documentation)
- [Core Endpoints](#core-endpoints)
  - [System](#system)
  - [Profiles](#profiles)
  - [CV Components](#cv-components)
  - [Masks & Taxonomy](#masks--taxonomy)
  - [Exports](#exports)
  - [Hunter Protocol](#hunter-protocol)
- [GraphQL API](#graphql-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Overview

The **In Midst My Life API** provides a RESTful interface for managing dynamic, mask-based CVs and résumés. The system supports:

- **Profile Management**: CRUD operations for user profiles with temporal epochs and career stages
- **Mask System**: Context-specific identity masks with cognitive/expressive/operational ontologies
- **CV Components**: Experiences, educations, skills, projects, credentials, and attestations
- **Narrative Generation**: AI-powered résumé narrative blocks with weighting and LLM ranking
- **Export Formats**: JSON-LD (semantic web), PDF (résumé), Verifiable Credentials (W3C standard)
- **Hunter Protocol**: Autonomous job search and application automation
- **GraphQL API**: Unified query interface with subscriptions support

---

## Authentication

Most endpoints require JWT bearer token authentication. Include the token in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

Tokens include permission claims for fine-grained access control. Obtain tokens via your authentication provider or identity service.

**Unauthenticated Endpoints:**
- `GET /health`
- `GET /ready`
- `GET /openapi.yaml`

---

## Interactive API Documentation

### Swagger UI

Access interactive API documentation with live testing capabilities:

```
http://localhost:3001/docs
```

The Swagger UI provides:
- Full endpoint documentation
- Request/response schemas
- Interactive "Try it out" functionality
- Example requests and responses

### Redoc

Alternative documentation interface with improved readability:

```
http://localhost:3001/redoc
```

Redoc offers:
- Clean, responsive layout
- Search functionality
- Code samples in multiple languages
- Downloadable OpenAPI specification

### OpenAPI Specification

Download the raw OpenAPI YAML specification:

```bash
curl http://localhost:3001/openapi.yaml > openapi.yaml
```

Two specifications are available:
- **Main API**: `/openapi.yaml` (Core CV/Mask functionality)
- **Hunter Protocol**: `/openapi-hunter.yaml` (Job search automation)

---

## Core Endpoints

### System

#### Health Check
```http
GET /health
```

Returns API health status (always succeeds if server is running).

**Response:**
```json
{
  "status": "ok"
}
```

---

#### Readiness Probe
```http
GET /ready
```

Checks if all dependencies (database, cache, etc.) are healthy.

**Response (200):**
```json
{
  "status": "ready"
}
```

**Response (503):**
```json
{
  "status": "degraded",
  "checks": {
    "database": "healthy",
    "cache": "unhealthy"
  }
}
```

---

#### Metrics
```http
GET /metrics
```

Returns Prometheus-compatible metrics for monitoring.

**Response:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/profiles",status="200"} 1247
...
```

⚠️ **Security Note:** Restrict `/metrics` endpoint in production via ingress auth or IP allowlist.

---

### Profiles

#### List Profiles
```http
GET /profiles
```

Retrieve all profiles for the authenticated user.

**Query Parameters:**
- `limit` (integer, optional): Maximum number of results (default: 50, max: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "profiles": [
    {
      "id": "uuid",
      "slug": "john-doe",
      "displayName": "John Doe",
      "title": "Software Engineer",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

#### Get Profile
```http
GET /profiles/{id}
```

Retrieve a specific profile by ID.

**Response:**
```json
{
  "id": "uuid",
  "identityId": "uuid",
  "slug": "john-doe",
  "displayName": "John Doe",
  "title": "Software Engineer",
  "headline": "Building scalable systems",
  "summaryMarkdown": "Experienced engineer...",
  "avatarUrl": "https://example.com/avatar.jpg",
  "locationText": "San Francisco, CA",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T00:00:00Z"
}
```

---

#### Create Profile
```http
POST /profiles
Content-Type: application/json
```

**Request Body:**
```json
{
  "slug": "john-doe",
  "displayName": "John Doe",
  "title": "Software Engineer",
  "headline": "Building scalable systems",
  "summaryMarkdown": "Experienced engineer with 10+ years...",
  "locationText": "San Francisco, CA"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "slug": "john-doe",
  "displayName": "John Doe",
  ...
}
```

---

#### Update Profile
```http
PATCH /profiles/{id}
Content-Type: application/json
```

**Request Body (partial):**
```json
{
  "title": "Senior Software Engineer",
  "headline": "Leading distributed systems"
}
```

---

#### Delete Profile
```http
DELETE /profiles/{id}
```

Soft deletes a profile (sets `isActive: false`).

**Response (204):** No content

---

#### Select Masks
```http
POST /profiles/{id}/masks/select
Content-Type: application/json
```

Selects the best masks for a profile based on contexts and tags.

**Request Body:**
```json
{
  "contexts": ["design", "leadership"],
  "tags": ["impact", "innovation"],
  "limit": 5
}
```

**Response:**
```json
{
  "masks": [
    {
      "id": "mask-architect",
      "name": "Architect",
      "ontology": "cognitive-synthesis",
      "relevanceScore": 0.95
    }
  ]
}
```

---

#### Build Narrative
```http
POST /profiles/{id}/narrative
Content-Type: application/json
```

Generates AI-powered narrative blocks for résumé.

**Request Body:**
```json
{
  "contexts": ["technical"],
  "tags": ["backend", "distributed-systems"],
  "timeline": [
    {
      "id": "exp-1",
      "title": "Senior Engineer at Acme",
      "start": "2020-01-01",
      "end": "2023-12-31",
      "tags": ["backend", "microservices"]
    }
  ],
  "settings": {
    "tone": "professional",
    "compression_ratio": 0.7
  }
}
```

**Response:**
```json
{
  "narrative_blocks": [
    {
      "block_id": "nb-1",
      "text": "Led the architecture and implementation of a microservices platform...",
      "weight": 0.9,
      "sources": ["exp-1"],
      "meta": {
        "personality": "analytical",
        "setting": "professional"
      }
    }
  ]
}
```

---

### CV Components

#### Experiences

##### List Experiences
```http
GET /profiles/{profileId}/experiences
```

##### Create Experience
```http
POST /profiles/{profileId}/experiences
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Senior Software Engineer",
  "company": "Acme Inc",
  "location": "San Francisco, CA",
  "startDate": "2020-01-01",
  "endDate": "2023-12-31",
  "isCurrent": false,
  "description": "Led backend team...",
  "achievements": [
    "Reduced latency by 40%",
    "Migrated to microservices"
  ],
  "technologies": ["Node.js", "PostgreSQL", "Docker"],
  "tags": ["backend", "leadership"]
}
```

##### Update/Delete Experience
```http
PATCH /profiles/{profileId}/experiences/{id}
DELETE /profiles/{profileId}/experiences/{id}
```

---

#### Skills

##### List Skills
```http
GET /profiles/{profileId}/skills
```

##### Create Skill
```http
POST /profiles/{profileId}/skills
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "TypeScript",
  "category": "Programming Languages",
  "proficiencyLevel": "expert",
  "yearsOfExperience": 5,
  "tags": ["frontend", "backend"]
}
```

---

#### Projects

##### List Projects
```http
GET /profiles/{profileId}/projects
```

##### Create Project
```http
POST /profiles/{profileId}/projects
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Open Source CLI Tool",
  "description": "A productivity tool for developers",
  "url": "https://github.com/user/project",
  "startDate": "2024-01-01",
  "status": "active",
  "technologies": ["TypeScript", "Node.js"],
  "tags": ["open-source", "cli"]
}
```

---

### Masks & Taxonomy

#### List Masks
```http
GET /masks
```

Returns predefined identity masks from the taxonomy.

**Query Parameters:**
- `ontology` (string, optional): Filter by ontology (cognitive/expressive/operational)

**Response:**
```json
{
  "masks": [
    {
      "id": "analyst",
      "name": "Analyst",
      "ontology": "cognitive-precision",
      "functional_scope": "Precision reasoning and structured analysis",
      "stylistic_parameters": {
        "tone": "formal",
        "rhetorical_mode": "analytical",
        "compression_ratio": 0.6
      }
    }
  ]
}
```

---

#### Get Mask Details
```http
GET /masks/{id}
```

---

#### List Epochs
```http
GET /epochs
```

Returns temporal epoch definitions (e.g., "Formative", "Mature", "Synthesis").

---

#### List Stages
```http
GET /stages
```

Returns career stage definitions (e.g., "Learning", "Contributing", "Leading").

---

### Exports

#### Export JSON-LD
```http
GET /profiles/{id}/export/jsonld
```

Exports profile as semantic web JSON-LD.

**Response:**
```json
{
  "@context": "https://schema.org/",
  "@type": "Person",
  "name": "John Doe",
  "jobTitle": "Software Engineer",
  "worksFor": [...]
}
```

---

#### Export PDF
```http
GET /profiles/{id}/export/pdf
```

Generates a formatted résumé PDF.

**Query Parameters:**
- `maskId` (string, optional): Apply specific mask filter

**Response:** Binary PDF file

---

#### Export Verifiable Credential
```http
GET /profiles/{id}/export/vc
```

Exports W3C Verifiable Credential bundle.

**Response:**
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential"],
  "issuer": "did:example:123",
  "issuanceDate": "2025-01-17T00:00:00Z",
  "credentialSubject": {...}
}
```

---

### Hunter Protocol

The Hunter Protocol provides autonomous job search and application automation.

#### Search Jobs
```http
POST /jobs/search
Content-Type: application/json
```

**Request Body:**
```json
{
  "keywords": ["TypeScript", "Senior Engineer"],
  "location": "Remote",
  "profileId": "uuid"
}
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "job-1",
      "title": "Senior TypeScript Engineer",
      "company": "Tech Corp",
      "location": "Remote",
      "salaryRange": "$150k-$200k",
      "url": "https://example.com/job",
      "postedAt": "2025-01-15T00:00:00Z"
    }
  ]
}
```

---

#### Analyze Skill Gap
```http
POST /jobs/{jobId}/analyze-gap
Content-Type: application/json
```

**Request Body:**
```json
{
  "profileId": "uuid"
}
```

**Response:**
```json
{
  "required": ["TypeScript", "React", "PostgreSQL"],
  "present": ["TypeScript", "React"],
  "missing": ["PostgreSQL"],
  "importance": "medium"
}
```

---

#### Tailor Resume
```http
POST /jobs/{jobId}/tailor-resume
Content-Type: application/json
```

**Request Body:**
```json
{
  "profileId": "uuid"
}
```

**Response:**
```json
{
  "maskId": "architect",
  "maskName": "Architect",
  "highlightedExperiences": ["exp-1", "exp-2"],
  "tailoringSummary": "Emphasized system design experience"
}
```

---

#### Generate Cover Letter
```http
POST /jobs/{jobId}/generate-cover-letter
Content-Type: application/json
```

**Request Body:**
```json
{
  "profileId": "uuid",
  "tone": "professional"
}
```

**Response:**
```json
{
  "text": "Dear Hiring Manager,\n\nI am excited to apply...",
  "wordCount": 350
}
```

---

## GraphQL API

Access the unified GraphQL endpoint at `/graphql`.

### Schema Introspection
```http
GET /graphql/schema
```

### Example Query
```graphql
query GetProfile($id: ID!) {
  profile(id: $id) {
    id
    displayName
    experiences {
      title
      company
      startDate
    }
    masks {
      name
      ontology
    }
  }
}
```

### Subscriptions
```graphql
subscription OnJobFound($profileId: ID!) {
  jobFound(profileId: $profileId) {
    id
    title
    company
  }
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `QUOTA_EXCEEDED` | 429 | Rate limit or quota exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

### Quota-Based Limits (Hunter Protocol)

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| Job Searches | 5/month | Unlimited | Unlimited |
| Resume Tailoring | 0/month | 5/month | Unlimited |
| Cover Letters | 0/month | 3/month | Unlimited |
| Auto-Apply | 0/month | 5/month | Unlimited |

### Rate Limit Headers

Responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1642435200
```

### Exceeding Limits

When quota is exceeded, the API returns:

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly quota exceeded for this feature",
    "details": {
      "feature": "resume_tailoring",
      "limit": 5,
      "used": 5,
      "resetDate": "2025-02-01T00:00:00Z"
    }
  }
}
```

---

## Performance Benchmarks

**API Response Times (p95, local dev):**
- Profile reads: <120ms
- Narrative builds: <300ms
- JSON-LD export: <200ms
- PDF export: <450ms

**Caching:**
- Taxonomy endpoints (masks/epochs/stages) use Redis-backed caching with in-memory fallback
- Cache TTL: 1 hour
- Cache invalidation on taxonomy updates

---

## Additional Resources

- **OpenAPI Specifications**: `/openapi.yaml`, `/openapi-hunter.yaml`
- **Swagger UI**: `/docs`
- **Redoc**: `/redoc`
- **GraphQL Playground**: `/graphql`
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Developer Guide**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **Hunter Protocol Documentation**: [HUNTER-PROTOCOL.md](./features/hunter-protocol/HUNTER-PROTOCOL.md)

---

## Support

- **GitHub Issues**: https://github.com/anthropics/in-midst-my-life/issues
- **API Support**: padavano.anthony@gmail.com
- **Documentation**: https://github.com/anthropics/in-midst-my-life/docs
