# Legacy Migration Scripts Archive

This directory contains archived migration, audit, verification, and standardization scripts that were used during the Brainrot Publishing House monorepo migration. These scripts are preserved for historical reference but are no longer actively maintained or used.

## Archived Scripts

### Audit Scripts
Scripts used to audit and inventory assets across the system:

- **`auditAudioAssets.ts`** - Audited audio files in blob storage, checking for missing files, format issues, and metadata
- **`auditImageAssets.ts`** - Audited cover images and chapter illustrations for proper naming and formats
- **`auditTextAssets.ts`** - Audited text files for encoding issues, missing content, and proper structure
- **`inventory-assets.ts`** - Created comprehensive inventory of all assets with locations and metadata

### Verification Scripts
Scripts used to verify migration completeness and asset availability:

- **`verifyAudioFilesAccess.ts`** - Verified accessibility of audio files from blob storage
- **`verifyAudioMigration.ts`** - Verified audio file migration from old to new storage
- **`verifyAudioMigrationWithContent.ts`** - Deep verification including audio content integrity checks
- **`verifyAudioUrls.ts`** - Verified that all audio URLs resolve correctly
- **`verifyBlobStorage.ts`** - Comprehensive verification of blob storage assets
- **`verifyCdnUrls.ts`** - Verified CDN URL accessibility and performance
- **`verifyTextMigration.ts`** - Verified text file migration completeness
- **`verify-blob-audio-paths.ts`** - Verified blob storage audio path structure
- **`verify-end-to-end-downloads.ts`** - End-to-end download testing for all asset types
- **`verify-standardized-urls.ts`** - Verified URL standardization across the system

### Standardization Scripts
Scripts used to standardize file formats and paths:

- **`standardizeTextFiles.ts`** - Standardized text file formats and encoding
- **`standardizeTextFilesBlob.ts`** - Standardized text files directly in blob storage
- **`standardizeTextFilesBlobWithCopy.ts`** - Created standardized copies while preserving originals

### Reorganization Scripts
Scripts used to reorganize assets and file structures:

- **`reorganize-blob-paths.ts`** - Reorganized blob storage path structure for consistency
- **`generateReorganizationPlan.ts`** - Generated detailed plans for asset reorganization

### Cleanup Scripts
Scripts used to clean up redundant or temporary files:

- **`cleanupLocalAssets.ts`** - Removed local asset files after successful migration to blob storage

### Testing & Benchmarking Scripts
Scripts used for performance testing and benchmarking:

- **`benchmark-downloads.ts`** - Benchmarked download performance from various storage backends
- **`testAudioFileDownloads.ts`** - Tested audio file download functionality

## Historical Context

These scripts were critical during the migration process (2024-2025) when:
- Moving from separate repositories to a monorepo structure
- Migrating assets from Digital Ocean Spaces to Vercel Blob Storage
- Standardizing file naming conventions and paths
- Ensuring all assets were properly accessible in production

## Usage Note

**These scripts are archived and should NOT be used in production.** They remain here for:
- Historical documentation
- Understanding past migration decisions
- Reference if similar migrations are needed in the future

If you need to perform similar operations, please create new scripts using modern patterns and the current infrastructure.

## Migration Timeline

- **Phase 1**: Initial asset inventory and audit (scripts created)
- **Phase 2**: Migration execution (bulk of usage)
- **Phase 3**: Verification and cleanup (final usage)
- **Phase 4**: Archival (2025-08-26) - Scripts moved here after successful migration

## Related Documentation

For more information about the migration process, see:
- `/docs/ARCHITECTURE.md` - Current architecture documentation
- `/apps/web/archive/migration-data/` - Migration reports and logs
- `/apps/web/archive/migration-scripts/` - Earlier migration scripts

---

*Archived: 2025-08-26*
*Total Scripts Preserved: 22*