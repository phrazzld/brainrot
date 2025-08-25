# Brainrot Publishing House Critical Improvements TODO

Generated from TASK.md on 2025-08-24

## 🚨 Critical Path Items (Must complete in order)

### IMMEDIATE SECURITY FIX

- [ ] Fix command injection vulnerability in pandoc converters
  - **File**: `packages/@brainrot/converter/src/pandocConverters.ts:41-54`
  - **Success criteria**: 
    - Replace all `exec()` calls with `spawn()` using argument arrays
    - Implement `sanitizeMetadata()` function with allowlist (title, author, date, language, publisher)
    - Add `--sandbox` flag to all pandoc executions
    - Reject metadata with shell metacharacters (`;`, `|`, `$`, `` ` ``, etc.)
  - **Dependencies**: None
  - **Estimated complexity**: COMPLEX (8-12 hours)
  - **Testing**: Create security test suite to verify injection attempts are blocked

- [ ] Deploy security patch to production
  - **Success criteria**: 
    - Production deployment successful
    - Security logs show rejected malicious inputs working
    - No exploitation attempts in production logs
    - Rollback plan documented and tested
  - **Dependencies**: Command injection fix complete
  - **Estimated complexity**: SIMPLE (1 hour)
  - **Verification**: Monitor logs for 24 hours post-deployment

## 🔄 Parallel Work Streams

### Stream A: Legacy Script Cleanup (Can start immediately)

- [ ] Remove 67 legacy scripts from web app package.json
  - **File**: `apps/web/package.json`
  - **Success criteria**: 
    - Delete 45 migration scripts (`migrate:*`)
    - Delete 15 audit/verify scripts (`audit:*`, `verify:*`)
    - Delete 10 standardization scripts (`standardize:*`)
    - Keep only 7 essential scripts: `dev`, `build`, `test`, `lint`, `format`, `typecheck`
  - **Dependencies**: None - can start immediately
  - **Estimated complexity**: SIMPLE (1 hour)
  - **Backup**: Save current package.json before cleanup

- [ ] Archive migration scripts to tools/legacy-scripts
  - **Success criteria**: 
    - Create `tools/legacy-scripts/` directory
    - Move migration script files from `apps/web/scripts/`
    - Create README.md documenting what each script did
    - Update package.json with reference to archived location
  - **Dependencies**: Script removal complete
  - **Estimated complexity**: SIMPLE (2 hours)

- [ ] Update CI/CD workflows for simplified scripts
  - **Files**: `.github/workflows/*.yml`
  - **Success criteria**: 
    - All GitHub Actions use new simplified script names
    - CI/CD pipelines pass with reduced script set
    - Remove references to deleted scripts
  - **Dependencies**: Script removal complete
  - **Estimated complexity**: SIMPLE (1 hour)

### Stream B: Vitest Migration (After security deployed)

- [ ] Install Vitest and remove Jest
  - **Success criteria**: 
    - Run: `pnpm add -D vitest @vitest/ui @vitest/coverage-v8`
    - Run: `pnpm remove jest ts-jest @types/jest babel-jest`
    - No dependency conflicts
    - Build still works
  - **Dependencies**: Security patch deployed
  - **Estimated complexity**: SIMPLE (30 minutes)

- [ ] Create Vitest configuration for monorepo
  - **File**: Create `vitest.config.ts` in root
  - **Success criteria**: 
    - Configuration matches provided template in TASK.md
    - Coverage thresholds set to 85%
    - ES modules work without transforms
    - Workspace packages properly resolved
  - **Dependencies**: Vitest installed
  - **Estimated complexity**: MEDIUM (3-4 hours)
  - **Template**: Use configuration from TASK.md lines 293-319

- [ ] Convert test files from Jest to Vitest syntax
  - **Files**: All `*.test.ts` files (73 tests across 4 suites)
  - **Success criteria**: 
    - Replace `jest.fn()` with `vi.fn()`
    - Update mock syntax if needed
    - All 73 tests pass with Vitest
    - Coverage reporting works
  - **Dependencies**: Vitest configured
  - **Estimated complexity**: MEDIUM (4-6 hours)
  - **Note**: Most syntax is compatible, focus on mocking differences

- [ ] Update test scripts and package.json
  - **Success criteria**: 
    - Replace `"test": "jest"` with `"test": "vitest"`
    - Add `"test:coverage": "vitest run --coverage"`
    - Update all workspace package.json files
    - Remove Jest configuration files
  - **Dependencies**: Tests passing with Vitest
  - **Estimated complexity**: SIMPLE (1 hour)

- [ ] Update GitHub Actions for Vitest
  - **File**: `.github/workflows/ci.yml`
  - **Success criteria**: 
    - CI uses Vitest for test runs
    - Coverage reporting works in CI
    - Test execution time reduced by 5-10x
  - **Dependencies**: Vitest working locally
  - **Estimated complexity**: SIMPLE (1 hour)

### Stream C: API Refactoring (After Vitest migration)

- [ ] Create service layer structure
  - **Directory**: `apps/web/app/api/download/services/`
  - **Success criteria**: 
    - Create 6 service files:
      1. `RequestService.ts` - correlation IDs, logging
      2. `ValidationService.ts` - parameter validation
      3. `AuthorizationService.ts` - access control
      4. `AssetService.ts` - asset resolution
      5. `ProxyService.ts` - stream handling (exists)
      6. `ResponseService.ts` - response formatting
  - **Dependencies**: Vitest migration complete
  - **Estimated complexity**: SIMPLE (2 hours)

- [ ] Extract request initialization logic
  - **From**: `apps/web/app/api/download/route.ts` lines 1-150
  - **To**: `RequestService.ts`
  - **Success criteria**: 
    - Extract correlation ID generation
    - Extract logging setup
    - Extract header processing
    - Service is <100 lines
    - Cyclomatic complexity <10
  - **Dependencies**: Service structure created
  - **Estimated complexity**: MEDIUM (3 hours)

- [ ] Extract validation logic
  - **From**: `apps/web/app/api/download/route.ts` lines 151-300
  - **To**: `ValidationService.ts`
  - **Success criteria**: 
    - Extract parameter validation
    - Extract slug/chapter validation
    - Create ValidationResult type
    - Service is <100 lines
  - **Dependencies**: Request service complete
  - **Estimated complexity**: MEDIUM (3 hours)

- [ ] Extract remaining business logic
  - **From**: `apps/web/app/api/download/route.ts` lines 301-671
  - **To**: Appropriate services
  - **Success criteria**: 
    - Asset resolution in AssetService
    - Response formatting in ResponseService
    - Main route handler <50 lines
    - Each service <100 lines
  - **Dependencies**: Validation service complete
  - **Estimated complexity**: MEDIUM (4 hours)

- [ ] Write unit tests for each service
  - **Success criteria**: 
    - Each service has dedicated test file
    - 90%+ coverage per service
    - Mock external dependencies
    - Tests run in <10 seconds
  - **Dependencies**: All services extracted
  - **Estimated complexity**: SIMPLE (3 hours)

- [ ] Add integration tests for API contract
  - **Success criteria**: 
    - Test existing API endpoints still work
    - Test error responses unchanged
    - Test performance meets targets (P95 <200ms)
    - Backward compatibility verified
  - **Dependencies**: Unit tests complete
  - **Estimated complexity**: SIMPLE (2 hours)

## 🧪 Testing & Validation

- [ ] Create security test suite for command injection
  - **File**: `packages/@brainrot/converter/src/pandocConverters.security.test.ts`
  - **Success criteria**: 
    - Test rejection of shell metacharacters
    - Test allowlist enforcement
    - Test safe metadata passes through
    - Test --sandbox flag is present
  - **Dependencies**: Security fix implemented
  - **Estimated complexity**: SIMPLE (2 hours)

- [ ] Performance baseline measurement
  - **Success criteria**: 
    - Measure current API P50/P95/P99 latencies
    - Document baseline metrics
    - Set up monitoring for post-refactor comparison
  - **Dependencies**: None
  - **Estimated complexity**: SIMPLE (1 hour)

- [ ] End-to-end conversion pipeline test
  - **Success criteria**: 
    - Test complete book conversion with new security measures
    - Test all output formats (text, epub, pdf)
    - Verify no functionality broken
  - **Dependencies**: All changes complete
  - **Estimated complexity**: SIMPLE (2 hours)

## 📝 Documentation & Cleanup

- [ ] Document security fix and best practices
  - **File**: `docs/SECURITY.md`
  - **Success criteria**: 
    - Document command injection prevention approach
    - Provide examples of safe vs unsafe patterns
    - Add security checklist for future changes
  - **Dependencies**: Security fix deployed
  - **Estimated complexity**: SIMPLE (1 hour)

- [ ] Update README with new test commands
  - **Success criteria**: 
    - Document Vitest usage
    - Update test coverage commands
    - Add migration notes from Jest
  - **Dependencies**: Vitest migration complete
  - **Estimated complexity**: SIMPLE (30 minutes)

- [ ] Document simplified script structure
  - **File**: Update root and web app README files
  - **Success criteria**: 
    - List 7 essential scripts with descriptions
    - Reference archived scripts location
    - Explain script organization philosophy
  - **Dependencies**: Script cleanup complete
  - **Estimated complexity**: SIMPLE (1 hour)

- [ ] Code review and final cleanup
  - **Success criteria**: 
    - No linting errors
    - All tests passing
    - Coverage >85%
    - Performance targets met
    - Security scan clean
  - **Dependencies**: All implementation complete
  - **Estimated complexity**: SIMPLE (2 hours)

## 🚀 Deployment & Monitoring

- [ ] Staging deployment and testing
  - **Success criteria**: 
    - All changes deployed to staging
    - Run security scanner (Semgrep/Snyk)
    - Load testing shows no regression
    - All features working
  - **Dependencies**: All implementation complete
  - **Estimated complexity**: SIMPLE (2 hours)

- [ ] Production deployment plan
  - **Success criteria**: 
    - Deployment runbook created
    - Rollback plan documented
    - Monitoring alerts configured
    - Team notified of deployment
  - **Dependencies**: Staging testing complete
  - **Estimated complexity**: SIMPLE (1 hour)

- [ ] Post-deployment monitoring
  - **Success criteria**: 
    - Monitor for 24 hours
    - Check security logs for attempts
    - Verify performance metrics
    - No errors in production
  - **Dependencies**: Production deployment
  - **Estimated complexity**: SIMPLE (ongoing)

## 📊 Success Metrics

### Completion Criteria
- ✅ Zero command injection vulnerabilities (verified by security scan)
- ✅ Test execution time reduced by 5-10x with Vitest
- ✅ Download API maintains P95 <200ms, P99 <500ms
- ✅ Scripts reduced from 74 to 7 in web app
- ✅ 85%+ test coverage across all packages
- ✅ All 73 existing tests passing
- ✅ No breaking changes to API contract

### Timeline Estimate
- **Day 1**: Security fix + deployment (CRITICAL)
- **Day 2**: Script cleanup + archive (Quick win)
- **Day 3-4**: Vitest migration
- **Week 2**: API refactoring + testing
- **Total**: 6-8 working days with 2-3 developers

## 🔮 Future Enhancements (BACKLOG.md candidates)

- [ ] Add rate limiting to download API (100 req/min per IP)
- [ ] Implement correlation ID tracking across all services
- [ ] Add OpenTelemetry instrumentation for observability
- [ ] Create performance regression detection in CI
- [ ] Migrate remaining Jest configs in other packages to Vitest
- [ ] Add automated security dependency updates
- [ ] Implement API versioning strategy
- [ ] Create developer onboarding documentation

---

*Note: Start with the CRITICAL security fix immediately. Streams A and B can proceed in parallel after security is deployed. Stream C should wait until testing infrastructure is stable.*