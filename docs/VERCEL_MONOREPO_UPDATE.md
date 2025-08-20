# Vercel Monorepo Deployment Update Guide

## Current Situation
The monorepo has been successfully created and tested locally, but Vercel deployment needs configuration update. Two Vercel projects have been created:
1. `moomooskycow/web` - Original project (ID: prj_bzCtYvX07OIGLWhbmF7zAsGCVr4f)
2. `moomooskycow/brainrot` - New monorepo project (ID: prj_5y6DRxmWInyN0hYcVsVaqGzZK9Xk)

## Manual Configuration Required

### Option 1: Update Existing Web Project (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `web` project
3. Go to Settings → General
4. Update Build & Development Settings:
   - **Root Directory**: Leave empty (monorepo root)
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm build --filter=@brainrot/web`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Development Command**: `pnpm dev --filter=@brainrot/web`

5. Go to Settings → Git
6. Update the Git repository to point to `phrazzld/brainrot` instead of the old repository

### Option 2: Use New Brainrot Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `brainrot` project
3. Go to Settings → General
4. Update Build & Development Settings:
   - **Root Directory**: Leave empty
   - **Framework Preset**: Other
   - **Build Command**: `pnpm build --filter=@brainrot/web`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Development Command**: `pnpm dev --filter=@brainrot/web`

5. Delete the old `web` project after confirming the new one works

## Environment Variables to Add
Both options require these environment variables in Vercel dashboard:

```bash
# Required
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com

# Optional but recommended
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT_URL=https://your-domain.com
```

## Verification Steps
1. After configuration, trigger a manual deployment from Vercel dashboard
2. Check build logs for any errors
3. Visit the deployment URL and verify:
   - Home page loads
   - Reading room loads
   - Great Gatsby text displays correctly

## Troubleshooting

### "No Next.js version detected" Error
- Ensure Root Directory is empty or set to monorepo root
- Build command must use pnpm with filter flag
- Framework Preset should be "Next.js" or "Other"

### Build Failures
- Check that pnpm version matches: `pnpm@8.15.1`
- Verify Node.js version: 20.x or 22.x
- Check build logs for missing environment variables

### Path Issues
- Output directory must be `apps/web/.next`
- Install command must run at monorepo root
- Build command must filter to `@brainrot/web` package

## GitHub Integration
After Vercel is configured:
1. Add these secrets to GitHub repository:
   - `VERCEL_TOKEN`: Get from Vercel account settings
   - `VERCEL_ORG_ID`: team_nRcB5fO13AUrjGlnpoZ2q3Wz
   - `VERCEL_PROJECT_ID`: Use the ID from whichever project you chose

## Success Indicators
✅ Build completes without errors
✅ Deployment URL shows the web app
✅ Great Gatsby loads in reading room
✅ Automatic deployments trigger on git push
✅ Preview deployments work for pull requests