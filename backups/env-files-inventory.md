# Environment Files Inventory
## Created: 2025-08-19 13:11

## ⚠️ ACTION REQUIRED: Manual Password Manager Save

This document lists all `.env` files found across the Brainrot repositories.
**You must manually save these files to your secure password manager.**

## Environment Files Located

### 1. Brainrot Publishing House (Original Web App)
```
/Users/phaedrus/Development/brainrot-publishing-house/.env.local
/Users/phaedrus/Development/brainrot-publishing-house/.env.production
```

### 2. Brainrot Translations Repository
```
/Users/phaedrus/Development/brainrot-translations/.env
```

### 3. Brainrot Monorepo (Current)
```
/Users/phaedrus/Development/brainrot/.env.local
```

### 4. Example/Template Files (For Reference)
```
/Users/phaedrus/Development/brainrot-publishing-house/.env.local.example
/Users/phaedrus/Development/brainrot/.env.example
/Users/phaedrus/Development/brainrot/apps/web/.env.local.example
```

## Manual Save Instructions

### For 1Password:
1. Create a new "Secure Note" titled "Brainrot Environment Variables Backup"
2. Add each .env file as a separate section
3. Copy the full contents of each file
4. Tag with "brainrot", "backup", "migration"
5. Add backup date: 2025-08-19

### For Bitwarden:
1. Create a new "Secure Note" 
2. Name: "Brainrot Env Files - Migration Backup"
3. Paste all file contents with clear headers
4. Add custom field for each file path
5. Set folder to "Development/Backups"

### For LastPass:
1. Add new "Secure Note"
2. Name: "Brainrot Environment Backup 2025-08-19"
3. Include all file paths and contents
4. Add tags: development, brainrot, backup

## Files to Save (Run these commands):

```bash
# View and save each file manually:
cat /Users/phaedrus/Development/brainrot-publishing-house/.env.local
cat /Users/phaedrus/Development/brainrot-publishing-house/.env.production
cat /Users/phaedrus/Development/brainrot-translations/.env
cat /Users/phaedrus/Development/brainrot/.env.local
```

## Critical Variables to Verify Saved:

- [ ] BLOB_READ_WRITE_TOKEN
- [ ] NEXT_PUBLIC_BLOB_BASE_URL
- [ ] VERCEL_TOKEN (if exists)
- [ ] LULU_API_KEY (if exists)
- [ ] LULU_API_SECRET (if exists)
- [ ] KDP_EMAIL (if exists)
- [ ] KDP_PASSWORD (if exists)
- [ ] Any API keys (OpenAI, Anthropic, etc.)

## Post-Migration Cleanup:

After confirming migration success and variables are saved:
1. Delete .env files from old repositories
2. Rotate any exposed tokens
3. Update password manager with new monorepo paths

## Security Notes:

- Never commit .env files to git
- Rotate tokens after migration
- Use different tokens for dev/staging/production
- Enable 2FA on all service accounts
- Review access logs after migration

## Recovery Plan:

If variables are needed during migration:
1. Check password manager backup
2. Refer to .env.example files for structure
3. Regenerate tokens if necessary
4. Update Vercel dashboard with new values

---

**IMPORTANT**: This file does not contain actual secret values.
You must manually copy the .env file contents to your password manager.
This is a reference document only.