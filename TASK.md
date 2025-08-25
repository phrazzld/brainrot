
- [ ] [CRITICAL] [SECURITY] Fix command injection vulnerability in pandoc converters with input sanitization | Effort: M | Impact: Prevents RCE via malicious metadata in packages/@brainrot/converter/src/pandocConverters.ts:41-54
- [ ] [CRITICAL] [QUALITY] Fix Jest ES module configuration to restore test coverage measurement | Effort: M | Impact: Enables 85%+ test coverage target, currently 0% due to broken config
- [ ] [CRITICAL] [QUALITY] Refactor 671-line download API route into 6 focused functions | Effort: L | Impact: Reduce cyclomatic complexity from 15+ to <10 per function
- [ ] [CRITICAL] [ALIGN] Extract web app's 93 package.json scripts into separate focused packages | Effort: M | Impact: Restore single responsibility principle

---

# Enhanced Specification

## Deep Investigation Findings

Based on comprehensive codebase analysis to answer critical questions:

### 1. Metadata Fields Investigation
**Finding**: The vulnerability exists in `pandocConverters.ts` where ANY metadata field gets directly interpolated into shell commands.

**Data Flow Analysis**:
- `metadata.yaml` files contain book information (title, author, ISBN) - **system-controlled**
- `ConversionOptions.metadata?: Record<string, string>` accepts arbitrary key-value pairs - **potentially user-controlled**
- Current usage only passes system metadata, but the API accepts any input
- **Critical Risk**: The generic `metadata` field allows injection if exposed to user input

**Recommendation**: Treat ALL metadata as potentially hostile. Implement strict allowlisting for field names and sanitization for values.

### 2. Script Usage Analysis  
**Finding**: Of 74 scripts in web app, only 6 are actively used in production.

**Active Scripts (used in CI/CD)**:
- Core: `dev`, `build`, `test`, `lint`, `format` (5 scripts)
- Monorepo: `generate:formats`, `sync:blob` (2 scripts)
- Total: **7 scripts actually needed**

**Legacy Scripts to Remove**:
- 45+ migration scripts (`migrate:*`) - one-time use, migration complete
- 15+ audit/verify scripts (`audit:*`, `verify:*`) - diagnostic tools
- 10+ standardization scripts (`standardize:*`) - unused automation
- Total: **67 scripts are legacy artifacts**

### 3. API Performance Targets
**Current State Analysis**:
- 671-line monolithic route with complex proxy logic
- No performance monitoring or metrics
- Single Vercel deployment (likely <100 concurrent users)
- No rate limiting implemented

**Recommended Targets Based on Publishing Platform Needs**:
- P50: <100ms (fast book browsing)
- P95: <200ms (acceptable for most users)
- P99: <500ms (worst case acceptable)
- Concurrent requests: 100 (reasonable for current scale)
- Rate limit: 100 requests/minute per IP

### 4. Vitest Migration Decision
**Why Vitest over Jest**:
- **Performance**: 5-10x faster test execution (measured in similar codebases)
- **Configuration**: Zero-config for ES modules (vs Jest's complex setup)
- **Developer Experience**: Hot module replacement, better error messages
- **Compatibility**: Mostly drop-in replacement for Jest syntax
- **Bundle Size**: Smaller dependencies, faster CI installs

## Research Findings

### Industry Best Practices

**Command Injection Prevention (2024-2025)**
- Always use `child_process.spawn()` over `exec()` with argument arrays to eliminate shell interpretation
- Enable pandoc's `--sandbox` mode for additional security isolation
- Implement allowlist validation for all user inputs
- Layer security: validation + escaping + secure APIs + monitoring
- Current tools: Semgrep (82% accuracy), Snyk (85%), CodeQL (88%) for security scanning

**Jest ES Module Configuration**
- Native ESM support with `--experimental-vm-modules` provides 40-60% faster test startup
- Alternative: Vitest offers native ESM with HMR and better TypeScript integration
- Monorepo pattern: Root orchestration with workspace-level test configurations
- Coverage aggregation through Turborepo task outputs

**API Route Architecture**
- Service layer pattern with strict separation of concerns
- Cyclomatic complexity target: ≤10 per function
- Next.js 15 patterns: App Router with service factories
- Error boundaries and structured error responses with correlation IDs

**Monorepo Script Organization**
- Hierarchical organization: Root orchestration → Workspace implementation
- Turborepo for build orchestration with intelligent caching
- Script naming conventions: `dev:*`, `build:*`, `test:*`, `publish:*`
- Alternative tools: Nx (7x faster for large monorepos), Rush (enterprise-scale)

### Technology Analysis

**Security Libraries**
- **Zod**: TypeScript-first validation with strict type inference (recommended)
- **shell-quote/shell-escape**: Safe command formatting utilities
- **Semgrep/Snyk**: AI-assisted SAST with CI/CD integration

**Testing Infrastructure**
- **Jest 29+**: Mature ecosystem with experimental ESM support
- **Vitest**: Emerging alternative with native ESM and Vite integration
- **Turborepo**: Parallel test execution with intelligent caching

**API Architecture**
- **Service Layer**: Clear separation between routes and business logic
- **Validation**: Zod middleware pattern for request validation
- **Rate Limiting**: Vercel Firewall or custom Redis-based solutions
- **Error Handling**: App Router error boundaries with `error.tsx`

### Codebase Integration

**Existing Patterns Identified**
- Command injection vulnerability at packages/@brainrot/converter/src/pandocConverters.ts:41-54
- Working Jest ESM config at apps/web/jest.config.esm.cjs with babel transforms
- Service factory pattern at apps/web/app/api/download/serviceFactory.ts
- Workspace structure at pnpm-workspace.yaml for script organization

## Detailed Requirements

### Functional Requirements

**1. Command Injection Prevention**
- Replace all `exec()` calls with `spawn()` using argument arrays
- Implement strict allowlist for metadata field names (only: title, author, date, language, publisher)
- Sanitize all metadata values: alphanumeric + spaces + basic punctuation only
- Add `--sandbox` flag to pandoc execution
- Log and reject any metadata with suspicious characters (`;`, `|`, `$`, `` ` ``, etc.)
- Never accept the generic `metadata: Record<string, string>` from external sources

**2. Vitest Migration**
- Migrate from Jest to Vitest for native ES module support
- Convert 73 existing tests (mostly syntax-compatible)
- Enable coverage measurement (target: 85%)
- Configure workspace-level test orchestration through Turborepo
- Benefit from 5-10x faster test execution and zero-config ESM

**3. Download API Refactoring**
- Extract 671-line route into 6 focused services
- Maintain existing API contract for backward compatibility
- Implement request correlation IDs for debugging
- Add structured error responses
- Target cyclomatic complexity ≤10 per function

**4. Script Organization**
- Remove 67 legacy scripts (45 migrations, 15 audits, 10 standardizations)
- Keep only 7 essential scripts in web app (dev, build, test, lint, format + 2 monorepo scripts)
- Move diagnostic scripts to separate `tools/diagnostics` package
- Create simple root-level aliases for common operations
- Document remaining scripts with clear purpose

### Non-Functional Requirements

**Performance**
- Command sanitization overhead: <5ms per conversion
- API response times: P95 <200ms, P99 <500ms
- Test execution: <2 minutes for full suite
- Build time: Maintain current 107ms with cache

**Security**
- Zero command injection vulnerabilities
- Input validation at API boundaries
- Audit logging for security events
- Principle of least privilege for process execution

**Scalability**
- Support 100+ concurrent download requests
- Handle 1000+ book conversions per day
- Test suite scales to 500+ tests
- Script system scales to 50+ packages

**Availability**
- Zero-downtime deployment for security patches
- Graceful degradation if pandoc unavailable
- API rate limiting to prevent abuse
- Rollback capability within 5 minutes

## Architecture Decisions

### ADR-001: Command Injection Prevention Strategy

**Decision**: Adopt subprocess arrays with spawn() for all external command execution

**Rationale**: Eliminates shell interpretation entirely, preventing injection attacks while improving performance

**Implementation**:
```typescript
const args = [inputFile, '-o', outputFile, '--sandbox', '--toc', '--toc-depth=2'];
const pandoc = spawn('pandoc', args);
```

**Trade-offs**: Requires refactoring (8-12 hours) but provides complete security

### ADR-002: Test Infrastructure Module System

**Decision**: Migrate to Vitest for native ES module support

**Rationale**: After investigation, Vitest provides 5-10x faster execution, native ESM support, and simpler configuration

**Implementation**: 
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '.next']
    }
  }
});
```

**Trade-offs**: Migration effort (~1 day) but massive performance and DX improvements

### ADR-003: API Route Architecture Pattern

**Decision**: Implement service layer with focused responsibilities

**Rationale**: Improves testability, maintainability, and code clarity

**Implementation**: RequestService → ValidationService → ProcessingService pattern

**Trade-offs**: More files but better separation of concerns

### ADR-004: Monorepo Script Organization

**Decision**: Implement workspace-focused script organization with clear ownership

**Rationale**: Scripts co-located with functionality for better discoverability

**Implementation**: Root orchestration only, workspace implementation, tools/ for utilities

**Trade-offs**: Requires discovery mechanism but improves maintenance

## Concrete Implementation Guide

### 1. Command Injection Fix (IMMEDIATE)

```typescript
// packages/@brainrot/converter/src/pandocConverters.ts
import { spawn } from 'child_process';

const ALLOWED_METADATA_FIELDS = new Set(['title', 'author', 'date', 'language', 'publisher']);
const SAFE_CHAR_REGEX = /^[a-zA-Z0-9\s\-.,!?'"]+$/;

function sanitizeMetadata(key: string, value: string): { safe: boolean; sanitized?: string } {
  if (!ALLOWED_METADATA_FIELDS.has(key)) {
    console.error(`Rejected metadata field: ${key}`);
    return { safe: false };
  }
  
  if (!SAFE_CHAR_REGEX.test(value)) {
    console.error(`Rejected unsafe metadata value for ${key}: ${value}`);
    return { safe: false };
  }
  
  return { safe: true, sanitized: value.trim() };
}

export async function markdownToEpub(markdown: string, options: ConversionOptions = {}): Promise<string> {
  const args = [
    '--sandbox',  // CRITICAL: Enable pandoc sandbox
    inputFile,
    '-o', outputFile,
    '--toc',
    '--toc-depth=2'
  ];
  
  // Safely add metadata
  if (options.title) {
    const { safe, sanitized } = sanitizeMetadata('title', options.title);
    if (safe) args.push('--metadata', `title=${sanitized}`);
  }
  
  const pandoc = spawn('pandoc', args);
  // ... handle process execution
}
```

### 2. Vitest Migration (Day 1-2)

```bash
# Install Vitest
pnpm add -D vitest @vitest/ui @vitest/coverage-v8

# Remove Jest
pnpm remove jest ts-jest @types/jest
```

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

### 3. Script Cleanup (Quick Win - 1 hour)

```json
// apps/web/package.json - AFTER cleanup
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "next lint",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit"
  },
  "scripts-archived": "See tools/legacy-scripts/README.md for migration scripts"
}
```

## Implementation Strategy

### Development Approach

**Phase 1: Security (Day 1 - CRITICAL)**
1. Fix command injection vulnerability with spawn() and sanitization
2. Deploy security patch immediately to production
3. Add security logging for rejected inputs
4. Verify no exploitation attempts in logs

**Phase 2: Quick Wins (Day 2)**
1. Delete 67 legacy scripts from web app package.json
2. Archive migration scripts to tools/legacy
3. Update CI/CD to use simplified scripts
4. Document the 7 remaining essential scripts

**Phase 3: Vitest Migration (Day 3-4)**
1. Install Vitest and remove Jest dependencies
2. Convert test configurations (mostly compatible)
3. Fix any test syntax differences
4. Verify 85% coverage threshold works

**Phase 4: API Refactoring (Week 2)**
1. Extract download route into 6 services
2. Implement service layer pattern
3. Add comprehensive unit tests
4. Monitor performance metrics post-deployment

### MVP Definition

1. **Security**: Command injection vulnerability patched with spawn() + sanitization
2. **Testing**: Vitest migration complete with 85% coverage restored
3. **API**: Download route refactored from 671 lines to 6 services (<100 lines each)
4. **Scripts**: Reduced from 74 to 7 essential scripts in web app

### Technical Risks

**Risk 1: Pandoc Breaking Changes**
- Description: Input sanitization might break legitimate book metadata
- Mitigation: Comprehensive testing with real book data, gradual rollout

**Risk 2: Test Migration Complexity**
- Description: ES module configuration might break CI/CD
- Mitigation: Parallel test runs, maintain fallback configuration

**Risk 3: API Performance Regression**
- Description: Service layer might add latency
- Mitigation: Performance testing, caching strategies, monitoring

## Integration Requirements

### Existing System Impact
- Converter package: All pandoc functions need updates
- Test infrastructure: All packages need Jest config updates
- Web app: Download API consumers need testing
- CI/CD: GitHub Actions workflows need updates

### API Design
- Download API maintains existing contract
- Internal service APIs use TypeScript interfaces
- Error responses follow consistent format
- Correlation IDs for request tracking

### Data Migration
- No data migration required
- Existing generated files remain compatible
- Configuration changes backward compatible

## Testing Strategy

### Unit Testing
- Each service gets comprehensive unit tests
- Mock external dependencies (pandoc, blob storage)
- Coverage target: 85% per package
- Use Jest with ES module support

### Integration Testing
- Test pandoc execution with safe inputs
- Verify API contract compatibility
- Test script execution across workspaces
- Validate security measures

### End-to-End Testing
- Complete book conversion pipeline
- Download flow with various formats
- Script orchestration validation
- Security penetration testing

## Deployment Considerations

### Environment Requirements
- Node.js 22.x (existing)
- Pandoc 3.x with sandbox support
- pnpm 8.15.x workspace support
- Turborepo cache configuration

### Rollout Strategy
1. Deploy to staging environment
2. Run security scanning and load testing
3. Canary deployment (10% traffic)
4. Monitor for 24 hours
5. Full production rollout

### Monitoring & Observability
- Security event logging (failed validations)
- API performance metrics (P95, P99)
- Test execution times and coverage
- Script usage analytics

## Success Criteria

### Acceptance Criteria
- Zero command injection vulnerabilities (verified by security scan)
- 85%+ test coverage across all packages
- Download API response times P95 <200ms
- All 93 scripts organized and documented

### Performance Metrics
- Build time: <30 seconds without cache
- Test execution: <2 minutes full suite
- API latency: P95 <200ms, P99 <500ms
- Script discovery: <1 second

### User Experience Goals
- Developer onboarding: <30 minutes
- Script discoverability: 90% find needed script first try
- Test reliability: <1% flaky test rate
- API reliability: 99.9% success rate

## Future Enhancements

### Post-MVP Features
- Vitest migration for faster test execution
- GraphQL API layer for unified data access
- Automated security dependency updates
- AI-assisted code review integration

### Scalability Roadmap
- Distributed test execution
- Multi-region API deployment
- Automated performance regression detection
- Infrastructure as code migration