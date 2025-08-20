# GitHub Actions Secrets Configuration

## Required Secrets for CI/CD Pipeline

This document lists all GitHub Actions secrets that need to be configured for the Brainrot monorepo CI/CD pipeline to function properly.

## 🚨 Critical Secrets (Required for Basic Functionality)

### 1. BLOB_READ_WRITE_TOKEN
- **Purpose**: Access to Vercel Blob storage for content sync
- **Used by**: `sync-content.yml`, `deploy-web.yml`
- **How to get**: 
  1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
  2. Navigate to Storage → Your Blob Store
  3. Go to Settings → Tokens
  4. Create a new Read/Write token
  5. Copy the token (starts with `vercel_blob_`)

### 2. VERCEL_TOKEN
- **Purpose**: Deploy web app to Vercel
- **Used by**: `deploy-web.yml`
- **How to get**:
  1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
  2. Create a new token with full access
  3. Name it "GitHub Actions - Brainrot"
  4. Copy the token

### 3. VERCEL_ORG_ID
- **Purpose**: Identify Vercel organization
- **Used by**: `deploy-web.yml`
- **How to get**:
  1. In your project directory, run: `cat apps/web/.vercel/project.json`
  2. Copy the `orgId` value

### 4. VERCEL_PROJECT_ID
- **Purpose**: Identify Vercel project
- **Used by**: `deploy-web.yml`
- **How to get**:
  1. In your project directory, run: `cat apps/web/.vercel/project.json`
  2. Copy the `projectId` value

## 📚 Publishing Secrets (Required for Book Publishing)

### 5. LULU_API_KEY
- **Purpose**: Authenticate with Lulu publishing API
- **Used by**: `publish-books.yml`
- **How to get**:
  1. Sign up at [Lulu Developer Portal](https://developers.lulu.com)
  2. Create a new application
  3. Copy the API Key

### 6. LULU_API_SECRET
- **Purpose**: Authenticate with Lulu publishing API
- **Used by**: `publish-books.yml`
- **How to get**:
  1. From the same Lulu application
  2. Copy the API Secret

### 7. KDP_EMAIL
- **Purpose**: Amazon KDP login for automated publishing
- **Used by**: `publish-books.yml`
- **How to get**: Your Amazon KDP account email
- **Security**: Consider using a dedicated service account

### 8. KDP_PASSWORD
- **Purpose**: Amazon KDP login for automated publishing
- **Used by**: `publish-books.yml`
- **How to get**: Your Amazon KDP account password
- **Security**: Use a strong, unique password; enable 2FA

## 🤖 AI Services (Optional - For Future Features)

### 9. OPENAI_API_KEY
- **Purpose**: AI-powered translation assistance
- **Used by**: `monitor-usage.yml` (future)
- **How to get**: [OpenAI API Keys](https://platform.openai.com/api-keys)

### 10. ANTHROPIC_API_KEY
- **Purpose**: Claude API for translation assistance
- **Used by**: `monitor-usage.yml` (future)
- **How to get**: [Anthropic Console](https://console.anthropic.com)

## 📢 Notification Secrets (Optional)

### 11. SLACK_WEBHOOK_URL
- **Purpose**: Send deployment notifications to Slack
- **Used by**: `deploy-web.yml`, `publish-books.yml`
- **How to get**: [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)

### 12. DISCORD_WEBHOOK_URL
- **Purpose**: Send deployment notifications to Discord
- **Used by**: `deploy-web.yml`, `publish-books.yml`
- **How to get**: Server Settings → Integrations → Webhooks

## 🚀 Performance Secrets (Optional)

### 13. TURBO_TOKEN
- **Purpose**: Remote caching for Turborepo
- **Used by**: `ci.yml`
- **How to get**: [Vercel Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)

### 14. NEXT_PUBLIC_BLOB_BASE_URL
- **Purpose**: Public URL for blob storage
- **Used by**: `deploy-web.yml`
- **Value**: `https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com`
- **Note**: This isn't really a secret but is configured as one for consistency

## How to Add Secrets to GitHub

### Via GitHub Web Interface (Recommended)
1. Go to https://github.com/phrazzld/brainrot/settings/secrets/actions
2. Click "New repository secret"
3. Enter the secret name exactly as listed above
4. Paste the secret value
5. Click "Add secret"

### Via GitHub CLI
```bash
# Example for adding BLOB_READ_WRITE_TOKEN
gh secret set BLOB_READ_WRITE_TOKEN --repo phrazzld/brainrot

# It will prompt you to enter the value securely
```

### Bulk Addition Script
Create a file `secrets.env` (DO NOT COMMIT):
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx...
VERCEL_TOKEN=xxx...
# ... other secrets
```

Then run:
```bash
# Add all secrets from file
while IFS='=' read -r key value; do
  echo "$value" | gh secret set "$key" --repo phrazzld/brainrot
done < secrets.env

# Delete the file immediately after
rm secrets.env
```

## Priority Order for Configuration

1. **First** (Required for basic operation):
   - BLOB_READ_WRITE_TOKEN
   - VERCEL_TOKEN
   - VERCEL_ORG_ID
   - VERCEL_PROJECT_ID

2. **Second** (For publishing features):
   - LULU_API_KEY
   - LULU_API_SECRET
   - KDP_EMAIL
   - KDP_PASSWORD

3. **Third** (Nice to have):
   - SLACK_WEBHOOK_URL or DISCORD_WEBHOOK_URL
   - TURBO_TOKEN

4. **Future** (Not needed yet):
   - OPENAI_API_KEY
   - ANTHROPIC_API_KEY

## Verification

After adding secrets, verify they're configured:

```bash
# List all secrets (names only, not values)
gh secret list --repo phrazzld/brainrot

# Test workflow with secrets
gh workflow run ci.yml --repo phrazzld/brainrot

# Check workflow status
gh run list --repo phrazzld/brainrot
```

## Security Best Practices

1. **Never** commit secrets to the repository
2. **Rotate** secrets regularly (see docs/SECRETS.md)
3. **Use** dedicated service accounts where possible
4. **Enable** 2FA on all service accounts
5. **Limit** secret access to required workflows only
6. **Monitor** secret usage through GitHub's audit log
7. **Document** but never expose actual secret values

## Troubleshooting

### Secret not available in workflow
- Check the secret name matches exactly (case-sensitive)
- Ensure the workflow has permission to access secrets
- Verify the secret was added to the correct repository

### Workflow fails with authentication error
- Verify the secret value was copied correctly (no extra spaces)
- Check if the token/key has expired
- Ensure the service account has necessary permissions

### Vercel deployment fails
- Verify VERCEL_PROJECT_ID matches your actual project
- Ensure VERCEL_TOKEN has full access permissions
- Check if the project is linked correctly

## Next Steps

1. Add the critical secrets (1-4) first
2. Test the deployment workflow
3. Add publishing secrets if using automated publishing
4. Configure notifications as desired

Remember: These secrets enable the full automation pipeline. Without them, you'll need to perform many operations manually.