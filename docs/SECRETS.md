# Secret Management & Rotation Procedures

## Overview

This document outlines the procedures for managing, rotating, and securing sensitive credentials used in the Brainrot Publishing House monorepo. All team members with access to production systems must follow these procedures.

## Secret Categories

### Critical Secrets (Rotate Monthly)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage access
- `KDP_PASSWORD` - Amazon KDP account access
- `LULU_API_SECRET` - Lulu publishing API

### Important Secrets (Rotate Quarterly)
- `VERCEL_TOKEN` - Deployment automation
- `OPENAI_API_KEY` - AI translation services
- `ANTHROPIC_API_KEY` - AI translation services
- `SENTRY_DSN` - Error tracking

### Low Risk (Rotate Annually)
- `SLACK_WEBHOOK_URL` - Notifications only
- `DISCORD_WEBHOOK_URL` - Notifications only

## Storage Locations

### Local Development
- **File**: `.env.local` (git ignored)
- **Never commit**: Real values to version control
- **Template**: Use `.env.example` as reference

### CI/CD Pipeline
- **Location**: GitHub Actions Secrets
- **Access**: Repository settings → Secrets and variables → Actions
- **Naming**: Use exact variable names from `.env.example`

### Production
- **Location**: Vercel Environment Variables
- **Access**: Vercel Dashboard → Settings → Environment Variables
- **Scopes**: Production, Preview, Development

## Rotation Procedures

### 1. Vercel Blob Token Rotation

```bash
# Step 1: Generate new token
# Go to: https://vercel.com/dashboard/stores
# Click on your blob store → Settings → Create Token

# Step 2: Update in all locations
# - GitHub Secrets: BLOB_READ_WRITE_TOKEN
# - Vercel Env: BLOB_READ_WRITE_TOKEN
# - Local .env.local

# Step 3: Test new token
pnpm sync:blob --dry-run

# Step 4: Revoke old token
# Return to Vercel dashboard and revoke previous token
```

### 2. Lulu API Credentials Rotation

```bash
# Step 1: Generate new credentials
# Go to: https://developers.lulu.com/
# Navigate to: My Apps → Create New App or Regenerate

# Step 2: Update credentials
# - GitHub Secrets: LULU_API_KEY, LULU_API_SECRET
# - Local .env.local

# Step 3: Test with sandbox
cd apps/publisher
pnpm build
node dist/index.js lulu list --mock

# Step 4: Update production when verified
```

### 3. KDP Credentials Rotation

```bash
# Step 1: Change password on Amazon
# Go to: https://kdp.amazon.com/
# Account → Login & Security → Change Password

# Step 2: Update stored credentials
# - GitHub Secrets: KDP_PASSWORD
# - NEVER store in plain text locally
# - Consider using system keychain:
#   macOS: security add-generic-password -a "kdp" -s "brainrot" -w
#   Linux: secret-tool store --label="KDP" service brainrot username kdp

# Step 3: Test authentication
cd apps/publisher
node dist/index.js kdp check --dry-run
```

### 4. Vercel Deployment Token Rotation

```bash
# Step 1: Create new token
# Go to: https://vercel.com/account/tokens
# Create Token → Name: "brainrot-deploy-[date]"

# Step 2: Update GitHub Secrets
# - VERCEL_TOKEN

# Step 3: Test deployment
# Trigger a test deployment from a PR

# Step 4: Revoke old token
# Return to Vercel tokens page and delete old token
```

## Security Best Practices

### Do's
- ✅ Use strong, unique passwords for each service
- ✅ Enable 2FA where available (GitHub, Vercel, Amazon)
- ✅ Rotate credentials immediately if exposed
- ✅ Use environment-specific credentials (dev/staging/prod)
- ✅ Audit access logs regularly
- ✅ Use read-only tokens where possible
- ✅ Store passwords in password managers or keychains

### Don'ts
- ❌ Share credentials via email or chat
- ❌ Commit secrets to version control
- ❌ Use the same password across services
- ❌ Store credentials in plain text files
- ❌ Log sensitive values in console output
- ❌ Use production credentials in development

## Incident Response

### If a Secret is Exposed

1. **Immediate Actions** (Within 5 minutes)
   ```bash
   # Rotate the exposed credential immediately
   # Follow service-specific rotation procedure above
   ```

2. **Notification** (Within 30 minutes)
   - Notify team lead via secure channel
   - Document exposure in incident log
   - Check logs for unauthorized usage

3. **Investigation** (Within 2 hours)
   - Review git history for exposure source
   - Check CI/CD logs
   - Audit recent deployments
   - Review access logs on affected service

4. **Remediation** (Within 24 hours)
   - Update all systems with new credentials
   - Verify no unauthorized access occurred
   - Update procedures to prevent recurrence
   - Consider additional access controls

### Common Exposure Vectors

1. **Git Commits**
   - Use `git log -p | grep -i "token\|secret\|key"` to scan
   - Enable GitHub secret scanning
   - Use pre-commit hooks to prevent secrets

2. **CI/CD Logs**
   - Mask secrets in GitHub Actions: `echo "::add-mask::$SECRET"`
   - Review workflow files for exposed values
   - Audit build logs regularly

3. **Error Messages**
   - Sanitize error outputs
   - Never log full environment variables
   - Use structured logging with filters

## Automation Tools

### Secret Scanning

```bash
# Install and run gitleaks
brew install gitleaks
gitleaks detect --source . -v

# Or use truffleHog
pip install truffleHog
trufflehog git file://./
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing secrets

# Check for common secret patterns
if git diff --cached --name-only | xargs grep -E "(api_key|apikey|secret|token|password|pwd|bearer|private_key)" --exclude=".env.example" --exclude="docs/SECRETS.md"; then
    echo "⚠️  Possible secret detected. Please review your changes."
    exit 1
fi
```

### Environment Validation

```bash
# Script to validate all required env vars are set
# Save as scripts/validate-env.sh

#!/bin/bash
required_vars=(
    "BLOB_READ_WRITE_TOKEN"
    "NEXT_PUBLIC_BLOB_BASE_URL"
)

missing=0
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        missing=$((missing + 1))
    else
        echo "✅ $var is set"
    fi
done

if [ $missing -gt 0 ]; then
    echo "⚠️  $missing required variables are missing"
    exit 1
fi

echo "✅ All required variables are set"
```

## Monitoring & Alerts

### API Usage Monitoring
- Vercel: Dashboard → Usage → API Requests
- Lulu: Developer Console → Analytics
- OpenAI: Usage → Activity
- Monitor for unusual spikes or patterns

### Access Logs
- GitHub: Settings → Security log
- Vercel: Team Settings → Audit Log
- Review weekly for unauthorized access

### Cost Alerts
- Set up billing alerts for all paid services
- Vercel: Settings → Billing → Usage Alerts
- OpenAI: Usage → Limits
- Immediate notification if usage exceeds normal patterns

## Regular Audits

### Weekly
- [ ] Review GitHub Actions run logs
- [ ] Check Vercel deployment logs
- [ ] Monitor API usage dashboards

### Monthly
- [ ] Rotate critical secrets
- [ ] Review access permissions
- [ ] Audit third-party integrations
- [ ] Update this documentation

### Quarterly
- [ ] Rotate important secrets
- [ ] Security training reminder
- [ ] Review and update procedures
- [ ] Test incident response plan

## Contact Information

### Service Support Contacts
- **Vercel Support**: support@vercel.com
- **GitHub Security**: https://github.com/security
- **Lulu Support**: https://developers.lulu.com/support
- **Amazon KDP**: https://kdp.amazon.com/help

### Internal Escalation
1. Team Lead
2. Security Officer
3. CTO/Technical Director

---

Last Updated: 2025-08-19
Next Review: 2025-09-19