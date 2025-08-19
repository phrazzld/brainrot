# Vercel Deployment Configuration Guide

## Prerequisites
- Vercel account with access to create new projects
- GitHub repository created for the monorepo (brainrot)
- Environment variables from `.env.local` ready

## Step-by-Step Configuration

### 1. Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import Git Repository:
   - Select GitHub provider
   - Search for "brainrot" repository
   - Click "Import"

### 2. Configure Build & Development Settings

In the "Configure Project" screen:

#### Framework Preset
- **Framework Preset**: Next.js (should auto-detect)

#### Root Directory
- **Root Directory**: `apps/web`
- Click "Edit" next to Root Directory
- Enter: `apps/web`

#### Build and Output Settings
- **Build Command**: 
  ```bash
  cd ../.. && pnpm install --frozen-lockfile && pnpm build --filter=@brainrot/web
  ```
- **Output Directory**: `.next` (default)
- **Install Command**: Override with:
  ```bash
  pnpm install --frozen-lockfile
  ```

#### Development Command
- Leave as default: `next dev`

### 3. Configure Environment Variables

Add the following environment variables in the "Environment Variables" section:

```bash
# Required - Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx...
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com

# Optional - AI Services (if using)
OPENAI_API_KEY=sk-xxx...
ANTHROPIC_API_KEY=sk-ant-xxx...
OPENROUTER_API_KEY=sk-or-xxx...

# Optional - Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=xxx...
```

**Important**: 
- For `BLOB_READ_WRITE_TOKEN`, you need to:
  1. Go to Storage tab in Vercel dashboard
  2. Create or select your blob store
  3. Go to Settings → Tokens
  4. Create a new Read/Write token
  5. Copy and paste it here

### 4. Configure Ignored Build Step

1. After project creation, go to Settings → Git
2. Find "Ignored Build Step" section
3. Add custom command:
   ```bash
   git diff HEAD^ HEAD --quiet -- apps/web packages
   ```
   This prevents builds when only content changes (not web app changes)

### 5. Configure Monorepo Settings

1. Go to Settings → General
2. Ensure these are set:
   - **Node.js Version**: 20.x (or 22.x)
   - **Package Manager**: pnpm
   - **pnpm Version**: 8.x or 9.x

### 6. Enable Preview Deployments

1. Go to Settings → Git
2. Under "Preview Deployments":
   - Enable for all branches
   - Or configure specific branch patterns

### 7. Configure Custom Domains (Optional)

1. Go to Settings → Domains
2. Add your custom domain(s):
   - Example: `brainrot.app`
   - Example: `www.brainrot.app`
3. Follow DNS configuration instructions

### 8. Set Up Build Cache

1. Go to Settings → Environment Variables
2. Add Turborepo remote cache token (if using):
   ```
   TURBO_TOKEN=xxx...
   TURBO_TEAM=your-team-name
   ```

### 9. Configure Deployment Protection (Optional)

1. Go to Settings → Deployment Protection
2. Enable password protection for preview deployments
3. Set up allowed email domains if needed

### 10. Test Deployment

1. Trigger a manual deployment:
   - Go to Deployments tab
   - Click "Redeploy" on latest commit
   - Or push a small change to trigger automatic deployment

2. Monitor build logs for any errors
3. Check deployment URL when complete

## Verification Checklist

- [ ] Project imported from GitHub successfully
- [ ] Root directory set to `apps/web`
- [ ] Build command includes pnpm workspace filter
- [ ] Environment variables added (especially BLOB_READ_WRITE_TOKEN)
- [ ] Node.js version set to 20.x or higher
- [ ] Package manager set to pnpm
- [ ] Build completes successfully
- [ ] Web app loads at deployment URL
- [ ] Great Gatsby content loads in reading room

## Common Issues & Solutions

### Build Fails with "Module not found"
- Ensure build command includes `cd ../..` to go to monorepo root
- Check that `pnpm install --frozen-lockfile` runs before build

### Environment Variables Not Working
- Verify variables are added to correct environment (Production/Preview/Development)
- Check for typos in variable names
- Ensure NEXT_PUBLIC_ prefix for client-side variables

### Deployment Takes Too Long
- Enable Turborepo remote caching with TURBO_TOKEN
- Check if ignored build step is configured correctly

### Content Not Loading
- Verify BLOB_READ_WRITE_TOKEN is correct
- Check NEXT_PUBLIC_BLOB_BASE_URL matches your blob storage URL
- Ensure blob storage has the content uploaded

## Deployment Notifications Setup

### Slack Integration
1. Go to Settings → Integrations
2. Add Slack integration
3. Configure channels for deployment notifications

### Discord Webhook
1. Create webhook in Discord server
2. Add to Settings → Environment Variables:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx...
   ```
3. Configure in deployment scripts if needed

## CLI Deployment (Alternative)

If you prefer CLI deployment:

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Deploy from monorepo root
cd ~/Development/brainrot
vercel --cwd apps/web

# Follow prompts to:
# - Link to existing project or create new
# - Configure settings
# - Deploy
```

## Next Steps

After successful deployment:
1. Note the production URL
2. Update GitHub repository with deployment badge
3. Configure GitHub Actions to use Vercel tokens
4. Set up monitoring and analytics
5. Enable automatic deployments from main branch

## Support Resources

- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Turborepo with Vercel](https://turbo.build/repo/docs/ci/vercel)
- [Environment Variables](https://vercel.com/docs/environment-variables)