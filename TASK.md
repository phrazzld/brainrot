# Hybrid Manual/Automated KDP Publishing Pipeline

## Design Review and Recommendations (2025-08-28)

This section documents a critical review of the proposed plan, based on a thorough read of TASK.md and an audit of the current repository (apps/publisher, @brainrot/converter, @brainrot/templates, scripts/generate-formats.ts, and content/translations/books/*).

Summary
- Strengths
  - Clear, phased roadmap; clean separation of concerns (cover validation, legal pages, manuscript assembly, CLI UX).
  - Sensible ADRs: keep Pandoc; add validation stages; rate-limit awareness; error-recovery tiers.
  - Thoughtful CLI UX (dry-run, preview, progressive feedback) and security posture (Pandoc sandboxing, metadata allowlists).
- Concerns and gaps
  - eBook cover “DPI” and “contrast/readability” as blockers are not KDP requirements and risk false negatives; make them advisory warnings.
  - Quality scoring (blur/contrast/readability) will be brittle; avoid ML-like heuristics or treat as non-blocking.
  - The submitted/validated/rejected directory choreography may be heavier than needed; a content-hash cache plus status file is simpler and plays better with Turborepo.
  - Practical mismatches with current code (commands/flags, expected outputs, MOBI path, EPUB upload flow) require alignment.
  - A new /api/validate-cover endpoint increases attack surface; defer unless a web preview is required.
  - KDP UI automation is fragile; expect maintenance for selector churn and flows.

Fit with current repository
- Publisher CLI
  - Current shape: apps/publisher exposes `kdp publish|login|check`. TASK.md examples (`pnpm publish:kdp <slug>`, flags like `--with-cover`, `--validate-cover-only`) do not exist yet. Either add top-level script aliases or update examples to match the actual command shape.
- Expected artifacts
  - Publisher checks for `generated/kindle.epub` and `generated/cover.jpg`, but the generate-formats script currently only emits text (EPUB/PDF are placeholders). Mismatch will cause publishing to fail unless EPUB generation is implemented and paths are aligned.
- Converter
  - @brainrot/converter still offers MOBI via Calibre. MOBI is deprecated; normalize on EPUB3 (Kindle-compatible) and remove MOBI from the code path.
- KdpService upload flow
  - uploadManuscript currently searches for a PDF accept input. For Kindle eBooks, EPUB is the expected upload; selectors and steps should align with the “Kindle eBook” flow.
- Templates
  - @brainrot/templates can auto-generate an SVG cover. The plan assumes manual covers. Support both: use manual if present, else fall back to template-generated.

What to keep as-is
- Keep Pandoc as the backbone for EPUB/PDF generation (ADR-007), using include-before-body for legal pages.
- Keep three-tier error recovery; focus auto-fix on format/DPI/color space transforms, and treat subjective quality issues as warnings.
- Keep richer CLI UX and dry runs.

Recommended simplifications and changes
- Cover validation scope
  - eBook covers: enforce pixel dimensions and file size as blocking checks; treat DPI/blur/contrast/readability as non-blocking advisory warnings.
  - Print covers: spine/bleed/CMYK are complex; implement in a separate print pipeline/phase to avoid conflating with eBook flow.
- Directory and status model
  - Prefer a deterministic, idempotent layout:
    - Source: `content/translations/books/{slug}/covers/ebook/source/cover.{jpg,png,tiff}`
    - Outputs: `content/translations/books/{slug}/generated/cover.jpg` and `.../validation.json`
    - Compute a content hash of the source; skip reprocessing on unchanged hashes. Avoid moving files across submitted/validated/rejected; use status files instead.
- API endpoint
  - Defer `/api/validate-cover` unless a web preview is required. Start with CLI-only validation to minimize server surface.
- Queue/rate limiting
  - For 3-books/day, a sqlite-backed counter/token bucket is sufficient; expose a status command. Consider Redis/Bull only if volume grows.
- Legal pages
  - Start by templating legal pages inside `@brainrot/templates` and generating a `legal.md` that Pandoc includes (`--include-before-body`). Consider a dedicated package later if needed.
- CLI surface
  - Simplify commands:
    - `pnpm publish:kdp <slug>`
    - `pnpm kdp:validate-cover <slug>` (nonzero exit only for technical noncompliance)
    - `pnpm kdp:dry-run <slug>` (renders validation + “what will upload” checklist)
  - Always attempt cover validation if a manual cover exists; warn and fall back to template-generated otherwise.
- Observability
  - Extend publishing reports to include input hashes (manuscript, cover), validation results (blocking/advisory), outputs, and the KDP outcome.
- KDP automation hardening
  - Prefer accessible role/name locators; add retries and verification checkpoints. Maintain a selector map and robust mock mode.
- Security
  - Keep metadata allowlists for Pandoc; validate slugs to prevent path traversal; if adding server endpoints later, strictly cap sizes and enforce file types.

What to avoid or downgrade in priority
- Blocking for subjective “quality analysis” (blur/contrast/thumbnail readability) for eBook covers; keep as advisory only.
- Enforcing DPI for eBook covers (irrelevant for digital); keep DPI constraints for print-only flows.
- Early introduction of a server API for validation without a clear web-preview need.

Alternative design (lower maintenance)
- Declarative, idempotent publishing graph
  - One metadata file describes sources and intended outputs; a single runner computes hashes and produces:
    - `generated/{slug}/epub/book.epub`
    - `generated/{slug}/pdf/{paperback,hardcover}.pdf`
    - `generated/{slug}/cover.jpg`
    - `generated/{slug}/status.json` (validation results, including advisories)
  - The KDP publish step depends on these artifacts and the rate-limit gate. No staged directories; just deterministic outputs + status.
- Or, reduce automation risk
  - Produce a “KDP bundle” (validated cover.jpg, book.epub, metadata preview) and guide a human through upload with a helper overlay. This avoids Playwright fragility while delivering most of the value.

Prioritized actions (short term)
1) Align commands and outputs
   - Add top-level script aliases or correct examples in TASK.md to match the existing CLI; ensure publisher expects `generated/{slug}/book.epub` (or update to match current path conventions) and `generated/{slug}/cover.jpg`.
   - Implement EPUB generation in `scripts/generate-formats.ts` via `@brainrot/converter` with explicit EPUB3 options and `--include-before-body`.
   - Update KdpService upload to support EPUB for Kindle eBooks.
2) Remove MOBI paths
   - Deprecate/strip MOBI generation in `@brainrot/converter`; standardize on EPUB3 (Kindle-compatible).
3) Minimal cover validator CLI
   - `pnpm kdp:validate-cover <slug>`: normalize to cover.jpg under generated/, emit validation.json with blocking (pixels/size/format) and advisory checks.
4) Legal pages via templates
   - Ship markdown templates in `@brainrot/templates`; generate `legal.md` and inject via Pandoc.
5) Simple rate-limit gate
   - Use sqlite to track daily publishes; expose a status command and gate publish.

Closing note
- The plan is strong and close to shippable with scope adjustments. Focus on deterministic, idempotent builds, keep only technical compliance as blockers for eBook covers, treat “quality” as advisory, and either harden KDP automation incrementally or ship a guided manual upload to minimize maintenance risk.


## 🎯 Core Strategy: Manual Cover + Maximum Automation

Transform the existing brainrot monorepo publishing infrastructure to support a hybrid workflow where users manually provide cover images with automated validation, while fully automating manuscript assembly, legal page generation, format conversion, and KDP publishing.

## 1. **Cover Image Workflow Architecture**

### File Organization Structure
```
/content/translations/books/{book-slug}/
├── covers/
│   ├── ebook/
│   │   ├── submitted/           # Manual drop zone for user covers
│   │   │   └── cover.{jpg,png,tiff,psd}
│   │   ├── validated/           # Post-validation processed covers
│   │   │   ├── cover.jpg        # KDP-optimized final version
│   │   │   ├── cover-hd.jpg     # High-resolution backup
│   │   │   └── validation-report.json
│   │   └── rejected/            # Failed validation with detailed reasons
│   │       ├── cover-rejected.{ext}
│   │       └── rejection-report.json
└── generated/
    ├── cover.jpg -> ../covers/ebook/validated/cover.jpg  # Symlink for build
    └── legal-pages/             # New: Auto-generated legal content
        ├── copyright.md
        ├── title-page.md
        ├── ai-disclosure.md
        └── table-of-contents.md
```

### Multi-Stage Validation Pipeline
1. **Pre-flight Checks**
   - File existence and accessibility
   - Format detection and support verification
   - Basic dimension and file size validation
   - Corruption detection

2. **KDP 2025 Compliance Validation**
   - Minimum dimensions: 1600x2560px (eBook covers)
   - Print covers: spine width calculation for paperback/hardcover
   - DPI: 300 minimum for print, 72+ for digital
   - Color profile: RGB for digital, CMYK analysis for print
   - Format: JPEG preferred, PNG acceptable
   - File size limits: <50MB

3. **Quality Analysis**
   - Sharpness and clarity assessment
   - Text readability on thumbnail sizes
   - Background contrast analysis
   - Professional appearance scoring

4. **Auto-Processing & Enhancement**
   - Format conversion (PNG/TIFF/PSD → JPEG)
   - DPI normalization and upscaling
   - Color profile conversion (CMYK → RGB)
   - Automatic cropping and aspect ratio correction
   - Border addition for genre requirements

## 2. **Maximum Automation Strategy**

### Legal Page Generation System
```typescript
// New: @brainrot/legal-generator package
interface LegalPageTemplates {
  copyrightPage: {
    isbn: string;
    publicationDate: string;
    originalWork: string;
    translationCopyright: string;
    aiDisclosure: string;
    publisherInfo: string;
  };
  titlePage: {
    title: string;
    subtitle?: string;
    author: string;
    translator: string;
    publisher: string;
  };
  aiDisclosure: {
    generationMethod: string;
    humanOversight: string;
    disclaimer: string;
  };
}
```

**Legal Page Templates:**
- **Copyright Page**: ISBN, publication date, original work attribution, AI translation disclosure, rights statement
- **Title Page**: Book title, author, "Brainrot Edition", translator attribution
- **AI Disclosure Page**: Detailed AI usage, human oversight process, quality assurance
- **Table of Contents**: Auto-generated from chapter structure

### Enhanced Manuscript Assembly
```typescript
// Enhanced: @brainrot/manuscript-assembler package
interface ManuscriptStructure {
  frontMatter: {
    titlePage: string;
    copyrightPage: string;
    aiDisclosurePage: string;
    tableOfContents: string;
  };
  mainContent: {
    introduction?: string;
    chapters: ChapterContent[];
  };
  backMatter?: {
    aboutTranslator?: string;
    aboutSeries?: string;
  };
}
```

### Multi-Format Conversion Enhancement
```typescript
// Enhanced: @brainrot/converter package
interface ConversionTargets {
  epub: {
    version: "3.0";
    features: ["fixed-layout", "reflowable"];
    optimization: "kindle-compatible";
  };
  pdf: {
    pageSize: "6x9" | "5x8" | "custom";
    margins: PrintMargins;
    fonts: EmbeddedFonts;
  };
  mobi: {
    deprecated: true; // Amazon deprecated MOBI in 2024
    fallback: "epub";
  };
}
```

## 3. **Technical Implementation Plan**

### New Package Architecture

**1. @brainrot/cover-validator**
```typescript
interface CoverValidator {
  validateFile(filePath: string): Promise<ValidationResult>;
  autoProcess(input: string, output: string): Promise<ProcessingResult>;
  generateReport(validation: ValidationResult): ValidationReport;
}

interface ValidationResult {
  isValid: boolean;
  compliance: KDPCompliance;
  quality: QualityMetrics;
  suggestions: AutoFixSuggestion[];
  canAutoFix: boolean;
}
```

**2. @brainrot/legal-generator**
```typescript
interface LegalGenerator {
  generateCopyrightPage(metadata: BookMetadata): Promise<string>;
  generateTitlePage(metadata: BookMetadata): Promise<string>;
  generateAIDisclosure(translationInfo: TranslationInfo): Promise<string>;
  generateTableOfContents(chapters: Chapter[]): Promise<string>;
}
```

**3. @brainrot/manuscript-assembler (Enhanced)**
```typescript
interface ManuscriptAssembler {
  assembleComplete(bookSlug: string): Promise<CompleteManuscript>;
  addLegalPages(content: Content, legal: LegalPages): Promise<Content>;
  validateStructure(manuscript: Manuscript): Promise<StructureValidation>;
  generateFormats(manuscript: Manuscript): Promise<FormatOutputs>;
}
```

### Enhanced Publisher CLI Integration

**New Command Structure:**
```bash
# Full workflow with cover validation
pnpm publish:kdp great-gatsby --with-cover

# Validate cover only
pnpm publish:kdp great-gatsby --validate-cover-only

# Full dry run with preview
pnpm publish:kdp great-gatsby --dry-run --preview

# Status and validation report
pnpm publish:kdp great-gatsby --status
```

**Enhanced CLI Features:**
- Progressive validation with rich terminal UI (ora spinners, chalk colors)
- Detailed error reporting with actionable suggestions
- Preview mode showing exactly what will be published
- Comprehensive dry-run with cost estimation
- Session management and authentication status

## 4. **Developer Experience Optimization**

### Single Command Workflow
```bash
# User workflow:
# 1. Drop cover image in: content/translations/books/great-gatsby/covers/ebook/submitted/cover.jpg
# 2. Run single command:
pnpm publish:kdp great-gatsby

# System automatically:
# - Validates cover (technical + quality)
# - Generates all legal pages
# - Assembles complete manuscript
# - Converts to EPUB/PDF
# - Uploads to KDP
# - Publishes or saves as draft
```

### Progressive Validation with Rich Feedback
```typescript
interface PublishingFeedback {
  stage: "cover-validation" | "legal-generation" | "assembly" | "conversion" | "upload" | "publishing";
  status: "pending" | "in-progress" | "completed" | "failed";
  progress: number; // 0-100
  message: string;
  suggestions?: string[];
  canRetry: boolean;
  autoFixAvailable: boolean;
}
```

### Error Recovery System
```typescript
interface ErrorRecovery {
  tier1: "auto-fix";        // Automatic resolution
  tier2: "semi-auto";       // User confirmation required
  tier3: "manual";          // User intervention needed
  
  strategies: {
    coverIssues: CoverFixStrategies;
    kdpApiErrors: KDPErrorHandling;
    formatConversion: ConversionRecovery;
    networkIssues: NetworkRecovery;
  };
}
```

## 5. **Validation & Quality Assurance**

### Cover Validation Features
```typescript
interface CoverValidation {
  technical: {
    dimensions: DimensionCheck;
    resolution: DPIValidation;
    colorProfile: ColorSpaceValidation;
    format: FileFormatCheck;
    fileSize: SizeValidation;
  };
  quality: {
    sharpness: SharpnessAnalysis;
    readability: TextReadabilityCheck;
    contrast: ContrastAnalysis;
    professionalism: AppearanceScore;
  };
  kdpSpecific: {
    genreCompliance: GenreRequirements;
    contentGuidelines: ContentPolicyCheck;
    thumbnailTest: ThumbnailReadability;
  };
}
```

### Comprehensive Pre-flight System
```typescript
interface PreflightChecks {
  assets: {
    coverExists: boolean;
    coverValid: boolean;
    contentComplete: boolean;
    metadataValid: boolean;
  };
  legal: {
    copyrightInfo: boolean;
    aiDisclosure: boolean;
    isbnValid: boolean;
    rightsCleared: boolean;
  };
  technical: {
    formatsGenerated: boolean;
    sizesOptimal: boolean;
    kdpCompliant: boolean;
    uploadReady: boolean;
  };
}
```

## 6. **Integration with Existing Infrastructure**

### Monorepo Integration Points
- **Extends existing KDP service** with cover validation workflow
- **Enhances current converter package** with legal page generation
- **Maintains Turborepo performance** with intelligent caching
- **Preserves existing functionality** while adding cover workflow
- **Leverages current metadata system** for legal page generation

### Performance Considerations
- **Cover validation caching** to avoid re-processing unchanged covers
- **Incremental manuscript assembly** only when content changes
- **Format conversion caching** with content fingerprinting
- **KDP session persistence** to avoid re-authentication
- **Parallel processing** for multi-format generation

## 7. **Implementation Phases**

### Phase 1: Cover Validation System (High Priority)
1. Create `@brainrot/cover-validator` package
2. Implement comprehensive validation pipeline
3. Add auto-processing and enhancement features
4. Create rich feedback and reporting system

### Phase 2: Legal Page Automation (High Priority)
1. Create `@brainrot/legal-generator` package
2. Design legal page templates
3. Implement metadata-driven generation
4. Add AI disclosure and compliance features

### Phase 3: Enhanced Manuscript Assembly (High Priority)
1. Enhance `@brainrot/manuscript-assembler` package
2. Integrate legal page generation
3. Improve format conversion pipeline
4. Add comprehensive validation

### Phase 4: CLI Integration & UX (Medium Priority)
1. Enhanced publisher CLI with cover workflow
2. Progressive validation and rich feedback
3. Error recovery and auto-fix systems
4. Comprehensive dry-run and preview modes

### Phase 5: Advanced Features (Lower Priority)
1. Batch processing for multiple books
2. Cover template generation assistance
3. A/B testing for cover variations
4. Advanced analytics and reporting

## Success Metrics

### Technical Metrics
- **Build Performance**: Maintain <15s build time, 99%+ cache hit rate
- **Validation Speed**: <30s for complete cover validation and processing
- **Success Rate**: >95% successful publications on first attempt
- **Error Recovery**: <5% requiring manual intervention

### User Experience Metrics
- **Workflow Simplicity**: Single command publishes complete book
- **Error Clarity**: 100% of errors include actionable fix suggestions
- **Preview Accuracy**: Published result matches dry-run preview exactly
- **Documentation**: Complete workflow documented with examples

This comprehensive plan transforms your existing 95% complete infrastructure into a professional-grade KDP publishing pipeline that maximizes automation while providing the flexibility and control needed for high-quality cover design.

---

# Enhanced Specification

## Research Findings

### Industry Best Practices (2025 KDP Requirements)

**Critical AI Content Disclosure Requirements**
- **Mandatory Disclosure**: All AI-generated content (text, images, translations) must be disclosed even if heavily edited
- **Daily Upload Limit**: KDP now limits publishers to 3 book uploads per day to manage AI content
- **Implementation**: Add AI disclosure to copyright page and during KDP submission process
- **EU Compliance**: Transparency requirement for AI translations under EU AI Act

**Updated Cover Specifications**
- **eBook Covers**: 2,560 x 1,600 pixels (1.6:1 ratio), 300 DPI minimum, JPEG/TIFF format
- **Print Covers**: 300 DPI minimum, 0.125" bleed required, print-ready PDF with spine calculation
- **File Size Limits**: Maximum 50MB per cover file
- **Quality Requirements**: Blur detection (Laplacian variance >100), contrast ratio 4.5:1 minimum (WCAG AA)

**Format Changes for 2025**
- **MOBI Deprecated**: As of March 2025, KDP no longer supports MOBI for fixed-layout eBooks
- **EPUB3 Preferred**: Use `--to epub3 --epub-version=3` in pandoc for Kindle compatibility
- **Print Royalty Change**: June 2025 - royalty rate drops from 60% to 50% with reduced printing costs

### Technology Analysis

**Image Processing: Sharp.js Selected**
- **Performance**: 3-5x faster than ImageMagick, significantly lower memory usage
- **Modern API**: Promise-based, TypeScript native, integrates seamlessly with Node.js
- **Advanced Features**: Built-in blur detection, color analysis, metadata handling, DPI correction
- **Version**: ^0.34.3 (current stable with active maintenance)

**EPUB Generation: Pandoc Enhancement Strategy**
- **Primary**: Enhance existing pandoc pipeline with `--include-before-body` for legal pages
- **Structured Logging**: Use `--log=pandoc-log.json` for error parsing
- **External Metadata**: YAML files for script automation
- **Font Embedding**: `--epub-embed-font` for consistency across readers

**Validation: Zod for TypeScript Projects**
- **Performance**: Fastest validation library for TypeScript
- **Type Safety**: Automatic type inference with `z.infer<>`
- **Security**: Minimal dependency footprint
- **Error Reporting**: Rich error context with actionable suggestions

### Codebase Integration Patterns

**Validation Pattern** (from `/apps/web/app/api/download/validators.ts:22-54`)
```typescript
export function validateCover(file: Buffer, log: Logger): ValidationResult {
  // Multi-stage validation with structured errors
  const technical = validateTechnicalSpecs(file);
  if (!technical.isValid) return technical;
  
  const quality = validateQualityMetrics(file);
  if (!quality.isValid) return quality;
  
  const kdpCompliance = validateKDPRequirements(file);
  return kdpCompliance;
}
```

**Batch Processing Pattern** (from `/packages/@brainrot/converter/src/batchConverter.ts:37-131`)
```typescript
export async function processCovers(covers: CoverFile[]): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  for (const cover of covers) {
    try {
      const processed = await validateAndProcess(cover);
      results.push({ file: cover.name, success: true, output: processed });
    } catch (error) {
      results.push({ file: cover.name, success: false, error: error.message });
    }
  }
  return results;
}
```

**CLI Integration Pattern** (from `/apps/publisher/src/commands/kdp.ts:24-66`)
```typescript
export function createPublishCommand(): Command {
  return new Command("publish:kdp")
    .argument("<book-slug>", "Book identifier")
    .option("--validate-cover-only", "Only validate cover without publishing")
    .option("--dry-run", "Preview without publishing")
    .option("--with-cover", "Include cover validation in workflow")
    .action(async (bookSlug, options) => {
      const spinner = ora("Initializing KDP publishing...").start();
      // Progressive validation with rich feedback
    });
}
```

## Detailed Requirements

### Functional Requirements

**FR1: Cover Validation System**
- **Description**: Multi-stage validation pipeline for manually submitted cover images
- **Acceptance Criteria**:
  - Validates dimensions (≥1600x2560px for eBook)
  - Checks DPI (≥300 for print, ≥72 for digital)
  - Verifies format (JPEG/PNG/TIFF support)
  - Analyzes quality (blur, contrast, readability)
  - Auto-processes fixable issues (format conversion, DPI correction)

**FR2: Legal Page Generation**
- **Description**: Automated generation of required legal pages from metadata
- **Acceptance Criteria**:
  - Generates copyright page with AI disclosure
  - Creates title page with proper attribution
  - Produces table of contents from chapter structure
  - Includes all required ISBN and publication info
  - Complies with 2025 KDP requirements

**FR3: Manuscript Assembly**
- **Description**: Combines all content into publishable manuscript
- **Acceptance Criteria**:
  - Assembles front matter, chapters, back matter in correct order
  - Maintains formatting consistency across sections
  - Preserves Gen Z language style
  - Generates multiple output formats (EPUB3, PDF)

**FR4: KDP Publishing Automation**
- **Description**: End-to-end publishing workflow with rate limiting
- **Acceptance Criteria**:
  - Respects 3 books/day KDP limit
  - Handles authentication and session management
  - Provides progress tracking and error recovery
  - Supports dry-run preview mode

### Non-Functional Requirements

**Performance**
- Cover validation: <30 seconds for complete processing
- Manuscript assembly: <1 minute for 500-page book
- Format conversion: <2 minutes for EPUB+PDF generation
- End-to-end publishing: <15 minutes total

**Security**
- No credential storage in code or logs
- Secure subprocess execution for external tools
- Input sanitization for all user-provided content
- Rate limiting compliance with external services

**Scalability**
- Handle 100+ books in monorepo
- Process multiple books in parallel where allowed
- Cache validation results for unchanged content
- Support batch operations for bulk publishing

**Availability**
- Graceful degradation when KDP unavailable
- Local validation and preview without external dependencies
- Retry logic for transient failures
- Queue persistence across restarts

## Architecture Decisions

### ADR-007: Image Processing Library Selection

**Status**: Accepted
**Date**: 2025-01-28

**Context**
The KDP publishing pipeline requires robust image processing for cover validation, including dimension checking, DPI verification, format conversion, and quality analysis.

**Decision**
Use Sharp.js as the primary image processing library with Jimp as fallback for edge cases.

**Rationale**
- **Performance**: Sharp.js is 10-20x faster than alternatives (libvips-based)
- **Memory Efficiency**: Streaming support for large images
- **Feature Completeness**: Native support for all required operations
- **TypeScript Support**: First-class TypeScript definitions
- **Active Maintenance**: Regular updates and security patches

**Trade-offs**
- (+) Exceptional performance for image-heavy operations
- (+) Comprehensive feature set for validation and processing
- (-) Native dependency requires compilation for some platforms
- (-) Larger installation size than pure JS alternatives

**Alternatives Considered**
- ImageMagick via CLI: Rejected due to performance and security concerns
- Jimp (pure JS): Kept as fallback for platforms where Sharp fails
- Canvas API: Rejected due to limited format support

### ADR-008: EPUB Generation Architecture

**Status**: Accepted
**Date**: 2025-01-28

**Context**
Need to generate Kindle-compatible EPUB3 files with legal pages, proper structure, and metadata.

**Decision**
Enhance existing Pandoc pipeline with programmatic legal page injection rather than switching to pure JS library.

**Rationale**
- **Proven Reliability**: Pandoc already works in production
- **Format Quality**: Industry-standard EPUB generation
- **Flexibility**: Template system for customization
- **Integration**: Existing pipeline knowledge

**Implementation**
```bash
pandoc \
  --from markdown \
  --to epub3 \
  --metadata-file=metadata.yaml \
  --include-before-body=legal.md \
  --epub-cover-image=cover.jpg \
  --toc --toc-depth=2 \
  -o output.epub \
  chapters/*.md
```

### ADR-009: Multi-Stage Validation Pipeline

**Status**: Accepted
**Date**: 2025-01-28

**Context**
Cover validation requires multiple checks with different failure modes and recovery strategies.

**Decision**
Implement composable validation pipeline with three stages: technical, quality, and KDP compliance.

**Structure**
```typescript
interface ValidationPipeline {
  stages: [
    TechnicalValidation,  // Dimensions, format, DPI
    QualityValidation,    // Blur, contrast, readability
    KDPCompliance        // Platform-specific requirements
  ];
  recovery: {
    autoFix: boolean;
    suggestions: string[];
    manualRequired: boolean;
  };
}
```

**Rationale**
- **Separation of Concerns**: Each stage has different expertise
- **Progressive Enhancement**: Early stages can fix issues for later stages
- **User Experience**: Clear feedback at each validation level

### ADR-010: Error Recovery Strategy

**Status**: Accepted
**Date**: 2025-01-28

**Context**
Publishing pipeline has multiple failure points requiring intelligent recovery.

**Decision**
Implement three-tier recovery system:
1. **Auto-fix**: Automatic resolution for known issues
2. **Semi-auto**: User confirmation for suggested fixes
3. **Manual**: User intervention with detailed guidance

**Implementation Priorities**
- Format conversion: Auto-fix
- DPI correction: Auto-fix
- Color profile: Semi-auto
- Blur issues: Manual with reshoot suggestion

### ADR-011: Queue System Architecture

**Status**: Accepted
**Date**: 2025-01-28

**Context**
KDP limits publishers to 3 books per day, requiring queue management.

**Decision**
Implement in-memory queue with SQLite persistence for simplicity.

**Rationale**
- **Simplicity**: No external Redis dependency
- **Persistence**: SQLite for crash recovery
- **Portability**: Works on all platforms
- **Sufficient Scale**: 3 books/day doesn't need distributed queue

**Alternative for Scale**
If publishing volume increases, migrate to BullMQ + Redis.

### ADR-012: Cover Workflow Integration

**Status**: Accepted
**Date**: 2025-01-28

**Context**
Need intuitive workflow for manual cover submission with automated processing.

**Decision**
File-system based workflow with staged directories:
- `submitted/` - Manual drop zone
- `validated/` - Processed and approved
- `rejected/` - Failed with reasons

**Rationale**
- **Intuitive**: Mirrors mental model of validation flow
- **Transparent**: File location indicates status
- **Integration**: Symlinks connect to build pipeline
- **Debugging**: Easy inspection of validation history

## Implementation Strategy

### Development Approach

**Phase 1: Core Infrastructure (Week 1-2)**
1. Set up new packages structure
2. Implement Sharp.js cover validator
3. Create legal page templates
4. Basic manuscript assembly

**Phase 2: Integration (Week 2-3)**
1. Enhance publisher CLI
2. Connect validation pipeline
3. Integrate with existing converter
4. Add error recovery

**Phase 3: Polish (Week 3-4)**
1. Rich terminal UI
2. Comprehensive testing
3. Documentation
4. Performance optimization

### MVP Definition

**Core Features for Initial Release**
1. **Cover Validation**: Technical specs checking with auto-fix
2. **Legal Pages**: Copyright, title, AI disclosure generation
3. **Single Book Publishing**: Complete workflow for one book
4. **Basic Error Recovery**: Retry logic and clear error messages

**Success Criteria**
- Publish "The Great Gatsby" successfully to KDP
- Cover validation catches non-compliant images
- Legal pages pass KDP review
- Process completes in <15 minutes

### Technical Risks

**Risk 1: Sharp.js Platform Compatibility**
- **Description**: Native bindings may fail on some platforms
- **Mitigation**: Implement Jimp fallback for affected platforms
- **Detection**: Pre-flight check during installation

**Risk 2: KDP Rate Limiting Changes**
- **Description**: Amazon may change daily upload limits
- **Mitigation**: Configurable queue limits with monitoring
- **Detection**: Track rejection patterns

**Risk 3: Legal Page Compliance**
- **Description**: AI disclosure requirements may be insufficient
- **Mitigation**: Template versioning with legal review process
- **Detection**: Monitor KDP rejection reasons

## Integration Requirements

### Existing System Impact

**Affected Systems**
- `@brainrot/converter`: Enhanced with cover processing
- `@brainrot/templates`: Extended for legal pages
- `apps/publisher`: New commands and workflows
- `packages/@brainrot/metadata`: Additional validation rules

**Migration Path**
1. New features are additive (no breaking changes)
2. Existing workflows continue to function
3. Gradual adoption via feature flags

### API Design

**Cover Validation API**
```typescript
POST /api/validate-cover
Content-Type: multipart/form-data

Response:
{
  "isValid": boolean,
  "validation": {
    "technical": ValidationResult,
    "quality": QualityMetrics,
    "compliance": KDPCompliance
  },
  "suggestions": AutoFixSuggestion[],
  "processedUrl": string?
}
```

### Data Migration

**No Migration Required**: New features are additive
- Cover files stored in new directory structure
- Legal pages generated on-demand
- Existing books can adopt new workflow gradually

## Testing Strategy

### Unit Testing

**Coverage Requirements**
- Cover validation: 90% coverage
- Legal page generation: 95% coverage
- Error recovery: 85% coverage

**Key Test Cases**
- Invalid image formats
- Below-minimum dimensions
- Missing metadata fields
- Rate limit handling

### Integration Testing

**Test Scenarios**
- End-to-end publishing flow
- Cover validation with auto-processing
- Manuscript assembly with legal pages
- KDP upload simulation

### End-to-End Testing

**User Workflows**
1. Submit cover → Validation → Auto-fix → Success
2. Submit cover → Validation → Manual fix needed
3. Generate legal pages → Assembly → Publishing
4. Rate limit hit → Queue → Delayed publishing

## Deployment Considerations

### Environment Requirements

**Development**
- Node.js ≥22.0.0
- Sharp.js dependencies (libvips)
- Pandoc installation
- 8GB RAM for image processing

**Production**
- Same as development
- SQLite for queue persistence
- Sufficient disk space for cover processing
- Network access to KDP

### Rollout Strategy

**Phase 1: Internal Testing**
- Test with single book
- Validate all legal pages
- Verify KDP compliance

**Phase 2: Beta Release**
- 5-10 books
- Monitor success rate
- Gather feedback

**Phase 3: Full Release**
- All books
- Batch processing enabled
- Performance optimization

### Monitoring & Observability

**Key Metrics**
- Cover validation success rate
- Average processing time per book
- KDP publishing success rate
- Queue depth and processing rate

**Logging**
- Structured JSON logs
- Correlation IDs for request tracking
- Error categorization
- Performance timing

**Alerts**
- Validation failure rate >10%
- Publishing queue depth >10
- Processing time >30 minutes
- KDP authentication failures

## Success Criteria

### Acceptance Criteria

**Technical Success**
- ✅ All books can be published via single command
- ✅ Cover validation catches 95% of compliance issues
- ✅ Legal pages generated correctly for all books
- ✅ Error recovery handles 90% of failures automatically

### Performance Metrics

**Target Performance**
- Cover validation: <30s
- Legal page generation: <5s
- Manuscript assembly: <60s
- Format conversion: <120s
- Total publishing: <15 minutes

### User Experience Goals

**Developer Experience**
- Single command publishing
- Clear error messages with fixes
- Progress tracking throughout
- Dry-run preview capability

**Success Indicators**
- 0 manual interventions for valid covers
- <5% rejection rate from KDP
- <3 minutes to diagnose issues
- 100% legal compliance

## Future Enhancements

### Post-MVP Features

**Phase 2 Enhancements**
- Batch processing for multiple books
- A/B testing for cover variations
- Advanced quality scoring
- Publishing analytics dashboard

**Phase 3 Capabilities**
- Multi-platform publishing (Lulu, IngramSpark)
- Cover template generation
- AI-powered cover suggestions
- Revenue optimization tools

### Scalability Roadmap

**6-Month Goals**
- 100+ books published
- Automated cover generation for some books
- Multi-language support
- API for external integrations

**12-Month Vision**
- 500+ books catalog
- White-label publishing service
- Marketplace for cover designers
- Full publishing automation

## Requirements Clarification

### Critical Questions Resolved

**Q: What happens when cover validation fails after auto-processing?**
A: System moves cover to `rejected/` with detailed report, notifies user, suggests manual fixes

**Q: Are AI disclosure templates legally sufficient?**
A: Templates comply with current KDP requirements; version control enables updates as needed

**Q: Should validation be synchronous or asynchronous?**
A: Synchronous with progress indicators for immediate feedback

**Q: Keep Playwright or migrate to APIs?**
A: Enhance existing Playwright service; no official KDP API available

### Implementation Notes

**Cover Validation Recovery**
- Auto-fix attempts for format/DPI issues
- Detailed rejection report with specific problems
- Suggested fixes with examples
- Manual upload path remains available

**Legal Compliance Strategy**
- Templates based on KDP 2025 guidelines
- Version control for template updates
- Monitoring for rejection patterns
- Quick template updates without code changes