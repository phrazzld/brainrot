# Automated Security Updates

**Status**: Active  
**Created**: 2025-08-27  
**Last Updated**: 2025-08-27

## Overview

The Brainrot Publishing House monorepo has automated security dependency update system that ensures critical security vulnerabilities are patched quickly and automatically without manual intervention.

## How It Works

### 1. Daily Security Scanning
- **Dependabot** runs daily security scans at 01:30-03:15 UTC
- Checks all packages across the monorepo for known security vulnerabilities
- Creates pull requests only for security fixes (ignoring feature/patch updates)

### 2. Automated Processing
- Security PRs are labeled with `security`, `dependencies`, and `auto-merge`
- **GitHub Actions** workflow detects security PRs automatically
- Waits for all CI checks (build, lint, typecheck, tests) to pass
- Automatically approves and enables auto-merge for passing updates

### 3. Safety Checks
- ✅ **CI Validation**: All tests must pass before merge
- ✅ **Build Verification**: Complete build success required
- ✅ **Type Safety**: TypeScript compilation must succeed
- ✅ **Linting**: Code quality checks must pass
- ✅ **Security Validation**: Post-merge monitoring active

## Configuration

### Dependabot Security Configuration

```yaml
# Daily security updates for all packages
- package-ecosystem: "npm"
  directory: "/"
  schedule:
    interval: "daily"
    time: "02:00"
  ignore:
    - dependency-name: "*"
      update-types: ["version-update:semver-minor", "version-update:semver-patch"]
  labels:
    - "security"
    - "dependencies"
    - "auto-merge"
```

### Covered Packages
- **Root monorepo**: Turborepo, pnpm, shared dependencies
- **Web app** (`/apps/web`): Next.js, React, web-specific packages
- **Publisher CLI** (`/apps/publisher`): Playwright, CLI-specific packages
- **All @brainrot packages**: converter, blob-client, metadata, types, templates
- **GitHub Actions**: Workflow dependencies
- **Docker**: Container dependencies

### Schedule
- **01:30 UTC**: GitHub Actions security updates
- **02:00 UTC**: Root monorepo security updates  
- **02:15 UTC**: Web app security updates
- **02:30 UTC**: Publisher CLI security updates
- **02:45 UTC**: Converter package security updates
- **03:00 UTC**: Blob client security updates
- **03:15 UTC**: Metadata package security updates

## Security Update Types

### Automatically Merged
- ✅ **Critical vulnerabilities**: CVSS score 9.0+
- ✅ **High vulnerabilities**: CVSS score 7.0-8.9
- ✅ **Security patches**: Direct dependency fixes
- ✅ **Transitive security fixes**: Indirect dependency updates

### Manual Review Required
- ⚠️ **Breaking changes**: Major version updates with security fixes
- ⚠️ **Failed CI**: Updates that break tests or builds
- ⚠️ **Complex changes**: Updates affecting core functionality
- ⚠️ **Multiple vulnerabilities**: Large batch updates requiring review

## Monitoring & Alerts

### Automated Notifications
- **GitHub PRs**: Automatic comments on security update status
- **CI Integration**: Build status and test results tracked
- **Merge Notifications**: Confirmation when security updates are applied

### Manual Monitoring
- **Daily Review**: Check GitHub security tab for new vulnerabilities
- **Weekly Summary**: Review merged security updates
- **Monthly Audit**: Comprehensive security dependency review

### Monitoring Commands
```bash
# Check for security vulnerabilities
pnpm audit

# Check GitHub security alerts
gh api repos/phrazzld/brainrot/vulnerability-alerts

# Review recent security merges
gh pr list --label security --state closed --limit 10
```

## Troubleshooting

### Security Update Blocked
If a security update fails to auto-merge:

1. **Check CI Status**
   ```bash
   gh pr checks [PR-NUMBER]
   ```

2. **Review Failed Tests**
   ```bash
   gh pr view [PR-NUMBER] --json statusCheckRollupState
   ```

3. **Manual Intervention**
   - Fix failing tests if unrelated to security update
   - Approve manually if CI issues are pre-existing
   - Merge manually after verification

### Override Auto-merge
To prevent a security update from auto-merging:

1. **Remove labels**:
   ```bash
   gh pr edit [PR-NUMBER] --remove-label "auto-merge"
   ```

2. **Add manual review label**:
   ```bash
   gh pr edit [PR-NUMBER] --add-label "manual-review-required"
   ```

### Emergency Security Response
For critical zero-day vulnerabilities:

1. **Manual Priority Merge**
   ```bash
   # Override normal CI requirements if necessary
   gh pr merge [PR-NUMBER] --admin --squash
   ```

2. **Immediate Deployment**
   ```bash
   # Force production deployment
   cd apps/web && npx vercel --prod --yes
   ```

3. **Post-merge Validation**
   ```bash
   # Verify security fix is active
   ./scripts/health-check-production.sh
   ```

## Configuration Management

### Disable Automated Security Updates
To temporarily disable automated security updates:

```bash
# Rename the workflow to disable
mv .github/workflows/auto-merge-security.yml .github/workflows/auto-merge-security.yml.disabled
```

### Modify Security Criteria
Edit `.github/dependabot.yml` to adjust:
- Update frequency (daily → weekly)
- Package scope (add/remove directories)
- Update types (include/exclude certain vulnerability types)

### Custom Security Labels
Add custom labels for different security update types:
- `critical-security`: CVSS 9.0+ (immediate merge)
- `high-security`: CVSS 7.0-8.9 (fast merge)
- `medium-security`: CVSS 4.0-6.9 (standard process)

## Best Practices

### Development Workflow
1. **Monitor Security Alerts**: Check GitHub security tab weekly
2. **Review Auto-merges**: Verify security updates were applied correctly
3. **Test After Updates**: Run comprehensive tests after security patches
4. **Update Documentation**: Keep security docs current with changes

### Production Safety
1. **Staged Rollout**: Security updates deploy to staging first
2. **Monitoring**: Enhanced monitoring for 24h after security patches
3. **Rollback Ready**: Immediate rollback procedures documented
4. **Communication**: Team notifications for critical security updates

### Dependency Management
1. **Pin Critical Deps**: Pin versions for security-critical dependencies
2. **Minimal Dependencies**: Reduce attack surface by minimizing deps
3. **Regular Audits**: Monthly comprehensive dependency security review
4. **Documentation**: Keep dependency rationale documented

## Security Metrics

### Key Performance Indicators
- **Mean Time to Patch (MTTP)**: Target <24 hours for critical vulnerabilities
- **Auto-merge Success Rate**: Target >95% for security updates
- **False Positive Rate**: Target <5% for security notifications
- **Coverage**: 100% of production dependencies monitored

### Reporting
- **Daily**: Automated security scan results
- **Weekly**: Security update summary report  
- **Monthly**: Comprehensive security dependency audit
- **Quarterly**: Security automation effectiveness review

## Integration Points

### CI/CD Pipeline
- **Build Integration**: Security updates trigger full CI pipeline
- **Test Coverage**: Security patches verified by existing test suite
- **Deployment**: Auto-deployment to staging, manual to production

### Monitoring Systems
- **Vercel Analytics**: Performance impact monitoring
- **GitHub Security**: Vulnerability tracking and management
- **Custom Monitoring**: Production health checks post-update

### Notification Channels
- **GitHub**: Pull request comments and notifications
- **Email**: Critical security update alerts
- **Slack** (future): Team security update notifications

## Related Documentation

- [Production Deployment Plan](./PRODUCTION_DEPLOYMENT_PLAN.md) - Deployment procedures
- [Security Guide](./SECURITY.md) - General security practices
- [Monitoring Setup](./MONITORING.md) - System monitoring and alerting
- [GitHub Actions Secrets](./GITHUB_ACTIONS_SECRETS.md) - CI/CD configuration

## Emergency Contacts

- **Primary Maintainer**: Drew Moodie (phrazzld)
- **Security Issues**: GitHub Security Advisories
- **Critical Updates**: Manual override procedures documented above

---

**Remember**: Automated security updates are a critical security measure. Disabling or bypassing them should only be done with careful consideration and temporary duration.

**This documentation is living** - Update based on operational experience and changing security requirements.