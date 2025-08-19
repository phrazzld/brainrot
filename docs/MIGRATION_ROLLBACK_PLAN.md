# Migration Rollback Plan
## Brainrot Publishing House Monorepo Migration

**Document Version**: 1.0  
**Created**: 2025-08-19  
**Risk Level**: MEDIUM  
**Recovery Time Objective**: < 2 hours

## Quick Rollback Commands

```bash
# EMERGENCY ROLLBACK (if critical failure)
cd /Users/phaedrus/Development
rm -rf brainrot  # Remove failed monorepo
git clone /Users/phaedrus/Development/backup-web brainrot-publishing-house-restored
git clone /Users/phaedrus/Development/backup-translations brainrot-translations-restored
cd brainrot-publishing-house-restored && npm install
npm run dev  # Verify old app works
```

## Rollback Triggers

### Critical (Immediate Rollback)
- [ ] Data loss detected (missing translations or chapters)
- [ ] Vercel deployment completely broken
- [ ] Git history corrupted or lost
- [ ] Blob storage URLs returning 404 for all content
- [ ] Build system completely non-functional

### Major (Rollback Within 4 Hours)
- [ ] More than 50% of books not loading
- [ ] Publishing pipeline non-functional
- [ ] Performance degradation > 5x
- [ ] Critical security vulnerability introduced

### Minor (Fix Forward)
- [ ] Individual book loading issues
- [ ] Styling inconsistencies
- [ ] Non-critical feature bugs
- [ ] Build warnings (not errors)

## Pre-Migration Checkpoints

### Backups Verified ✅
- [x] Git mirror backup: `/Users/phaedrus/Development/backup-web`
- [x] Git mirror backup: `/Users/phaedrus/Development/backup-translations`
- [x] GitHub issues exported: `backups/brainrot-publishing-house-issues.json`
- [x] Vercel config documented: `backups/vercel-config-documentation.md`
- [x] Environment variables documented: `backups/env-files-inventory.md`

### Current State Snapshot
```bash
# Record current state before migration
echo "=== Pre-Migration State ===" > backups/pre-migration-state.txt
echo "Date: $(date)" >> backups/pre-migration-state.txt
echo "Publishing House Commit: $(cd ../brainrot-publishing-house && git rev-parse HEAD)" >> backups/pre-migration-state.txt
echo "Translations Commit: $(cd ../brainrot-translations && git rev-parse HEAD)" >> backups/pre-migration-state.txt
echo "Vercel Deployment: Working" >> backups/pre-migration-state.txt
```

## Rollback Procedures by Component

### 1. Git Repository Rollback

```bash
# If monorepo git history is corrupted
cd /Users/phaedrus/Development

# Option A: Restore from backups
git clone backup-web brainrot-publishing-house-restored
git clone backup-translations brainrot-translations-restored

# Option B: Reset to pre-migration commit
cd brainrot
git reset --hard [last-known-good-commit]
git clean -fd

# Option C: Start fresh
rm -rf brainrot
mkdir brainrot && cd brainrot
git init
# Re-run migration scripts
```

### 2. Vercel Deployment Rollback

```bash
# Step 1: Revert Vercel to old repository
# In Vercel Dashboard:
# - Disconnect monorepo
# - Reconnect phrazzld/brainrot-publishing-house
# - Reset build settings to original

# Step 2: Trigger deployment from old repo
cd /Users/phaedrus/Development/brainrot-publishing-house-restored
git push origin main --force

# Step 3: Verify deployment
curl -I https://[your-domain].vercel.app
```

### 3. Blob Storage Rollback

```bash
# If blob storage paths are broken
cd /Users/phaedrus/Development/brainrot-publishing-house-restored

# Restore original blob service
git checkout -- utils/getBlobUrl.ts
git checkout -- utils/services/BlobService.ts
git checkout -- utils/services/BlobPathService.ts

# Re-upload content with original paths
npm run sync:blob  # If script exists
```

### 4. Environment Variables Restoration

```bash
# Restore from password manager backup
# Copy saved .env.local content to:
cd /Users/phaedrus/Development/brainrot-publishing-house-restored
vim .env.local  # Paste saved content

# Verify critical variables
grep BLOB_READ_WRITE_TOKEN .env.local
grep NEXT_PUBLIC_BLOB_BASE_URL .env.local
```

## Rollback Verification Checklist

### After Rollback, Verify:

#### Repository Health
- [ ] Git history intact: `git log --oneline | head -20`
- [ ] All branches present: `git branch -a`
- [ ] No uncommitted changes: `git status`

#### Application Functionality
- [ ] Development server starts: `npm run dev`
- [ ] No console errors in browser
- [ ] Great Gatsby loads: `/reading-room/great-gatsby`
- [ ] All 10 books accessible
- [ ] Text content displays correctly

#### Build System
- [ ] Build completes: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Tests pass: `npm run test`
- [ ] Linting passes: `npm run lint`

#### Deployment
- [ ] Vercel deployment succeeds
- [ ] Production URL accessible
- [ ] Blob storage URLs return 200
- [ ] Performance acceptable (< 3s load time)

## Recovery Strategies by Failure Type

### Scenario 1: Partial Migration Failure
```bash
# If migration fails mid-process
cd /Users/phaedrus/Development/brainrot
git status  # Check what's been done
git stash  # Save any work
git reset --hard HEAD  # Reset to last commit
# Re-run failed migration step
```

### Scenario 2: Build System Failure
```bash
# If monorepo build fails
cd /Users/phaedrus/Development/brainrot
rm -rf node_modules pnpm-lock.yaml
pnpm install  # Fresh install
pnpm build --filter=@brainrot/web  # Try targeted build
```

### Scenario 3: Content Loss
```bash
# If translations are missing
cd /Users/phaedrus/Development
cp -r backup-translations/translations/* brainrot/content/translations/
cd brainrot
git add content/translations
git commit -m "Restore missing translations"
```

### Scenario 4: Vercel Connection Issues
```bash
# Manual Vercel CLI deployment
cd /Users/phaedrus/Development/brainrot/apps/web
npx vercel --prod --yes
```

## Communication Plan

### If Rollback Required:

1. **Immediate** (0-15 min)
   - Post in #dev-alerts: "Migration rollback in progress"
   - Set status page to "Maintenance Mode"
   - Disable auto-deployments in Vercel

2. **During Rollback** (15-60 min)
   - Update team every 15 minutes
   - Document issues encountered
   - Keep rollback log for post-mortem

3. **Post-Rollback** (60+ min)
   - Confirm system stability
   - Send all-clear notification
   - Schedule post-mortem meeting
   - Update this document with lessons learned

## Post-Mortem Template

```markdown
## Migration Rollback Post-Mortem

**Date**: [DATE]
**Duration**: [TIME]
**Impact**: [DESCRIPTION]

### What Happened
[Describe the failure]

### Root Cause
[Identify why it failed]

### Resolution
[How it was fixed]

### Lessons Learned
[What to do differently]

### Action Items
- [ ] Update rollback plan
- [ ] Fix root cause
- [ ] Improve testing
```

## Emergency Contacts

- **Vercel Support**: https://vercel.com/support
- **GitHub Support**: https://support.github.com
- **Blob Storage Issues**: Check Vercel status page

## Tools & Resources

### Monitoring
```bash
# Check application health
curl -I https://[your-domain]/api/health
curl https://[blob-url]/books/great-gatsby/text/brainrot-chapter-1.txt | head -100

# Check git integrity
git fsck --full
git reflog

# Check disk space
df -h
du -sh node_modules
```

### Useful Commands
```bash
# Compare directories
diff -r brainrot-publishing-house backup-web

# Find large files
find . -type f -size +10M

# Check for broken symlinks
find . -type l ! -exec test -e {} \; -print

# Verify file integrity
md5sum content/translations/books/*/brainrot/*.md
```

## Final Notes

1. **Always backup before rollback** - Even failed states contain valuable debugging info
2. **Document everything** - Every command run, every error seen
3. **Test incrementally** - Verify each component before proceeding
4. **Communicate frequently** - Over-communication is better than silence
5. **Learn from failures** - Every rollback improves the next migration

---

**Remember**: A successful rollback is better than a broken production system. Don't hesitate to rollback if confidence is low.

**This plan is a living document** - Update it based on actual rollback experiences.