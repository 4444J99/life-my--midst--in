# Deploy Now - Zero Cost Stack

**Estimated time**: 15-30 minutes
**Cost**: $0/month (free tier forever)
**Prerequisites**: GitHub account (you have this!)

---

## Your Free Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              VERCEL (Frontend)                               │
│              Next.js 15 App                                  │
│              ✅ Free: Unlimited bandwidth                    │
│              URL: your-app.vercel.app                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ API Calls
┌─────────────────────▼───────────────────────────────────────┐
│              RAILWAY (Backend)                               │
│              Fastify API + Orchestrator                      │
│              ✅ Free: 500 hrs/month (~21 days always-on)     │
│              URL: your-app.up.railway.app                    │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
┌───────────▼───────────┐   ┌─────────────▼───────────────────┐
│   NEON (PostgreSQL)   │   │   UPSTASH (Redis)                │
│   ✅ Free: 0.5GB      │   │   ✅ Free: 10k commands/day      │
│   Serverless Postgres │   │   Serverless Redis               │
└───────────────────────┘   └──────────────────────────────────┘
```

---

## Step 1: Set Up Databases (5 minutes)

### 1.1 Create Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech)
2. Click **Sign up** → Sign in with GitHub
3. Click **Create Project**
   - Name: `in-midst-my-life`
   - Region: `US East (Ohio)` or closest to you
4. **Copy your connection string** - looks like:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this - you'll need it in Step 3!

### 1.2 Create Upstash Redis

1. Go to [upstash.com](https://upstash.com)
2. Click **Sign up** → Sign in with GitHub
3. Go to **Redis** → **Create Database**
   - Name: `in-midst-my-life`
   - Region: `US-East-1` (or closest to Neon)
   - Type: `Regional`
4. **Copy your connection string** - looks like:
   ```
   rediss://default:xxx@xxx-xxx.upstash.io:6379
   ```
5. Save this too!

---

## Step 2: Deploy Frontend to Vercel (5 minutes)

### Option A: One-Click Deploy (Easiest)

1. Click this button:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/4444J99/life-my--midst--in&root-directory=apps/web)

2. Vercel will ask for environment variables. Add:
   - `NEXT_PUBLIC_API_URL`: Leave empty for now (we'll update after Step 3)

3. Click **Deploy**

4. Your frontend will be live at: `https://your-project.vercel.app`

### Option B: CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from web app directory
cd apps/web
vercel

# Follow prompts, accept defaults
```

---

## Step 3: Deploy Backend to Railway (10 minutes)

### 3.1 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **Login** → Sign in with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Select: `4444J99/life-my--midst--in`
5. Railway will auto-detect the monorepo

### 3.2 Configure API Service

1. Click on the created service
2. Go to **Settings** → **General**
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`

3. Go to **Settings** → **Networking**
   - Click **Generate Domain**
   - Your API URL: `https://xxx.up.railway.app`

4. Go to **Variables** tab → Add these:
   ```
   DATABASE_URL=<your-neon-connection-string>
   POSTGRES_URL=<your-neon-connection-string>
   REDIS_URL=<your-upstash-connection-string>
   NODE_ENV=production
   JWT_SECRET=<generate-a-random-32-char-string>
   PORT=3001
   ```

   To generate JWT_SECRET, run in terminal:
   ```bash
   openssl rand -hex 32
   ```

5. Click **Deploy**

### 3.3 Run Migrations

After deploy succeeds:
1. Go to Railway dashboard
2. Click on your API service
3. Open **Shell** tab
4. Run:
   ```bash
   pnpm migrate
   ```

---

## Step 4: Connect Frontend to Backend (2 minutes)

1. Go back to **Vercel Dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update:
   - `NEXT_PUBLIC_API_URL`: `https://xxx.up.railway.app` (your Railway URL)
5. Go to **Deployments** → Click **Redeploy** on latest

---

## Step 5: Verify Deployment (2 minutes)

### Health Checks

```bash
# Check API
curl https://your-railway-url.up.railway.app/health
# Expected: {"status":"ok"}

# Check Frontend
curl https://your-vercel-url.vercel.app
# Expected: HTML page
```

### Test the Full Flow

1. Open `https://your-vercel-url.vercel.app` in browser
2. Navigate through the UI
3. Check browser console for any errors

---

## Troubleshooting

### Railway Deploy Fails

**Error**: "Build failed"
**Fix**: Check logs, usually missing env vars or build command issue

**Error**: "Out of memory"
**Fix**: Railway free tier has 512MB RAM. The build should work, but if not:
```bash
# Add to Railway environment variables
NODE_OPTIONS=--max-old-space-size=512
```

### Database Connection Fails

**Error**: "Connection refused" or "SSL required"
**Fix**: Ensure your Neon URL ends with `?sslmode=require`

### Redis Connection Fails

**Error**: "ECONNREFUSED"
**Fix**:
- Upstash uses `rediss://` (with double s) not `redis://`
- Check your Upstash connection string is correct

---

## What's Next?

After successful deployment:

1. **Custom Domain** (free on Vercel):
   - Vercel: Settings → Domains → Add your domain

2. **Apply for OSS Credits** (see `docs/OSS-CREDITS-APPLICATIONS.md`):
   - DigitalOcean Hatch: $1,000+ credits
   - GitHub Sponsors: Ongoing support
   - Google Cloud OSS: $3,000+ credits

3. **Set up monitoring** (free tiers):
   - Sentry: Error tracking
   - Axiom: Log aggregation

---

## Quick Links

| Service | Dashboard | Documentation |
|---------|-----------|---------------|
| Vercel | [vercel.com/dashboard](https://vercel.com/dashboard) | [docs.vercel.com](https://vercel.com/docs) |
| Railway | [railway.app/dashboard](https://railway.app/dashboard) | [docs.railway.app](https://docs.railway.app) |
| Neon | [console.neon.tech](https://console.neon.tech) | [neon.tech/docs](https://neon.tech/docs) |
| Upstash | [console.upstash.com](https://console.upstash.com) | [docs.upstash.com](https://docs.upstash.com) |

---

## Free Tier Limits Summary

| Service | Free Tier | Limit |
|---------|-----------|-------|
| **Vercel** | Unlimited | 100GB bandwidth, 100 deployments/day |
| **Railway** | 500 hrs/month | ~21 days continuous, or scale to 0 |
| **Neon** | Forever free | 0.5GB storage, 1 project |
| **Upstash** | Forever free | 10k commands/day, 256MB |

**Total monthly cost: $0** 🎉

---

*Generated by Claude Code on 2026-01-18*
