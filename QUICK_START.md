# 🚀 QUICK START - Next Commands to Run

## You Are Here
- Directory: `~/Development/brainrot/` (the new monorepo)
- Status: Empty monorepo directory with context files
- Next Task: Continue Phase 1.1 from TODO.md

## Immediate Next Commands (in order)

```bash
# 1. Initialize git repository
git init

# 2. Create initial commit with context files
git add .
git commit -m "Initial monorepo setup with context documentation"

# 3. Create package.json
cat > package.json << 'EOF'
{
  "name": "brainrot",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@8.15.1",
  "engines": {
    "node": ">=22.0.0"
  }
}
EOF

# 4. Install pnpm if needed
npm install -g pnpm@8.15.1

# 5. Install Turborepo
pnpm add -D turbo@^2.0.0

# 6. Create pnpm workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
  - 'content/*'
EOF

# 7. Create directory structure
mkdir -p apps packages content scripts .github/workflows

# 8. Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "generated/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
EOF

# 9. Commit the basic setup
git add .
git commit -m "Add Turborepo configuration and workspace setup"
```

## Then: Migrate Web App (Phase 1.3)

```bash
# Add web app as remote
git remote add web-origin ../brainrot-publishing-house

# Fetch web app history
git fetch web-origin

# Merge with subtree (preserves history!)
git merge -s ours --no-commit --allow-unrelated-histories web-origin/master

# Read tree into apps/web
git read-tree --prefix=apps/web/ -u web-origin/master

# Commit the import
git commit -m "Import web app with full git history"

# Update package name
cd apps/web
# Edit package.json to change name to "@brainrot/web"
```

## Then: Migrate Translations (Phase 1.4)

```bash
# Return to monorepo root
cd ~/Development/brainrot

# Add translations as remote
git remote add translations-origin ../brainrot-translations

# Fetch translations history
git fetch translations-origin

# Merge with subtree
git merge -s ours --no-commit --allow-unrelated-histories translations-origin/main

# Read tree into content/translations
git read-tree --prefix=content/translations/ -u translations-origin/main

# Commit the import
git commit -m "Import translations with full git history"
```

## After Basic Setup: Fix Great Gatsby

Once the monorepo structure is in place, the Great Gatsby fix will be part of Phase 4:

1. Create converter package to strip markdown
2. Generate plain text files
3. Upload to blob storage
4. Test in web app

## Environment Setup

Before running the web app, copy over the environment:

```bash
# Copy environment variables
cp ../brainrot-publishing-house/.env.local apps/web/.env.local

# Install dependencies
pnpm install

# Test that everything works
pnpm dev
```

## Verification Checklist

After each phase, verify:
- [ ] Git history is preserved: `git log --oneline --graph`
- [ ] No files were lost: compare file counts
- [ ] Dependencies install: `pnpm install`
- [ ] Build works: `pnpm build`

## If Something Goes Wrong

The original repos are still intact at:
- `~/Development/brainrot-publishing-house/`
- `~/Development/brainrot-translations/`

You can always reference them or start over if needed.

## Current TODO.md Status

From TODO.md, you've completed:
- ✅ Create new directory at `~/Development/brainrot` as monorepo root

Next up:
- ⬜ Initialize git repository with `git init` in monorepo root
- ⬜ Create `package.json` with `"packageManager": "pnpm@8.15.1"` and `"private": true`
- ... (continue with Phase 1.1)

## Pro Tips

1. **Check existing code first**: The web app already has `BlobService` and `BlobPathService` - reuse them!
2. **Test incrementally**: After each major step, verify things still work
3. **Keep notes**: Document any deviations from the plan
4. **The translations are sacred**: Always verify they're safe before any destructive operations

## Questions You Might Have

**Q: Why not fix Great Gatsby immediately?**
A: We could, but it's better to build the proper pipeline that will handle all books.

**Q: What if the subtree merge fails?**
A: The original repos are untouched. You can try again or fall back to copying files.

**Q: How do I know if blob storage is working?**
A: Check the web app at localhost:3000 - try loading The Iliad (it works), then Great Gatsby (it doesn't).

**Q: What's the rush with Great Gatsby?**
A: It's the newest translation and users are trying to read it but getting errors.

## Ready?

Start with command #1 above: `git init`

The user is expecting you to continue the migration. They understand the context and the plan. You're picking up where the previous session left off.

Good luck! 🚀