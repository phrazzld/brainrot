# Vercel Deployment Configuration

## Current Setup ✅

The monorepo is deployed to Vercel using the **brainrot-publishing-house** project, which maintains the custom domain `www.brainrotpublishing.com`.

## Project Details

- **Project Name**: brainrot-publishing-house
- **Project ID**: `prj_0HtbgBZ9uUsHRl2v1DQWIHOpGJhs`
- **Organization ID**: `team_nRcB5fO13AUrjGlnpoZ2q3Wz`
- **Custom Domain**: https://www.brainrotpublishing.com
- **Git Repository**: phrazzld/brainrot (monorepo)

## Build Configuration

### Vercel Dashboard Settings

Navigate to: https://vercel.com/moomooskycow/brainrot-publishing-house/settings/general

**Build & Development Settings:**
- **Root Directory**: Leave empty (monorepo root)
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build --filter=@brainrot/web`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Development Command**: `pnpm dev --filter=@brainrot/web`

**Node.js Version**: 22.x

## Environment Variables

Required environment variables in Vercel dashboard:

```bash
# Blob Storage (Required)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT_URL=https://www.brainrotpublishing.com
```

## GitHub Secrets

Add these secrets to the GitHub repository (phrazzld/brainrot):

```bash
VERCEL_TOKEN=xxx                                    # From Vercel account settings
VERCEL_ORG_ID=team_nRcB5fO13AUrjGlnpoZ2q3Wz       # Organization ID
VERCEL_PROJECT_ID=prj_0HtbgBZ9uUsHRl2v1DQWIHOpGJhs # Project ID
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx              # Same as in Vercel env
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com
```

## Deployment Methods

### Automatic Deployment
- Push to `main` or `master` branch triggers production deployment
- Pull requests create preview deployments

### Manual Deployment via CLI

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel

# With specific environment variables
vercel --prod --build-env KEY=value
```

### Manual Deployment via GitHub Actions

```bash
# Trigger workflow manually
gh workflow run deploy-web.yml
```

## Local Development

### Link to Vercel Project

```bash
# If not already linked
vercel link --project brainrot-publishing-house --yes
```

### Pull Environment Variables

```bash
# Pull production env vars
vercel env pull .env.local

# Pull preview env vars
vercel env pull .env.local --environment=preview
```

## Troubleshooting

### Build Failures

1. **Check pnpm version**: Should be 8.15.1
   ```bash
   pnpm --version
   ```

2. **Verify Node version**: Should be 22.x
   ```bash
   node --version
   ```

3. **Clear build cache** in Vercel dashboard:
   Settings → Functions → Clear Cache

### 404 on Custom Domain

1. Ensure build settings are correct (see above)
2. Check that Git integration points to `phrazzld/brainrot`
3. Verify environment variables are set

### Assets Not Loading

1. Check `NEXT_PUBLIC_BLOB_BASE_URL` is set correctly
2. Verify blob storage token has read/write access
3. Ensure assets are synced: `pnpm sync:blob`

## Monitoring

- **Build Logs**: https://vercel.com/moomooskycow/brainrot-publishing-house
- **Analytics**: Available in Vercel dashboard
- **Functions**: Monitor serverless function usage

## Related Documentation

- [Monorepo Structure](../README.md)
- [Web App README](../apps/web/README.md)
- [Content Pipeline](./ARCHITECTURE.md)