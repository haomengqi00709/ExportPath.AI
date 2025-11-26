# Deployment Guide

This guide walks you through deploying ExportPath AI with the backend on Railway and the frontend on Vercel.

## Overview

- **Backend**: Railway (Express.js API server)
- **Frontend**: Vercel (React + Vite static site)
- **Database**: Railway PostgreSQL (optional, for RAG caching)

---

## Part 1: Deploy Backend to Railway

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub/GitLab/Bitbucket.

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will auto-detect the Node.js app

### Step 3: Configure Backend Service

1. Railway should detect the `backend/` directory automatically
   - If not, set **Root Directory** to `backend` in service settings
2. **Start Command**: `npm start` (already configured in `backend/railway.json`)
3. **Build Command**: Should auto-detect from `package.json`

### Step 4: Set Environment Variables

In Railway project settings → Variables, add:

```
GOOGLE_API_KEY=your_gemini_api_key_here
```

Optional variables:
```
DEMO_SECRET=your_secret_bypass_key
PORT=8080
```

### Step 5: Add Database (Optional - for RAG caching)

1. In Railway project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway will create a database and auto-inject `DATABASE_URL`
3. Add Prisma migration step to your `backend/package.json`:
   ```json
   "scripts": {
     "start": "node server.js",
     "postinstall": "prisma generate",
     "deploy": "prisma migrate deploy && npm start"
   }
   ```
4. Update Railway start command to: `npm run deploy`

### Step 6: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Copy your Railway backend URL (e.g., `https://exportpath-backend-production.up.railway.app`)

### Step 7: Test Backend

Visit `https://your-app.railway.app` - you should see the Express server running.

Test the API:
```bash
curl https://your-app.railway.app/api/suggest \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Update Backend URL

**Option A: Using Environment Variable (Recommended)**

1. You'll set `VITE_BACKEND_URL` in Vercel (Step 4 below)
2. No code changes needed

**Option B: Hardcode the URL**

Edit `services/geminiService.ts` line 7:
```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? "https://your-actual-railway-url.railway.app" // <- Replace this
    : "http://localhost:8080");
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect **Vite** framework

### Step 3: Configure Build Settings

Vercel should auto-detect these from `vercel.json`, but verify:

- **Framework Preset**: Vite
- **Root Directory**: `.` (leave as root, NOT backend)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
VITE_BACKEND_URL=https://your-railway-backend.railway.app
```

Note: You can also add `GEMINI_API_KEY` if you want to use client-side API calls (not recommended for production).

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (usually 1-2 minutes)
3. Vercel will give you a production URL (e.g., `https://exportpath-ai.vercel.app`)

### Step 6: Test Production

1. Visit your Vercel URL
2. Try uploading a product image or entering product details
3. Click "Analyze Route Feasibility"
4. Check browser DevTools → Network tab to confirm requests go to Railway backend

---

## Part 3: Post-Deployment

### Enable Custom Domain (Optional)

**Vercel:**
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `exportpath.ai`)
3. Update DNS records as instructed

**Railway:**
1. Go to Service Settings → Networking
2. Add custom domain for API (e.g., `api.exportpath.ai`)
3. Update `VITE_BACKEND_URL` in Vercel to use custom domain

### Update CORS Settings (If Using Custom Domain)

Edit `backend/server.js`:
```javascript
app.use(cors({
    origin: ['https://your-domain.com', 'https://exportpath-ai.vercel.app'],
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-demo-secret']
}));
```

Redeploy backend on Railway.

### Monitor Logs

**Railway**: Click on deployment → View Logs
**Vercel**: Go to Deployments → Click deployment → View Function Logs

### Set Up Continuous Deployment

Both platforms auto-deploy on git push:
- **Railway**: Deploys on push to main branch
- **Vercel**: Deploys on push to main branch (production) and creates preview for PRs

---

## Troubleshooting

### Frontend can't connect to backend

**Check:**
1. `VITE_BACKEND_URL` is set correctly in Vercel
2. Railway backend is running (check logs)
3. CORS is configured to allow your Vercel domain
4. Railway service has public networking enabled

**Test backend directly:**
```bash
curl https://your-railway-app.railway.app
```

### Rate limit errors

- Add `DEMO_SECRET` to Railway env vars
- Send header `x-demo-secret: your_secret` from frontend for testing
- For production: Increase rate limit in `backend/server.js`

### Database connection errors

If using Prisma/PostgreSQL:
1. Verify `DATABASE_URL` is set in Railway
2. Run migrations: `npx prisma migrate deploy`
3. Check Prisma schema is committed to repo
4. Ensure `prisma generate` runs in build step

### Build fails on Vercel

- Check that dependencies are in `package.json` not `devDependencies`
- Verify `dist` folder is being generated
- Check build logs for TypeScript errors

### "Module not found" errors

- Clear Vercel build cache and redeploy
- Verify imports use correct paths (case-sensitive)
- Check `tsconfig.json` and `vite.config.ts` aliases

---

## Environment Variables Reference

### Frontend (Vercel)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | Yes | Railway backend URL |
| `GEMINI_API_KEY` | No | For local dev only |

### Backend (Railway)
| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini API key |
| `DEMO_SECRET` | No | Bypass rate limiting |
| `DATABASE_URL` | No | PostgreSQL connection (auto-injected by Railway) |
| `PORT` | No | Server port (default: 8080) |

---

## Cost Estimates

**Railway:**
- Free tier: $5 credit/month
- Typical usage: ~$5-20/month depending on traffic
- Database: ~$5/month for PostgreSQL

**Vercel:**
- Hobby (Free): Unlimited bandwidth, 100GB/month
- Pro ($20/month): For commercial use, more bandwidth

**Gemini API:**
- Gemini 2.5 Flash: Free tier available
- Pay-as-you-go after free tier
- With grounding search: Additional costs per query

---

## Next Steps

1. Set up monitoring (Railway Metrics, Vercel Analytics)
2. Configure custom domains
3. Set up database backups (Railway automatic backups)
4. Implement proper authentication if going public
5. Add error tracking (Sentry, LogRocket)
6. Set up CI/CD testing before deployment

---

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Gemini API Docs: https://ai.google.dev/gemini-api/docs
