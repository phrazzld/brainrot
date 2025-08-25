# Legacy Scripts Archive

This directory contains legacy scripts from the monorepo migration and content standardization phase. These scripts were used during the migration from separate repositories to the unified monorepo structure and are preserved here for historical reference.

## Archived Scripts

### Migration & Standardization Scripts
- `standardizeTextFiles.ts` - Standardized text file formats and naming conventions
- `standardizeTextFilesBlob.ts` - Standardized text files in blob storage
- `standardizeTextFilesBlobWithCopy.ts` - Created copies during standardization process
- `runTextStandardizationMigration.ts` - Orchestrated text standardization migration
- `removeLegacyTextFiles.ts` - Removed old format text files after migration

### Audit Scripts
- `auditAudioAssets.ts` - Audited audio file availability and formats
- `auditImageAssets.ts` - Audited image assets for all books
- `auditTextAssets.ts` - Audited text file completeness and formatting

### Verification Scripts  
- `verifyAudioFilesAccess.ts` - Verified audio files were accessible via CDN
- `verifyAudioMigration.ts` - Verified audio migration completeness
- `verifyAudioMigrationWithContent.ts` - Deep verification including content checks
- `verifyAudioUrls.ts` - Validated all audio URLs were working
- `verifyBlobStorage.ts` - Verified blob storage integration
- `verifyCdnUrls.ts` - Checked CDN URLs for all assets
- `verifyTextMigration.ts` - Verified text file migration was complete
- `verify-blob-audio-paths.ts` - Verified audio paths in blob storage
- `verify-end-to-end-downloads.ts` - End-to-end download testing
- `verify-standardized-urls.ts` - Verified standardized URL structure

### Utility Scripts
- `cleanupLocalAssets.ts` - Removed local assets after blob upload
- `reorganize-blob-paths.ts` - Reorganized blob storage structure
- `inventory-assets.ts` - Created asset inventories
- `create-asset-inventory.ts` - Generated comprehensive asset lists
- `generateReorganizationPlan.ts` - Planned blob storage reorganization
- `validateAssetNames.ts` - Validated asset naming conventions

### Testing & Benchmarking
- `benchmark-downloads.ts` - Performance testing for downloads
- `benchmark-report-generator.ts` - Generated performance reports
- `testAudioFileDownloads.ts` - Tested audio file download functionality

## Usage

These scripts are no longer actively used but are preserved for:
1. Historical reference of the migration process
2. Understanding the evolution of the codebase
3. Potential reuse of utility functions in future migrations

## Note

The main application now uses only 7 essential scripts:
- `dev` - Development server
- `build` - Production build
- `start` - Start production server
- `lint` - Code linting
- `format` - Code formatting
- `test` - Run tests
- `typecheck` - TypeScript type checking

All migration and standardization work has been completed, and these legacy scripts are no longer needed for regular development workflow.