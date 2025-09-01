# Patterns

## CLI Command Structure
- **Command Creation**: Use commander.js with `createXCommand()` pattern returning `Command` object
- **Error Handling**: Use ora spinner, Logger class for consistent output, process.exit(1) on failure
- **File Validation**: Use `fs.access()` to check file existence, wrap in try/catch for error handling
- **Path Resolution**: Use monorepo root path resolution: `path.resolve(__dirname, "..", "..", "..", "..")`

## File Path Validation Pattern
```typescript
// From kdp.ts:134-145
if (!options.mock && !options.dryRun) {
  try {
    await fs.access(manuscriptPath);
    await fs.access(coverPath);
  } catch {
    spinner.fail("Missing generated files. Please run generate:formats first.");
    Logger.error(`Expected files at: ${manuscriptPath} and ${coverPath}`);
    return;
  }
}
```

## CLI Command Structure Pattern
```typescript
// From kdp.ts:24-66
export function createKdpCommand(): Command {
  const kdpCommand = new Command("kdp")
    .description("Publish books to Amazon KDP")
    .option("--headless", "Run browser in headless mode", true)
    .option("--mock", "Run in mock mode");

  kdpCommand
    .command("subcommand <arg>")
    .description("Description")
    .option("--dry-run", "Simulate without changes")
    .action(async (arg: string, options: Options) => {
      await implementationFunction(arg, options);
    });

  return kdpCommand;
}
```

## Pre-flight Validation Pattern  
```typescript
// From publish-all.ts:242-369
async function runPreflightChecks(
  bookSlug: string,
  metadata: any,
  options: PublishAllOptions,
): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = [];
  
  // Metadata checks
  checks.push({
    name: "Metadata title",
    status: metadata.title ? "pass" : "fail",
    message: metadata.title ? undefined : "Missing title in metadata",
  });

  // File existence checks (skip in mock mode)
  if (!options.mock && !options.dryRun) {
    try {
      await fs.access(path.join(generatedDir, "cover.jpg"));
      checks.push({ name: "Cover image", status: "pass" });
    } catch {
      checks.push({
        name: "Cover image", 
        status: "fail",
        message: "cover.jpg not found in generated/",
      });
    }
  }
  
  return checks;
}
```

## KDP Service Upload Pattern
```typescript
// From kdp.ts:317-355 - uploadManuscript implementation
async uploadManuscript(manuscript: ManuscriptDetails): Promise<void> {
  if (this.config.mockMode) {
    Logger.info(`[MOCK] Uploaded manuscript: ${path.basename(manuscript.filePath)}`);
    return;
  }

  try {
    // Click upload button
    await this.page.click('button:has-text("Upload manuscript")');

    // Set file input - CRITICAL: Currently hardcoded to PDF selector
    const fileInput = await this.page.$('input[type="file"][accept*="pdf"]');
    if (fileInput) {
      await fileInput.setInputFiles(manuscript.filePath);
    }

    // Wait for upload and processing
    await this.page.waitForSelector('text="Upload complete"', { timeout: 60000 });
    await this.page.waitForSelector('text="Processing complete"', { timeout: 120000 });

    Logger.info("Manuscript uploaded and processed successfully");
    await this.takeScreenshot("manuscript-uploaded");
  } catch (error) {
    await this.takeScreenshot("upload-manuscript-error");
    throw new Error(`Failed to upload manuscript: ${error}`);
  }
}
```

## KDP File Type Handling
```typescript
// From kdp.ts:29-32 - ManuscriptDetails interface supports EPUB
interface ManuscriptDetails {
  filePath: string;
  format: "pdf" | "epub" | "docx"; // EPUB is already supported in interface
}

// From kdp.ts:148-181 - Already configured for EPUB usage
const manuscriptPath = path.join(generatedDir, "kindle.epub"); // Using EPUB path
const manuscriptDetails = {
  filePath: manuscriptPath,
  format: "epub" as const, // Already using EPUB format
};
```

## Error Handling Pattern for Upload Failures
```typescript
// From kdp.ts:351-354 - Consistent error handling with screenshots
catch (error) {
  await this.takeScreenshot("upload-manuscript-error");
  throw new Error(`Failed to upload manuscript: ${error}`);
}
```

## Template Processing Pattern
```typescript
// From @brainrot/templates/index.js:83-108
export function processTemplate(template, values) {
  let processed = template;

  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    processed = processed.replace(regex, value || "");
  }

  // Pandoc-style variables for LaTeX
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\$${key}\\$`, "g");
    processed = processed.replace(regex, value || "");
  }

  // Handle conditional sections $if(variable)$ ... $endif$
  processed = processed.replace(
    /\$if\(([^)]+)\)\$([\s\S]*?)\$endif\$/g,
    (match, variable, content) => {
      const varName = variable.trim();
      return values[varName] ? content : "";
    },
  );

  return processed;
}
```

## Generator Function Pattern
```typescript
// From @brainrot/templates/index.js:114-147
export function generateCover(metadata) {
  const template = readTemplate("cover-svg");
  const colorScheme = getColorScheme(metadata.slug || "default");
  const emoji = getCoverEmoji(metadata.slug || "default");

  // Prepare processed values
  const values = {
    COLOR_PRIMARY: colorScheme.primary,
    COLOR_SECONDARY: colorScheme.secondary,
    TITLE_LINE_1: titleLine1.toUpperCase(),
    TITLE_LINE_2: titleLine2.toUpperCase(),
    // ... more values
  };

  return processTemplate(template, values);
}
```

## File Generation with Directory Structure
```typescript  
// From generate-formats.ts:158-270 - Text generation pattern
async function generateTextFormat(
  bookPath: string,
  outputDir: string,
  slug: string,
  options: GenerateOptions,
) {
  // Validate input paths exist
  const brainrotPath = path.join(bookPath, "brainrot");
  const brainrotExists = await fs.access(brainrotPath).then(() => true).catch(() => false);
  
  if (!brainrotExists) {
    if (options.verbose) {
      console.log(`Skipping ${slug} - no brainrot directory found`);
    }
    return;
  }

  // Create output directory structure
  if (!options.dryRun) {
    await fs.mkdir(path.join(outputDir, "text"), { recursive: true });
  }
  
  // Process each file
  for (const { inputPath, outputName } of filesToConvert) {
    const outputPath = path.join(outputDir, "text", outputName);
    
    if (!options.dryRun) {
      const content = await fs.readFile(inputPath, "utf-8");
      const textContent = stripMarkdown(content);
      await fs.writeFile(outputPath, textContent, "utf-8");
    }
  }
}
```

## Validation Module Pattern
```typescript
// From @brainrot/converter/src/validation/covers.ts - Reusable validation module
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    suggestions: string[];
  };
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: string;
  message: string;
  suggestion?: string;
}

// Individual validation functions for composability
export async function validateDimensions(imagePath: string): Promise<ValidationIssue[]>
export async function validateFormat(imagePath: string): Promise<ValidationIssue[]>
export async function validateFileSize(imagePath: string): Promise<ValidationIssue[]>

// Comprehensive validation combining all checks
export async function validateCover(imagePath: string, strict = false): Promise<ValidationResult>

// Convenience functions
export async function isCoverValid(imagePath: string): Promise<boolean>
export async function getCoverSuggestions(imagePath: string): Promise<string[]>
```

## Pattern Discovery Before Implementation
- **Use pattern-scout**: Search for existing ValidationResult/PreflightCheck patterns before creating new interfaces
- **Match existing patterns**: ValidationResult interface should match PreflightCheck structure for consistency
- **Reuse across packages**: Place shared validation logic in converter package for cross-command usage

## Code Refactoring Pattern
- **Extract inline logic**: Replace 80+ lines of inline validation with clean function calls
- **Preserve display logic**: Keep UI/display code in original command, move business logic to shared module
- **Add comprehensive tests**: Cover individual functions + integration scenarios
- **Include strict mode**: Allow enforced compliance vs warnings for different use cases

## Validation Implementation Success Indicators
- **95% code reduction**: Successfully moved complex logic from command to reusable module
- **Pattern consistency**: New ValidationResult matches existing PreflightCheck interface
- **Cross-package usage**: Validation module usable by multiple CLI commands
- **Comprehensive coverage**: All edge cases handled with appropriate error/warning types

## Image Processing Architecture Pattern
- **Dual-library approach**: Sharp.js primary with Jimp fallback for robust image processing
- **Factory pattern**: Use ImageProcessor factory to abstract library differences
- **Focus on primary**: When APIs are complex, simplify fallback to basic functionality, maximize primary library features
- **Processing reports**: Generate detailed validation.json with processing stats for debugging/transparency

## Sharp.js Image Processing Capabilities
```typescript
// From cover auto-processing implementation
// Advanced Sharp.js features for print quality
await sharp(inputBuffer)
  .resize(targetWidth, targetHeight, { 
    kernel: sharp.kernel.lanczos3,
    fit: 'fill' 
  })
  .jpeg({ 
    quality: 90, 
    mozjpeg: true,
    density: 300  // 300 DPI for print
  })
  .withMetadata({ density: 300 })
```

## Auto-upscaling Pattern for Print Requirements
- **KDP requirements**: Detect undersized covers (< 2560x2808) and auto-upscale
- **Quality preservation**: Use Lanczos3 kernel for upscaling to maintain visual quality
- **DPI compliance**: Set 300 DPI metadata for print-ready output
- **Validation integration**: Process → validate → report loop for quality assurance

## CLI Integration with Existing Command Patterns
- **Match established patterns**: Use same option structure (--mock, --dry-run, etc.) as other commands
- **Help text consistency**: Follow existing description/usage format
- **Error handling**: Use ora spinner + Logger class for consistent user experience
- **Path resolution**: Handle monorepo path routing correctly for CLI vs core function differences

## API Complexity Management Lessons
- **Sharp.js strengths**: Leverage advanced features (DPI, mozjpeg, upscaling algorithms) 
- **Jimp limitations**: Complex API for advanced features - better as simple fallback
- **Iterative debugging**: TypeScript API issues resolved through incremental fixes
- **Focus effort**: Invest time in primary library capabilities, keep fallback simple

## Task Complexity & Time Estimation Patterns
- **MEDIUM tasks (45-60 min)**: Multi-component integration with existing architecture + new functionality
- **Pattern-scout value**: Discovering existing foundations (ImageProcessor factory) reduces complexity significantly  
- **Success indicators**: Auto-upscaling (521×475 → 2808×2560), DPI correction, comprehensive validation integration
- **Estimation accuracy**: Building on solid foundations enables accurate time predictions

## Comprehensive Feature Implementation Success Pattern
- **Foundation analysis**: Use pattern-scout to identify existing architecture before starting
- **Progressive enhancement**: Build advanced features on proven patterns (ImageProcessor factory)
- **Multiple validation layers**: File validation → processing → output validation → reporting
- **Mock mode integration**: Ensure all new features work with existing --mock/--dry-run patterns

## Advanced Mock Mode Implementation Patterns
- **Structured reporting interfaces**: Use comprehensive interfaces (MockValidationResult, MockFileInfo, MockPublishingStep) for maintainable reports
- **Real validation in mock mode**: Run actual validation functions without side effects for authentic preview results
- **Dual output modes**: Provide both visual console output (colored, icons) AND programmatic JSON reports
- **File analysis depth**: Include size, format detection, existence checks, and "would be generated" status
- **Workflow simulation**: Add timing estimates, dependency tracking, and step-by-step preview
- **Mock result generation**: Create realistic mock data (ASINs, URLs, marketplaces) based on validation state

## Mock Mode Infrastructure Leverage Pattern
```typescript
// From MockReporter utility pattern - building on existing mock service patterns
const mockMode = options.dryRun ? "dry-run" : "mock";
const reporter = new MockReporter(bookSlug, "kdp", mockMode);

// Use real validation functions in mock mode for authentic results
const coverValidation = await validateCover(coverPath);
reporter.addValidation("cover", {
  name: "Cover dimensions",
  status: coverValidation.isValid ? "pass" : "fail",
  message: coverValidation.summary.suggestions[0]
});

// Generate comprehensive workflow preview with timing
reporter.addWorkflowStep({
  step: "Manuscript Upload",
  description: "Upload EPUB file to KDP platform",
  status: "simulated",
  estimatedDuration: 45,
  dependencies: ["Cover Upload", "Metadata Validation"]
});
```

## Console Reporting Enhancement Patterns
- **Visual hierarchy**: Use chalk colors, icons (✓✗⚠), and section dividers for scannable output
- **Context preservation**: Include timestamps, book slug, platform, and mode in headers
- **Progressive disclosure**: Show summary first, then detailed breakdowns by category
- **Actionable feedback**: Convert validation failures into specific blocker/recommendation lists
- **Technical details**: Show file sizes, formats, paths, and timing for debugging context

## Mock Mode Testing Strategy
- **Service-level mocking consistency**: Build on existing KDP/Lulu service mock patterns
- **Flag handling alignment**: Ensure --mock and --dry-run flags work consistently across all commands  
- **Validation depth control**: Skip external dependencies (file uploads) while preserving business logic validation
- **Report persistence**: Save JSON reports for programmatic access and debugging

## Mock Mode Implementation Success Indicators
- **400+ line utility**: Comprehensive MockReporter utility providing structured reporting
- **Pattern consistency**: Aligns with existing CLI command patterns and service mocking
- **Authentic preview**: Real validation functions provide accurate publishing readiness assessment
- **Time estimation accuracy**: Workflow timing helps users understand publishing complexity
- **Dual interface**: Console display for users, JSON output for programmatic use

## E2E Testing Patterns for Publishing Workflows

### Pattern-Scout Driven Test Architecture
```typescript
// From apps/publisher/__tests__/publishing-workflow.test.ts
// Use pattern-scout to identify existing test patterns before implementation
// Leverage established structures: epubGeneration.integration.test.ts, e2e-pipeline.test.ts
// Follow Vitest mocking patterns from converter package

describe("Publishing Workflow E2E", () => {
  // Comprehensive scenario coverage: success, failures, edge cases
  const scenarios = [
    "successful workflow",
    "missing required files", 
    "validation failures",
    "rate limit handling",
    "service errors"
  ];
});
```

### Mock Service Implementation Pattern
```typescript
// Manual mock objects work better than vi.mock() for complex services
const mockRateLimiterService = {
  checkLimit: vi.fn(),
  recordUsage: vi.fn()
};

// Avoid vi.mock() for services with complex interfaces
// Use manual mock object creation for better control
vi.doMock('../path/to/service', () => ({ default: mockRateLimiterService }));
```

### MockReporter Validation Patterns
```typescript
// MockReporter blocker message format discovery
const blockerFormat = "${category}: ${validation.message || validation.name}";

// Expected blocker format in tests
expect(mockReporter.getBlockers()).toContain("Cover: Invalid cover dimensions");
expect(mockReporter.getBlockers()).toContain("Files: Missing manuscript file"); 

// Debug-driven test development - add logging to discover actual vs expected
console.log("Actual blockers:", mockReporter.getBlockers());
```

### File System Mocking for E2E Tests
```typescript
// Different failure scenarios need different fs mocking approaches
// fs.stat failure vs fs.access failure have different implications
vi.spyOn(fs, 'access').mockImplementation(async (path) => {
  if (path.includes('missing-file')) {
    throw new Error('ENOENT: no such file or directory');
  }
});

// Mock file system operations while preserving business logic validation
vi.spyOn(fs, 'stat').mockResolvedValue({ size: 1024 * 1024 });
```

### E2E Test Anti-Patterns to Avoid
- **vi.mock() overuse**: Complex services need manual mock objects for proper interface control
- **Incorrect test file naming**: Avoid patterns that conflict with vitest.config.ts excludes (e2e-* excluded)
- **Rigid regex expectations**: ASIN regex too restrictive (expected 9 chars, got 11) - use flexible patterns
- **Assumption-based testing**: Use debug output to discover actual format vs assumed format

### E2E Testing Success Indicators
- **Comprehensive scenarios**: 5+ test cases covering success + multiple failure modes
- **Mock integration**: Leverages existing MockReporter utility for structured validation
- **Pattern consistency**: Follows established Vitest mocking patterns from converter package
- **Debug-driven development**: Uses console.log to understand actual vs expected behavior
- **Time accuracy**: 45-minute implementation matches MEDIUM complexity estimation

### E2E Test Implementation Strategy
- **Start with pattern-scout**: Identify existing test structures before implementation
- **Incremental debugging**: Add debug logging when assertions fail to understand actual output
- **Mock comprehensively**: External dependencies (fs, services) while preserving business logic
- **Test realistically**: Validate complete workflow without external side effects
- **Follow naming conventions**: Avoid file patterns excluded by vitest configuration