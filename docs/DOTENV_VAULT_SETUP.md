# Dotenv Vault Setup Guide

## Overview

This project uses [dotenv-vault](https://dotenv.org) for secure secret sharing across the team. Instead of manually sharing `.env` files or storing secrets in multiple places, dotenv-vault encrypts your secrets and allows secure distribution.

## Initial Setup (Project Owner)

### 1. Login to Dotenv Vault

```bash
npx dotenv-vault login
```

This opens your browser for authentication. Create a free account if needed.

### 2. Create New Vault

```bash
npx dotenv-vault new
```

This creates a new vault project and generates:
- `.env.vault` - Encrypted secrets file (safe to commit)
- `.env.me` - Your personal vault key (NEVER commit this)

### 3. Push Secrets to Vault

```bash
# Push your local .env.local to the vault
npx dotenv-vault push

# Or push specific environment
npx dotenv-vault push production
```

### 4. Pull Latest Secrets

```bash
# Pull secrets from vault to local .env
npx dotenv-vault pull

# Pull specific environment
npx dotenv-vault pull production
```

## Team Member Setup

### 1. Clone Repository

```bash
git clone git@github.com:[username]/brainrot.git
cd brainrot
pnpm install
```

### 2. Login to Dotenv Vault

```bash
npx dotenv-vault login
```

### 3. Pull Secrets

```bash
# Pull development secrets
npx dotenv-vault pull

# This creates your local .env file with decrypted secrets
```

## Working with Environments

### View All Environments

```bash
npx dotenv-vault open
```

Opens the vault dashboard in your browser.

### Manage Different Environments

```bash
# Development (default)
npx dotenv-vault pull development

# Production
npx dotenv-vault pull production

# Staging
npx dotenv-vault pull staging
```

## Adding New Secrets

### 1. Add to Local .env

```bash
echo "NEW_SECRET=value" >> .env.local
```

### 2. Push to Vault

```bash
npx dotenv-vault push
```

### 3. Notify Team

Let team members know to pull latest secrets:

```bash
npx dotenv-vault pull
```

## CI/CD Integration

### GitHub Actions

Add the `DOTENV_KEY` to GitHub Secrets:

1. Get your CI key:
   ```bash
   npx dotenv-vault keys ci
   ```

2. Add to GitHub:
   - Go to Settings → Secrets → Actions
   - Add `DOTENV_KEY` with the value from step 1

3. In your workflow:
   ```yaml
   - name: Load secrets
     run: npx dotenv-vault@latest load
     env:
       DOTENV_KEY: ${{ secrets.DOTENV_KEY }}
   ```

### Vercel

1. Get production key:
   ```bash
   npx dotenv-vault keys production
   ```

2. Add to Vercel:
   - Go to Project Settings → Environment Variables
   - Add `DOTENV_KEY` with the production key

## Security Best Practices

### DO NOT Commit

- **NEVER** commit `.env.me` - This is your personal access key
- **NEVER** commit `.env` or `.env.local` - Use vault instead
- **NEVER** commit `DOTENV_KEY` values - Use CI/CD secrets

### DO Commit

- **DO** commit `.env.vault` - This is encrypted and safe
- **DO** commit `.env.example` - Template without real values

### Gitignore Setup

Ensure your `.gitignore` includes:

```gitignore
# Dotenv files
.env
.env.local
.env.*.local
.env.me

# Safe to commit
# .env.vault
# .env.example
```

## Troubleshooting

### "Vault not found" Error

```bash
# Ensure you're logged in
npx dotenv-vault login

# Verify vault exists
npx dotenv-vault open
```

### "Unauthorized" Error

```bash
# Re-authenticate
npx dotenv-vault logout
npx dotenv-vault login
```

### Sync Issues

```bash
# Force pull latest
npx dotenv-vault pull --overwrite

# Check vault status
npx dotenv-vault status
```

### Reset Local Vault

```bash
# Remove vault files
rm .env.vault .env.me

# Recreate
npx dotenv-vault new
npx dotenv-vault push
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npx dotenv-vault login` | Authenticate with vault service |
| `npx dotenv-vault new` | Create new vault project |
| `npx dotenv-vault push` | Push local secrets to vault |
| `npx dotenv-vault pull` | Pull secrets from vault |
| `npx dotenv-vault open` | Open vault dashboard |
| `npx dotenv-vault status` | Check vault sync status |
| `npx dotenv-vault keys ci` | Get CI/CD integration key |
| `npx dotenv-vault logout` | Logout from vault |

## Environment Variables Reference

The following secrets are managed in the vault:

### Required
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage access
- `NEXT_PUBLIC_BLOB_BASE_URL` - Blob storage base URL

### Optional (AI Services)
- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Anthropic Claude access
- `OPENROUTER_API_KEY` - OpenRouter API access

### Publishing (Sensitive)
- `LULU_API_KEY` - Lulu publishing API
- `LULU_API_SECRET` - Lulu API secret
- `KDP_EMAIL` - Amazon KDP email
- `KDP_PASSWORD` - Amazon KDP password

## Support

- Documentation: https://dotenv.org/docs
- Issues: Create issue in project repository
- Team Help: Post in #engineering channel