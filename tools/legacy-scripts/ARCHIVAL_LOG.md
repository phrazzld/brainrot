# Legacy Module Archival Log

This document tracks deprecated modules that have been archived to the `tools/legacy-scripts` directory.

## Archival Date: 2025-09-01

### Phase 1: Safe Deprecated Modules Archived

#### Web Utilities (`web-utils/`)
- **downloadFromSpaces.js** - Deprecated download service from DigitalOcean Spaces
  - Original location: `apps/web/utils/downloadFromSpaces.js`
  - Status: Throws error on usage, only used in test file
  - Test import updated: `apps/web/__tests__/utils/downloadFromSpaces.test.ts`

#### Cleanup Scripts (`cleanup-scripts/`)
- **removeLegacyTextFiles.ts** - Migration cleanup script
  - Original location: `apps/web/scripts/removeLegacyTextFiles.ts`
  - Status: One-time migration script, no longer needed

#### Deprecated Tests (`deprecated-tests/`)
- **s3SignedUrlGenerator.test.ts.deprecated** - Deprecated S3 service test
  - Original location: `apps/web/__tests__/services/s3SignedUrlGenerator.test.ts.deprecated`
  - Status: Explicitly marked as deprecated

### Configuration Updates

#### Next.js Configuration
- Updated `apps/web/next.config.ts` to exclude legacy modules from bundling
- Added webpack rules to ignore legacy-scripts directory
- Added alias exclusions for various import paths

#### TypeScript Configuration
- Updated `apps/web/tsconfig.json` to exclude `../../tools/legacy-scripts/**/*` from compilation

### Verification

✅ **Build Test**: Next.js build passes successfully  
✅ **Runtime Imports**: No imports from deprecated modules found in app runtime code  
✅ **Tree Shaking**: Legacy modules excluded from production bundle  

### Still Active (Requires Migration)

⚠️ **legacyProxyService.ts** - Still actively used in runtime API code
- Location: `apps/web/app/api/download/fetching/legacyProxyService.ts`
- Usage: Imported by `ProxyService.ts` and exported in `index.ts`
- Action Required: Migrate to modern proxy service before archival

## Directory Structure

```
tools/legacy-scripts/
├── ARCHIVAL_LOG.md                    # This file
├── README.md                          # Original documentation
├── web-utils/
│   └── downloadFromSpaces.js         # Archived web utility
├── cleanup-scripts/
│   └── removeLegacyTextFiles.ts      # Archived cleanup script
├── deprecated-tests/
│   └── s3SignedUrlGenerator.test.ts.deprecated
└── [22 existing migration scripts]
```

## Impact

- **Reduced cognitive load**: Removed deprecated modules from main codebase
- **Improved build performance**: Excluded unused modules from compilation
- **Maintained functionality**: All runtime features preserved
- **Clean separation**: Legacy code isolated in dedicated location

---

*This log documents the archival process for Epic B: De-duplication and Legacy Cleanup, Task B2.*