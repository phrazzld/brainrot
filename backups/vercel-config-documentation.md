# Vercel Configuration Documentation
## Backup Date: 2025-08-19

## Current Vercel Project Configuration

### Project Identifiers
- **Project ID**: `prj_0HtbgBZ9uUsHRl2v1DQWIHOpGJhs`
- **Organization ID**: `team_nRcB5fO13AUrjGlnpoZ2q3Wz`
- **Project Name**: brainrot-publishing-house (inferred from repo)

### Build Configuration (from vercel.json)
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install --legacy-peer-deps",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_BLOB_BASE_URL": "https://public.blob.vercel-storage.com"
  }
}
```

### Key Configuration Settings
- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run build`
- **Install Command**: `npm install --legacy-peer-deps` (for peer dependency issues)
- **Node Version**: Auto-detected from package.json engines
- **Output Directory**: `.next` (Next.js default)

### Environment Variables (Required for Production)

#### Core Services
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token for content management
- `NEXT_PUBLIC_BLOB_BASE_URL`: https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com

#### Build-time Variables
- `NODE_ENV`: production
- `NEXT_PUBLIC_APP_URL`: (production domain)

#### Optional Services (if configured)
- `OPENAI_API_KEY`: For AI translation features
- `ANTHROPIC_API_KEY`: For Claude translations
- `OPENROUTER_API_KEY`: For multiple LLM access
- `SENTRY_DSN`: Error tracking
- `NEXT_PUBLIC_VERCEL_ANALYTICS_ID`: Analytics tracking

### Migration Requirements for Monorepo

#### New Build Configuration for Monorepo
```json
{
  "buildCommand": "cd ../.. && pnpm build --filter=@brainrot/web",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": ".next",
  "rootDirectory": "apps/web",
  "framework": "nextjs",
  "ignoreCommand": "git diff HEAD^ HEAD --quiet -- apps/web packages"
}
```

#### Monorepo-Specific Settings
1. **Root Directory**: Must be set to `apps/web`
2. **Build Command**: Navigate to monorepo root and use pnpm filter
3. **Install Command**: Navigate to monorepo root for workspace install
4. **Ignore Command**: Only rebuild when web app or packages change

### Deployment Settings

#### Domains
- Development: localhost:3000
- Preview: Auto-generated per PR
- Production: (to be configured)

#### Build & Development Settings
- **Auto-deploy**: Enabled for main branch
- **Preview Deployments**: Enabled for all pull requests
- **Production Branch**: main

#### Security Headers (Recommended)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Vercel Blob Storage Configuration

#### Current Setup
- **Store Name**: (check Vercel dashboard)
- **Region**: us-east-1 (default)
- **Access**: Public read, authenticated write
- **Base URL**: https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com

#### Content Structure
```
books/
├── great-gatsby/
│   └── text/
│       ├── brainrot-introduction.txt
│       ├── brainrot-chapter-1.txt
│       └── ...
├── the-iliad/
│   └── text/
└── [other-books]/
```

### GitHub Integration

#### Repository Connection
- **Connected Repo**: phrazzld/brainrot-publishing-house
- **Branch**: main
- **Auto-deploy**: Enabled

#### Migration Steps
1. Disconnect old repository in Vercel dashboard
2. Connect new monorepo repository
3. Update root directory to `apps/web`
4. Update build commands for monorepo
5. Test with preview deployment

### Performance Settings

#### Caching
- **CDN Cache**: Enabled for static assets
- **Stale-While-Revalidate**: 60 seconds for API routes
- **Static Generation**: Enabled for reading room pages

#### Image Optimization
- **Automatic**: Enabled for Next.js Image component
- **Formats**: WebP, AVIF auto-conversion

### Monitoring & Analytics

#### Vercel Analytics
- **Status**: Optional (not currently configured)
- **Setup**: Add NEXT_PUBLIC_VERCEL_ANALYTICS_ID

#### Speed Insights
- **Status**: Available but not configured
- **Real User Monitoring**: Available with Analytics

### Serverless Functions

#### Configuration
- **Region**: us-east-1 (auto)
- **Max Duration**: 10 seconds (Hobby plan)
- **Memory**: 1024 MB default

#### API Routes
- `/api/translations/*`: Content fetching
- `/api/download/*`: File download endpoints (currently disabled)

### Migration Checklist

- [ ] Create new Vercel project for monorepo
- [ ] Configure root directory as `apps/web`
- [ ] Update build commands for pnpm workspaces
- [ ] Migrate all environment variables
- [ ] Configure custom domain (if applicable)
- [ ] Test preview deployments
- [ ] Update webhook URLs
- [ ] Configure deployment notifications
- [ ] Verify blob storage access
- [ ] Test production deployment

### Important Notes

1. **Legacy Peer Deps**: The `--legacy-peer-deps` flag is used due to React 19 compatibility issues
2. **Blob Storage**: Critical for content delivery - ensure token is properly configured
3. **Build Cache**: Turborepo remote caching can be configured for faster builds
4. **Environment Variables**: Never commit real values, use Vercel dashboard
5. **Monorepo Path**: All paths must be relative to monorepo root

### Support Resources

- Vercel Documentation: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Monorepo Guide: https://vercel.com/docs/monorepos
- Blob Storage: https://vercel.com/docs/storage/vercel-blob

### Recovery Information

If migration fails, the original project can be restored:
- Project ID: prj_0HtbgBZ9uUsHRl2v1DQWIHOpGJhs
- Original Repo: phrazzld/brainrot-publishing-house
- Build Command: npm run build
- Install Command: npm install --legacy-peer-deps