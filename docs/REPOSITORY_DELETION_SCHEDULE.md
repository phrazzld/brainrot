# Repository Deletion Schedule

## ⚠️ SCHEDULED DELETIONS

### Deletion Date: September 20, 2025

**Repositories to Delete:**
1. **brainrot-publishing-house** - https://github.com/phrazzld/brainrot-publishing-house
2. **brainrot-translations** - https://github.com/phrazzld/brainrot-translations

## Migration Status ✅

Both repositories have been successfully migrated to the monorepo with full git history preserved:
- **Migration Date**: August 2025
- **Migration Method**: Git subtree merge
- **History**: Fully preserved in monorepo
- **Current Location**: https://github.com/phrazzld/brainrot

### Content Migration Map
- `brainrot-publishing-house` → `apps/web/`
- `brainrot-translations` → `content/translations/`

## Pre-Deletion Checklist

### ✅ Completed Tasks
- [x] Full git history preserved via subtree merge
- [x] All content migrated to monorepo
- [x] CI/CD workflows recreated in monorepo
- [x] Dependencies and packages consolidated
- [x] Build system operational (Turborepo)
- [x] Tests passing in new location
- [x] Documentation updated
- [x] New repository created and deployed
- [x] Deprecation notices added to old repos

### 🔄 Tasks Before Deletion (by Sep 20, 2025)
- [ ] Verify all GitHub issues are closed or migrated
- [ ] Check for any remaining open PRs
- [ ] Confirm no external services depend on old repos
- [ ] Update any external documentation/links pointing to old repos
- [ ] Final backup of repositories (just in case)
- [ ] Notify any collaborators of impending deletion

## Backup Locations

### Local Backups Created
```bash
# Backup commands run on Aug 21, 2025
~/Development/brainrot-publishing-house/  # Original local copy
~/Development/brainrot-translations/      # Original local copy
```

### Git History Preserved In
```
brainrot/apps/web/           # Full history from brainrot-publishing-house
brainrot/content/translations/ # Full history from brainrot-translations
```

## Deprecation Notices

Both repositories currently display deprecation notices in their README files:
- Links to new monorepo
- Migration completion date
- Scheduled deletion date
- Instructions for finding content in new location

## Deletion Process

### On September 20, 2025:

1. **Final Verification**
   ```bash
   # Verify monorepo has everything
   cd ~/Development/brainrot
   git log --oneline apps/web | head -20  # Check web app history
   git log --oneline content/translations | head -20  # Check translations history
   ```

2. **Archive Repositories First**
   - Go to Settings → General → Danger Zone
   - Click "Archive this repository"
   - Confirm archival

3. **Wait 24 Hours**
   - Give a final grace period after archival
   - Monitor for any issues or concerns

4. **Delete Repositories (Sep 21, 2025)**
   - Go to Settings → General → Danger Zone
   - Click "Delete this repository"
   - Type repository name to confirm
   - Confirm deletion

## Recovery Plan

If content needs to be recovered after deletion:
1. All history exists in the monorepo at `github.com/phrazzld/brainrot`
2. Local backups exist in `~/Development/` directories
3. Git history can be extracted using:
   ```bash
   git log --follow -- apps/web
   git log --follow -- content/translations
   ```

## Contact

**Repository Owner**: @phrazzld
**Migration Completed By**: Claude + @phrazzld
**Questions**: Create issue in monorepo

---

*Document Created: August 21, 2025*
*Deletion Scheduled: September 20, 2025*
*Final Deletion: September 21, 2025*