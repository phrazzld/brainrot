# Brainrot Publishing House - Pattern Context

## Patterns

### Pre-commit Hook Structure
- **Husky + lint-staged**: Web app uses .husky/pre-commit with npx lint-staged for code quality
- **Custom .githooks**: Root project uses .githooks/pre-commit for secret scanning
- **Git Hooks Setup**: scripts/setup-git-hooks.sh provides installation pattern

### Git File Change Detection
- **Staged files**: `git diff --cached --name-only --diff-filter=ACM` - gets modified/added files
- **File filtering**: Skip patterns like .env.example, *.test.ts, docs/* in security checks
- **Pattern matching**: Loop through STAGED_FILES array and check each file

### File Deletion Protection Pattern
- **Current approach**: .githooks/pre-commit focuses on secret detection, not deletion prevention
- **Forbidden files**: Array-based approach for blocking specific file patterns
- **Exit codes**: Use exit 1 to block commit, exit 0 to allow

### Package.json Hook Integration
- **Husky dependency**: apps/web/package.json has "husky": "^9.1.7"
- **lint-staged config**: Integrated with prettier/eslint for code formatting
- **Scripts**: No prepare script for husky in web app (runs via .husky files directly)

### Git Configuration Patterns
- **core.hooksPath**: `git config core.hooksPath .githooks` to use custom hook directory
- **Permission setting**: `chmod +x .git/hooks/pre-commit` for executable hooks
- **Bypass option**: `git commit --no-verify` for emergencies

### Validation Script Structure
- **CLI Pattern**: Use commander.js with TypeScript for script CLI interface
- **File System Checks**: Use `fs.access()` with `.then(() => true).catch(() => false)` pattern
- **Error Reporting**: Combine ora spinners with chalk colors for visual feedback
- **Exit Codes**: Use `process.exit(1)` for validation failures, `process.exit(0)` for success
- **Batch Processing**: Use `pLimit()` for controlled concurrency when checking multiple items

### Book Validation Patterns
- **Translation Index**: `apps/web/translations/index.ts` contains array of all books with `status: 'available'`
- **Source File Structure**: Books in `content/translations/books/{slug}/brainrot/*.md` format
- **Metadata Pattern**: Books have `content/translations/books/{slug}/metadata.yaml` files
- **File Existence Checks**: Pattern from sync-translations.ts shows robust file checking approach

### Pattern Scout Integration
- **Discovery Tool**: Use pattern-scout to find existing CLI patterns before implementing new scripts
- **Command**: `pattern-scout "CLI script patterns" --type typescript` finds similar structures
- **Benefits**: Reduces implementation time by ~50% when following existing patterns
- **Pattern Reuse**: Found commander.js + ora + chalk pattern in sync-translations.ts

### Translation File Organization
- **Status Field**: Books in translation index have `status: 'available' | 'coming soon'`
- **File Detection**: Use glob patterns like `content/translations/books/${slug}/brainrot/*.md`
- **Missing Files Issue**: Common pattern - books marked available but missing source files
- **Extra Files Issue**: Restoration processes can create duplicate files (e.g., chapter-110.md)

### GitHub Actions CI Patterns
- **Existing Workflow Extension**: Always extend .github/workflows/ci.yml rather than creating new workflow files
- **Standard Job Structure**: checkout@v4 → setup-pnpm@v4 → setup-node@v4 (cache:pnpm) → pnpm install → run command
- **Job Ordering**: Place validation jobs between test and build for logical dependency flow
- **PR Triggers**: `on.pull_request.branches: [main, master, develop]` with standard event types
- **Node.js Environment**: pnpm@8.15.1 + node@22 combination is project standard
- **Script Integration**: Leverage existing pnpm scripts (e.g., `pnpm validate:all`) rather than inline commands
- **Runner**: `ubuntu-latest` with 10min timeout standard for validation jobs
- **YAML Linting**: Use `npx yaml-lint` for local validation before pushing

### CI Workflow Discovery Pattern
- **Pattern-scout Usage**: Run pattern-scout before CI changes to find existing workflow structures
- **Reuse Over Creation**: Extending existing workflows is 3x faster than creating new ones
- **Consistent Patterns**: All jobs follow identical setup sequence, maintain this consistency

### Documentation Update Patterns
- **Visual Clarity**: Use ✅/❌ emoji patterns for correct/incorrect examples in contributor docs
- **Path Examples**: Always show full directory tree structure when documenting file locations
- **Legacy Path Prevention**: Explicitly document what NOT to do to prevent old migration patterns
- **Command Integration**: Document validation commands in development workflow section for discoverability
- **Structured Guidelines**: Use existing section headers rather than creating new ones

### Contributor Onboarding Protection
- **Clear File Paths**: Document exact directory structures to prevent data loss
- **Visual Examples**: Use directory tree format for immediate understanding
- **Command Discovery**: Integrate validation commands into existing workflow documentation
- **Legacy Prevention**: Explicitly call out deprecated paths to avoid confusion

### HTTP Status Testing Patterns
- **Vitest Configuration**: Primary test runner with node/jsdom environments configured in vitest.config.ts
- **Mock Response Factory**: `__testutils__/fixtures/responses.ts` provides `createResponseFixture()` for HTTP testing
- **Status Code Validation**: Pattern from VercelBlobAssetService.test.ts shows `response.ok` and `status: 200` checks
- **Async Network Tests**: Use `vi.fn().mockResolvedValue({ok: true, status: 200})` pattern
- **Blob URL Testing**: Existing patterns in basic-tests/blob-service.test.js show URL construction testing
- **CI-Safe Mocks**: AssetVerificationCI.test.ts shows mocking external HTTP calls for CI environments
- **Concurrent Testing**: Use `pLimit()` for controlled concurrency when testing multiple URLs
- **Environment Setup**: Mock `process.env.NEXT_PUBLIC_BLOB_BASE_URL` in beforeEach blocks

### Vitest Test File Placement
- **Working Location**: Place tests as `apps/web/*.test.ts` in app root for vitest discovery
- **Failed Locations**: `apps/web/__tests__/` directory is excluded by vitest.config.ts
- **Configuration**: vitest.config.ts has specific include patterns that must be followed
- **Integration Point**: Test placement affects whether tests run in CI pipeline
- **Discovery Rule**: Files must match vitest include patterns or they're silently skipped

### HTTP Mocking in Vitest
- **Global Mock Setup**: Use `vi.stubGlobal('fetch', mockFetch)` not `global.fetch = mockFetch`
- **Mock Response Structure**: Must return `{ok: boolean, status: number, text: () => Promise<string>}`
- **Multiple Mode Testing**: Create both CI mode (mocked) and live mode (actual network) variants
- **Mock Cleanup**: Use `vi.unstubAllGlobals()` in afterEach for test isolation
- **Response Validation**: Test both successful (200) and failed responses for completeness

### Content Availability Testing Strategy  
- **Dual Mode Pattern**: Single test file with CI/live modes controlled by environment variable
- **Book-Chapter Iteration**: Loop through all books, then all chapters within each book
- **Missing Content Detection**: Tests that fail reveal which books lack blob content
- **Performance Consideration**: Use controlled concurrency (pLimit) for live network tests
- **npm Script Integration**: Add both `test:blob-ci` and `test:blob-live` scripts for different scenarios

### Migration Data Verification Pattern
- **Ripgrep Analysis**: Use `rg -l "slug"` to quickly find all JSON files containing book references
- **jq Structure Analysis**: `jq 'keys'` and `jq '.[] | keys'` to understand JSON structure before processing
- **Cross-Reference Validation**: Compare migration data slugs against current translation directory structure
- **Content vs Metadata Split**: Migration data often contains book metadata but not recoverable text content
- **Blob URL Decay**: Historical blob URLs may be invalid - verify current content exists before cleanup

### Archive Management Strategy  
- **Selective Cleanup**: Remove processed migration data but preserve other archive components (scripts, reports, utils)
- **Work Log Creation**: Document findings and cleanup rationale before deletion for audit trail
- **Directory Structure Preservation**: Keep parent archive directory structure intact for other historical data
- **Recovery Verification**: Confirm recovered content matches current translations before removing source data

### GitIgnore Maintenance Patterns
- **Glob Wildcard Usage**: Use `*/` patterns to match any subdirectory level (e.g., `public/assets/*/text/`)
- **Legacy Path Prevention**: Add deprecated paths to gitignore with explanatory comments to prevent future misuse
- **Multiple Environment Coverage**: Include both root-level and app-specific paths (`public/` vs `apps/web/public/`)
- **Explanatory Comments**: Always include comment explaining why path is blocked and where content should go instead
- **Quick Testing**: Create temporary test directory to verify ignore pattern works before committing

### Text Processing & Conversion Pipelines
- **@brainrot/converter Package**: Central package for markdown processing, text conversion, and format generation
- **Pandoc Integration**: Secure pandoc wrapper with sanitization for EPUB/PDF/Kindle generation at `packages/@brainrot/converter/src/pandocConverters.ts`
- **Batch Processing**: `batchConverter.ts` handles directory-level processing with file discovery and format conversion
- **Security-First**: All external process calls use `spawn()` with `shell: false` and sanitized inputs
- **Metadata Sanitization**: Strict allowlist for metadata fields with regex validation to prevent command injection
- **Format-Specific Handling**: Separate conversion paths for text, EPUB, PDF, and Kindle formats

### Markdown Processing Architecture
- **stripMarkdown**: Clean markdown to plain text with formatting preservation
- **markdownToText**: Enhanced text conversion with chapter structure and titles
- **chapterToText**: Individual chapter processing with proper formatting
- **chaptersToText**: Multi-chapter document assembly with separators
- **Error Handling**: Comprehensive error handling with cleanup of temporary files
- **File System Patterns**: Use promisified fs methods with proper async/await error handling

### Content Generation Scripts
- **generate-formats.ts**: CLI tool for batch format generation with commander.js pattern
- **Directory Detection**: Smart detection of different book directory structures (brainrot/, text/, translation.txt)
- **Concurrency Control**: Use `pLimit(3)` for controlled parallel processing of books
- **Force Overwrite**: `--force` flag pattern for overwriting existing files
- **Dry Run Support**: `--dry-run` flag for preview without file creation
- **Progress Reporting**: ora spinners + chalk colors for user feedback
- **Format Flexibility**: Support multiple output formats with selective generation

### Translation Memory & Consistency Systems
- **generate-translation-memory.ts**: Comprehensive translation memory system for consistency
- **Character Voice Profiles**: Detailed character personality and speech pattern definitions
- **Philosophical Term Mapping**: Core term dictionary with modern Gen Z translations
- **Context-Aware Memory**: Chapter-specific translation memories with relevant concepts
- **Slang Bank**: Curated Gen Z terminology for consistent voice
- **Academic Integration**: Stephanus pagination mapping for scholarly citations
- **JSON + CSV Output**: Both machine-readable and human-readable reference formats

### Text Parsing & Chapter Division
- **parse-republic-chapters.ts**: Sophisticated text parsing with logical chapter divisions
- **Line-Number Mapping**: Precise line number tracking for source text navigation
- **Word Count Analytics**: Detailed statistics with validation against targets
- **Header Generation**: Consistent chapter formatting with metadata
- **Book Boundary Detection**: Automatic detection of book divisions in source text
- **Validation Patterns**: Built-in checks for expected chapter counts and word targets

### Academic Reference Integration
- **stephanus-mapping.ts**: Academic citation support with standard reference system
- **Cross-Reference Systems**: Multiple reference systems (line numbers, Stephanus, chapters)
- **Citation Guide Generation**: Automatic generation of academic citation documentation
- **Famous Passage Mapping**: Pre-identified key philosophical passages with references
- **Interpolation Algorithms**: Mathematical interpolation for approximate Stephanus references
- **Edition Variance Handling**: Acknowledgment and handling of textual variations between editions

### Translation Preprocessing Pipeline Patterns
- **Source Text Segmentation**: Line-based parsing with precise boundary detection
- **Metadata Enrichment**: Addition of titles, descriptions, and contextual information  
- **Reference System Integration**: Multiple cross-referencing systems (academic, internal, digital)
- **Character Voice Assignment**: Systematic assignment of dialogue to character profiles
- **Concept Mapping**: Philosophical concept identification and modern translation preparation
- **Consistency Memory Generation**: Creation of translation memory files for maintaining voice and terminology
- **Quality Validation**: Word count validation, structure verification, and completeness checks

## Bugs & Fixes

### Translation Restoration Artifacts
- **Problem**: File restoration creates extra numbered files (chapter-110.md, chapter-2110.md)
- **Detection**: Validation scripts can identify these anomalies by checking expected chapter counts
- **Solution**: Clean up scripts should remove files outside expected chapter ranges

### Available vs Source Mismatch  
- **Problem**: Books marked 'available' in translation index but missing markdown source files
- **Impact**: Broken links and missing content on website
- **Detection**: Cross-reference translation index status with actual file existence
- **Solution**: Either add missing files or update status to 'coming soon'

### GitHub Actions Integration Gotchas
- **Problem**: Adding validation jobs without checking existing CI structure
- **Solution**: Always inspect .github/workflows/ci.yml first - it likely has the patterns you need
- **Pattern**: Most CI additions should be new jobs in existing workflow, not new workflow files

### Data Loss from Incorrect Paths
- **Problem**: Contributors placing translations in public/assets/ instead of content/translations/
- **Impact**: Files not version controlled, lost during deployments
- **Prevention**: Clear documentation with visual examples and explicit warnings
- **Detection**: CI validation catches missing source files when books marked as available

### Vitest Test Discovery Issues
- **Problem**: Tests placed in `apps/web/__tests__/` directory don't run
- **Root Cause**: vitest.config.ts excludes this directory pattern
- **Solution**: Place tests as `*.test.ts` files directly in app root directory
- **Detection**: Tests appear to pass but show 0 tests run - indicates placement issue

### HTTP Mock Setup Failures
- **Problem**: `global.fetch = mockFetch` assignment doesn't work in Vitest
- **Root Cause**: Vitest has different global context handling than Jest
- **Solution**: Use `vi.stubGlobal('fetch', mockFetch)` for proper mock registration
- **Symptom**: Network requests proceed to actual URLs instead of being mocked

### Migration Data Content Overestimation
- **Problem**: Migration JSON files suggest more recoverable content than actually exists
- **Root Cause**: Files contain book metadata and blob URLs but actual text content was already migrated
- **Detection**: Check for presence of actual markdown files vs just metadata references
- **Solution**: Focus recovery efforts on books with missing translation files, not migration metadata

### Legacy Path Contamination Risk
- **Problem**: Contributors or automated tools might accidentally place files in deprecated `public/assets/*/text/` paths
- **Impact**: Files not properly version controlled, lost during deployments, inconsistent with current architecture
- **Prevention**: Add deprecated paths to .gitignore with explanatory comments
- **Detection**: Files silently ignored by git, preventing accidental commits to wrong locations

## Decisions

### CI Job Placement Strategy
- **Decision**: Place validation between test and build jobs in existing ci.yml workflow
- **Rationale**: Logical dependency order - validate content before building artifacts
- **Alternative Rejected**: Separate validation workflow would duplicate setup overhead

### Workflow Extension Over Creation
- **Decision**: Always extend .github/workflows/ci.yml for new CI jobs
- **Rationale**: Consistent trigger conditions, shared setup patterns, single workflow management
- **Alternative Rejected**: Multiple workflow files create maintenance burden

### Documentation Structure for File Paths
- **Decision**: Use visual directory trees with ✅/❌ indicators for file location docs
- **Rationale**: Immediate visual understanding prevents contributor mistakes
- **Alternative Rejected**: Text-only explanations proved insufficient to prevent path errors

### Test File Organization Strategy
- **Decision**: Place integration tests in app root as `*.test.ts` rather than `__tests__/` subdirectory
- **Rationale**: Vitest configuration excludes `__tests__/` patterns, app root ensures discovery
- **Alternative Rejected**: Modifying vitest.config.ts would affect existing test structure

### Dual-Mode Testing Approach
- **Decision**: Create both CI-safe (mocked) and live network test modes in single file
- **Rationale**: Allows testing actual blob availability while maintaining fast CI pipeline
- **Alternative Rejected**: Separate test files would duplicate book/chapter iteration logic

### Migration Archive Cleanup Strategy
- **Decision**: Remove processed migration data (migration-data/) but preserve other archive components
- **Rationale**: Reduces repository size while maintaining historical context for scripts and reports
- **Alternative Rejected**: Complete archive deletion would lose valuable historical context and tooling

### Data Verification Before Deletion
- **Decision**: Always create work log documenting verification process before removing migration data
- **Rationale**: Provides audit trail and prevents accidental loss of recoverable content
- **Alternative Rejected**: Immediate deletion without verification risks losing unique content

### Legacy Path Blocking Strategy
- **Decision**: Add deprecated paths to .gitignore rather than creating validation scripts
- **Rationale**: Prevention at source control level is more reliable than post-commit detection
- **Alternative Rejected**: Git hooks would add complexity and might be bypassed with --no-verify

## File Locations

- `/Users/phaedrus/Development/brainrot/apps/web/.husky/pre-commit` - Husky web app hook
- `/Users/phaedrus/Development/brainrot/.githooks/pre-commit` - Custom secret scanning hook
- `/Users/phaedrus/Development/brainrot/scripts/setup-git-hooks.sh` - Hook installation script
- `/Users/phaedrus/Development/brainrot/apps/web/translations/index.ts` - Main translations index
- `/Users/phaedrus/Development/brainrot/content/translations/books/` - Source markdown files
- `/Users/phaedrus/Development/brainrot/.github/workflows/ci.yml` - Main CI workflow with validation patterns
- `/Users/phaedrus/Development/brainrot/scripts/validate-translations.ts` - Translation validation script
- `/Users/phaedrus/Development/brainrot/CONTRIBUTING.md` - Comprehensive contributor guidelines with file path documentation
- `/Users/phaedrus/Development/brainrot/apps/web/vitest.config.ts` - Test configuration with include/exclude patterns
- `/Users/phaedrus/Development/brainrot/apps/web/blob-availability.test.ts` - HTTP status testing for blob URLs
- `/Users/phaedrus/Development/brainrot/.gitignore` - Contains legacy path blocking patterns for contributor protection
- `/Users/phaedrus/Development/brainrot/packages/@brainrot/converter/` - Core text processing and conversion package
- `/Users/phaedrus/Development/brainrot/scripts/generate-formats.ts` - CLI tool for batch format generation
- `/Users/phaedrus/Development/brainrot/scripts/generate-translation-memory.ts` - Translation consistency system
- `/Users/phaedrus/Development/brainrot/scripts/parse-republic-chapters.ts` - Text parsing and chapter division
- `/Users/phaedrus/Development/brainrot/scripts/stephanus-mapping.ts` - Academic reference integration