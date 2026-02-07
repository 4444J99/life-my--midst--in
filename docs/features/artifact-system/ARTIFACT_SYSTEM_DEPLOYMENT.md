# Artifact System Deployment Guide

**Version**: 1.0  
**Last Updated**: January 16, 2026  
**Audience**: DevOps Engineers, System Administrators

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Docker Compose Deployment](#docker-compose-deployment)
7. [OAuth Provider Setup](#oauth-provider-setup)
8. [Service Startup](#service-startup)
9. [Verification](#verification)
10. [Production Considerations](#production-considerations)

---

## System Overview

The **Artifact System** is a cloud storage ingestion and curation platform that automatically discovers creative and academic work (papers, images, presentations, code) from connected cloud storage providers (Google Drive, Dropbox, iCloud, local filesystems). It classifies artifacts using LLM-powered analysis and heuristics, then presents them to users for approval and metadata editing.

### Key Components

- **Orchestrator Service** (`apps/orchestrator`) - Background workers for file discovery and classification
- **API Service** (`apps/api`) - REST API for artifact CRUD, OAuth flows, and integrations
- **Web UI** (`apps/web`) - React/Next.js interface for artifact review and approval
- **PostgreSQL Database** - Stores artifacts, integrations, sync state
- **Redis** - Task queue for background jobs

### Workstreams Implemented

- ✅ **Workstream A**: Backend Intelligence (LLM classification, integrity proofs)
- ✅ **Workstream B**: API Layer (OAuth routes, artifact CRUD)
- ✅ **Workstream C**: Backend Orchestration (CatcherAgent, file processing)
- ✅ **Workstream D**: Frontend UI (pending artifacts dashboard, settings)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│                 (apps/web - Next.js)                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/REST
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Service                               │
│              (apps/api - Fastify)                           │
│  • Authentication                                           │
│  • Artifact CRUD endpoints                                  │
│  • OAuth flow handlers (Google Drive, Dropbox)             │
│  • Integration management                                   │
└────┬────────────────────────────────────────────┬───────────┘
     │                                            │
     │ PostgreSQL                                 │ Task Queue
     ▼                                            ▼
┌─────────────────┐                     ┌─────────────────────┐
│   PostgreSQL    │                     │      Redis          │
│                 │                     │                     │
│  • artifacts    │◄────────────────────┤  • Task Queue       │
│  • integrations │                     │  • Job Scheduler    │
│  • sync_state   │                     │                     │
│  • profiles     │                     └──────────┬──────────┘
└─────────────────┘                                │
                                                   │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │  Orchestrator Service    │
                                    │ (apps/orchestrator)      │
                                    │                          │
                                    │  • CatcherAgent          │
                                    │  • Classification        │
                                    │  • File Processors       │
                                    │  • Task Scheduler        │
                                    └─────────┬────────────────┘
                                              │
                                              │ Cloud APIs
                                              ▼
                        ┌──────────────────────────────────────┐
                        │   Cloud Storage Providers            │
                        │                                      │
                        │  • Google Drive API                  │
                        │  • Dropbox API                       │
                        │  • iCloud (via local mount)          │
                        │  • Local Filesystem                  │
                        └──────────────────────────────────────┘
```

### Data Flow: Artifact Discovery

```
1. User connects Google Drive → OAuth flow → tokens stored encrypted
2. Orchestrator CatcherAgent scheduled (daily/weekly)
3. CatcherAgent lists files from Google Drive API
4. Downloads files to /tmp, extracts metadata (PDF text, EXIF)
5. Classifies artifacts using heuristics + LLM
6. Creates artifact records with status="pending"
7. User reviews in Web UI → approve/reject/edit metadata
8. Approved artifacts linked to CV entities (Projects, Publications)
```

---

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 22.04+ recommended), macOS 12+, or Windows with WSL2
- **Node.js**: v18.0.0 or higher (LTS recommended)
- **pnpm**: v8.0.0 or higher (`npm install -g pnpm`)
- **PostgreSQL**: v14.0 or higher
- **Redis**: v7.0 or higher
- **Docker** (optional): v20.10+ with Docker Compose v2.0+
- **Disk Space**: 10GB minimum (20GB+ recommended for artifact storage)
- **Memory**: 4GB minimum (8GB+ recommended)

### Development Tools

```bash
# Verify Node.js version
node --version
# v18.17.0 or higher

# Install pnpm
npm install -g pnpm

# Verify pnpm
pnpm --version
# 8.15.0 or higher

# Verify PostgreSQL
psql --version
# psql (PostgreSQL) 14.10

# Verify Redis
redis-cli --version
# redis-cli 7.2.3
```

### Cloud Provider Accounts

- **Google Drive**: Google Cloud Console project with Drive API enabled
- **Dropbox**: Dropbox App with offline access scope
- **iCloud** (macOS only): iCloud account with Drive enabled

---

## Environment Configuration

### Required Environment Variables

Create `.env` files in the repository root and each app directory:

#### Root `.env`
```bash
# Database URLs
DATABASE_URL=postgresql://postgres:password@localhost:5432/in_midst_my_life
REDIS_URL=redis://localhost:6379

# API Service
API_URL=http://localhost:3001
API_PORT=3001

# Orchestrator Service
ORCH_URL=http://localhost:3002
ORCH_PORT=3002

# Web UI
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_ORCH_BASE_URL=http://localhost:3002
```

#### `apps/api/.env`
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/in_midst_my_life
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Google Drive OAuth
GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3001/integrations/cloud-storage/callback

# Dropbox OAuth
DROPBOX_APP_KEY=your-app-key
DROPBOX_APP_SECRET=your-app-secret
DROPBOX_REDIRECT_URI=http://localhost:3001/integrations/cloud-storage/callback

# iCloud (macOS only)
ICLOUD_DRIVE_PATH=/Users/yourusername/Library/Mobile Documents/com~apple~CloudDocs

# Security
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-aes-256-key-32-bytes

# Artifact Storage
ARTIFACT_TEMP_DIR=/tmp/midst-artifacts
ARTIFACT_MAX_FILE_SIZE=104857600  # 100MB in bytes
```

#### `apps/orchestrator/.env`
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/in_midst_my_life
REDIS_URL=redis://localhost:6379

# Server
PORT=3002
HOST=0.0.0.0
NODE_ENV=development

# Orchestrator Configuration
ORCH_WORKER_ENABLED=true
ORCH_SCHEDULER_ENABLED=true
ORCH_POLL_INTERVAL_MS=5000
ORCH_MAX_RETRIES=3
ORCH_BACKOFF_MS=1000

# Agent Configuration
ORCH_AGENT_EXECUTOR=local  # or "openai", "anthropic"
LOCAL_LLM_URL=http://localhost:11434  # Ollama endpoint

# Artifact Sync
ORCH_ARTIFACT_SYNC_INTERVAL_MS=86400000  # 24 hours
ORCH_ARTIFACT_BATCH_SIZE=100
ORCH_ARTIFACT_MAX_FILE_SIZE=104857600  # 100MB

# Cloud Provider Credentials (same as API)
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
DROPBOX_APP_KEY=your-app-key
DROPBOX_APP_SECRET=your-app-secret
```

#### `apps/web/.env.local`
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_ORCH_BASE_URL=http://localhost:3002
NEXT_PUBLIC_GRAPH_LAYOUT=radial
```

### Environment Variable Security

⚠️ **CRITICAL**: Never commit `.env` files to version control!

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

**Production**: Use secret management (AWS Secrets Manager, HashiCorp Vault, 1Password, etc.)

---

## Database Setup

### PostgreSQL Installation

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew)**:
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Docker**:
```bash
docker run --name midst-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=in_midst_my_life \
  -p 5432:5432 \
  -v midst-postgres-data:/var/lib/postgresql/data \
  -d postgres:14
```

### Database Creation

```bash
# Create database
createdb in_midst_my_life

# Or via psql
psql -U postgres
CREATE DATABASE in_midst_my_life;
\q
```

### Run Migrations

The artifact system requires migrations for both API and Orchestrator services:

```bash
# API migrations (profiles, artifacts, integrations)
cd /path/to/repository
pnpm install
pnpm --filter @in-midst-my-life/api migrate

# Orchestrator migrations (tasks, runs, sync_state)
pnpm --filter @in-midst-my-life/orchestrator migrate
```

**Migration Files**:
- `apps/api/migrations/` - Artifact tables
- `apps/orchestrator/migrations/` - Task queue tables

### Seed Data (Optional)

```bash
# API seed data (sample profiles, masks)
pnpm --filter @in-midst-my-life/api seed

# Orchestrator seed data (task types, agent configs)
pnpm --filter @in-midst-my-life/orchestrator seed
```

### Verify Database Schema

```sql
-- Connect to database
psql -U postgres -d in_midst_my_life

-- List tables
\dt

-- Should see:
-- artifacts
-- cloud_storage_integrations
-- artifact_sync_state
-- profiles
-- tasks
-- runs
-- ... (other tables)

-- Check artifact table schema
\d artifacts

-- Sample query
SELECT COUNT(*) FROM artifacts;
```

---

## Docker Compose Deployment

### Docker Compose Configuration

Create `docker-compose.artifact-system.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: midst-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: in_midst_my_life
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: midst-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: midst-api
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/in_midst_my_life
      - REDIS_URL=redis://redis:6379
      - PORT=3001
      - NODE_ENV=production
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - apps/api/.env
    volumes:
      - artifact-temp:/tmp/midst-artifacts

  orchestrator:
    build:
      context: .
      dockerfile: apps/orchestrator/Dockerfile
    container_name: midst-orchestrator
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/in_midst_my_life
      - REDIS_URL=redis://redis:6379
      - PORT=3002
      - NODE_ENV=production
      - ORCH_WORKER_ENABLED=true
      - ORCH_SCHEDULER_ENABLED=true
    ports:
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - apps/orchestrator/.env
    volumes:
      - artifact-temp:/tmp/midst-artifacts

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: midst-web
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
      - NEXT_PUBLIC_ORCH_BASE_URL=http://localhost:3002
    ports:
      - "3000:3000"
    depends_on:
      - api
      - orchestrator

volumes:
  postgres-data:
  redis-data:
  artifact-temp:
```

### Start Services

```bash
# Start all services
docker-compose -f docker-compose.artifact-system.yml up -d

# View logs
docker-compose -f docker-compose.artifact-system.yml logs -f

# Stop services
docker-compose -f docker-compose.artifact-system.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.artifact-system.yml down -v
```

---

## OAuth Provider Setup

### Google Drive Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project: "in-midst-artifact-system"
   - Note the Project ID

2. **Enable Google Drive API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Artifact System"
   - Authorized redirect URIs:
     - `http://localhost:3001/integrations/cloud-storage/callback` (dev)
     - `https://yourdomain.com/integrations/cloud-storage/callback` (prod)
   - Click "Create"
   - Save **Client ID** and **Client Secret**

4. **Configure OAuth Consent Screen**
   - User type: "External" (for testing) or "Internal" (for org only)
   - App name: "In-Midst Artifact System"
   - Scopes: Add `https://www.googleapis.com/auth/drive.readonly`
   - Test users: Add your email for development

5. **Add to Environment Variables**
   ```bash
   GOOGLE_DRIVE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-abc123xyz
   GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3001/integrations/cloud-storage/callback
   ```

### Dropbox Setup

1. **Create Dropbox App**
   - Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
   - Click "Create app"
   - API: "Scoped access"
   - Access type: "Full Dropbox" (or "App folder" for limited access)
   - Name: "in-midst-artifact-system"
   - Click "Create app"

2. **Configure App**
   - **Permissions** tab:
     - ✅ `files.metadata.read`
     - ✅ `files.content.read`
     - ✅ `account_info.read`
   - **Settings** tab:
     - Redirect URIs:
       - `http://localhost:3001/integrations/cloud-storage/callback` (dev)
       - `https://yourdomain.com/integrations/cloud-storage/callback` (prod)
     - Note **App key** and **App secret**

3. **Enable OAuth 2.0 with PKCE** (optional, for enhanced security)
   - Settings → OAuth 2.0
   - Enable "Allow implicit grant"

4. **Add to Environment Variables**
   ```bash
   DROPBOX_APP_KEY=abc123xyz
   DROPBOX_APP_SECRET=abc123xyz789
   DROPBOX_REDIRECT_URI=http://localhost:3001/integrations/cloud-storage/callback
   ```

### iCloud Setup (macOS Only)

iCloud integration uses the local filesystem mount point (no OAuth required):

```bash
# Find iCloud Drive path
ls ~/Library/Mobile\ Documents/com~apple~CloudDocs

# Add to environment variables
ICLOUD_DRIVE_PATH=/Users/yourusername/Library/Mobile Documents/com~apple~CloudDocs
```

**Note**: User must be signed into iCloud on macOS with iCloud Drive enabled.

---

## Service Startup

### Development Mode (Local)

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis (if not using Docker)
# ... (see Database Setup section)

# Terminal 1: Start API
pnpm --filter @in-midst-my-life/api dev

# Terminal 2: Start Orchestrator
pnpm --filter @in-midst-my-life/orchestrator dev

# Terminal 3: Start Web UI
pnpm --filter @in-midst-my-life/web dev

# Access:
# - Web UI: http://localhost:3000
# - API: http://localhost:3001
# - Orchestrator: http://localhost:3002
```

### Production Mode (PM2)

```bash
# Build all services
pnpm build

# Install PM2
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'midst-api',
      script: 'apps/api/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'midst-orchestrator',
      script: 'apps/orchestrator/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'midst-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: 'apps/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF

# Start services
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Monitor
pm2 monit

# Save configuration
pm2 save
pm2 startup
```

---

## Verification

### Health Checks

```bash
# API health
curl http://localhost:3001/health
# Expected: {"ok": true, "status": "healthy"}

# Orchestrator health
curl http://localhost:3002/health
# Expected: {"ok": true, "status": "healthy"}

# Web UI
open http://localhost:3000
```

### Database Verification

```sql
-- Connect to database
psql -U postgres -d in_midst_my_life

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check migrations ran
SELECT * FROM _migrations ORDER BY executed_at DESC LIMIT 5;
```

### Test OAuth Flow

1. Navigate to http://localhost:3000/settings/integrations
2. Click "Connect Google Drive"
3. Complete OAuth consent
4. Verify integration appears in list

### Test Artifact Sync

```bash
# Trigger manual sync via API
curl -X POST http://localhost:3001/profiles/{profileId}/integrations/{integrationId}/sync

# Check orchestrator logs
pm2 logs midst-orchestrator

# Verify artifacts created
curl http://localhost:3001/profiles/{profileId}/artifacts
```

---

## Production Considerations

### Security

1. **HTTPS/TLS**: Use SSL certificates (Let's Encrypt, Cloudflare)
2. **Environment Variables**: Use secret management (AWS Secrets Manager, etc.)
3. **Database Encryption**: Enable PostgreSQL SSL
4. **OAuth Secrets**: Rotate regularly
5. **JWT Tokens**: Use strong secrets (32+ chars)
6. **Rate Limiting**: Implement on API endpoints
7. **CORS**: Configure allowed origins in production

### Scalability

1. **Horizontal Scaling**: Run multiple orchestrator workers
2. **Database Connection Pooling**: Configure `pgBouncer`
3. **Redis Clustering**: For high-volume task queues
4. **CDN**: Serve static assets via Cloudflare/CloudFront
5. **Load Balancing**: Use Nginx/HAProxy for multiple API instances

### Monitoring

1. **Logging**: Use structured logging (Pino, Winston)
2. **Metrics**: Prometheus + Grafana
3. **Alerts**: Set up alerts for:
   - High error rates
   - Token expiry
   - Sync failures
   - Disk space (artifact storage)
4. **APM**: Application Performance Monitoring (New Relic, Datadog)

### Backup & Recovery

```bash
# Database backup
pg_dump -U postgres in_midst_my_life > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres in_midst_my_life < backup_20260116.sql

# Artifact files backup (if storing locally)
tar -czf artifacts_backup_$(date +%Y%m%d).tar.gz /path/to/artifact/storage
```

### Performance Tuning

```bash
# PostgreSQL tuning (postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 100

# Redis tuning (redis.conf)
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

## Troubleshooting

See [ARTIFACT_SYSTEM_OPERATIONS.md](./ARTIFACT_SYSTEM_OPERATIONS.md) for detailed troubleshooting guides.

**Common Issues**:
- OAuth tokens expired → Re-authenticate in UI
- Files not syncing → Check orchestrator logs, verify API credentials
- Database connection errors → Verify `DATABASE_URL`, check PostgreSQL status
- Out of disk space → Clean up `/tmp/midst-artifacts`, increase storage

---

## Next Steps

- [Operations Guide](./ARTIFACT_SYSTEM_OPERATIONS.md) - Monitoring, troubleshooting, maintenance
- [API Guide](./ARTIFACT_SYSTEM_API_GUIDE.md) - API reference and examples
- [User Guide](./ARTIFACT_SYSTEM_USER_GUIDE.md) - End-user documentation

---

**Document Version**: 1.0  
**Last Updated**: January 16, 2026  
**Feedback**: Submit issues to repository issue tracker
