# Production Deployment Plan

**Project**: Brainrot Publishing House Monorepo  
**Document Version**: 1.0  
**Created**: 2025-08-27  
**Last Updated**: 2025-08-27  
**Risk Level**: LOW (Post-Security-Patch)

## Executive Summary

This document provides the comprehensive production deployment plan for the Brainrot Publishing House monorepo. The system is currently 95% complete with security patches deployed and all critical functionality verified.

## Current Production Status ✅

- **Production URL**: https://www.brainrotpublishing.com
- **Status**: LIVE and STABLE
- **Last Deployment**: August 2025 (security patches active)
- **Performance**: Homepage loads in ~150ms average
- **Security**: All vulnerabilities patched, malicious parameter rejection working

## Pre-Deployment Checklist

### 1. Code Quality Gates
```bash
# Run all quality checks before deployment
pnpm install                    # Fresh dependencies
pnpm build                      # Verify build succeeds
pnpm test:run                   # All tests passing
pnpm lint                       # No linting errors
pnpm typecheck                 # TypeScript compilation clean
pnpm audit                     # No security vulnerabilities
```

### 2. Security Validation
- [ ] All environment variables secured in Vercel dashboard
- [ ] No secrets committed to Git repository
- [ ] Security patches applied and tested
- [ ] Malicious parameter rejection tested
- [ ] Command injection protections active

### 3. Performance Baseline
- [ ] Homepage loads in <300ms
- [ ] API responses in <500ms (P95)
- [ ] Build time under 20 seconds
- [ ] Test suite completes in <30 seconds

## Deployment Procedures

### Standard Production Deployment

#### Automatic Deployment (Recommended)
```bash
# Push to master branch triggers automatic deployment
git checkout master
git merge feature-branch
git push origin master

# Monitor deployment in Vercel dashboard
# https://vercel.com/moomooskycow/brainrot-publishing-house
```

#### Manual CLI Deployment (If needed)
```bash
# From project root
cd apps/web
npx vercel --prod --yes

# Verify deployment
curl -I https://www.brainrotpublishing.com
```

#### Emergency Hotfix Deployment
```bash
# For critical security fixes
git checkout master
git cherry-pick [security-fix-commit]
git push origin master

# Monitor immediately for successful deployment
```

### Post-Deployment Verification

#### Automated Health Checks
```bash
# Run comprehensive health check script
./scripts/health-check-production.sh

# Key verifications:
# - Homepage responds with 200
# - API endpoints return expected status codes
# - Security parameter validation working
# - Performance within acceptable ranges
```

#### Manual Verification Checklist
- [ ] Homepage loads correctly
- [ ] Explore page functional
- [ ] Navigation working
- [ ] Security measures active (test malicious parameters)
- [ ] Performance acceptable (<300ms homepage)
- [ ] No console errors in browser
- [ ] SEO metadata rendering properly

## Monitoring & Alerting

### Immediate Monitoring (First 30 minutes)
```bash
# Monitor deployment logs
vercel logs --prod --follow

# Check application health every 5 minutes
watch -n 300 "curl -I https://www.brainrotpublishing.com"

# Monitor for errors
tail -f /var/log/deployment.log
```

### Extended Monitoring (24 hours)

#### Performance Metrics
- **Homepage Load Time**: Target <300ms, Alert >500ms
- **API Response Time**: Target <200ms, Alert >500ms
- **Error Rate**: Target <0.1%, Alert >1%
- **Uptime**: Target 99.9%, Alert <99%

#### Security Monitoring
- **Malicious Parameter Attempts**: Log and alert on attempts
- **Command Injection Tests**: Verify rejected (400/500 response)
- **Unusual Traffic Patterns**: Monitor for suspicious activity
- **Security Header Validation**: Verify HTTPS, CSP headers

### Vercel Dashboard Monitoring
- **Functions**: Monitor serverless function performance
- **Analytics**: Track user engagement and performance
- **Deployments**: Ensure no failed deployments
- **Logs**: Check for application errors or warnings

## Rollback Procedures

### Quick Rollback Decision Matrix

| Severity | Response Time | Action |
|----------|---------------|---------|
| **Critical** (Site down, data loss) | <15 minutes | Immediate rollback |
| **Major** (Functionality broken) | <1 hour | Planned rollback |
| **Minor** (Cosmetic issues) | <4 hours | Fix forward |

### Automated Rollback
```bash
# Rollback to previous deployment in Vercel dashboard
# Or via CLI:
vercel rollback [deployment-url] --prod

# Verify rollback successful
curl -I https://www.brainrotpublishing.com
```

### Manual Rollback (Emergency)
```bash
# Revert to last known good commit
git log --oneline -10  # Find last good commit
git revert [bad-commit-hash]
git push origin master

# Force deployment if needed
cd apps/web && npx vercel --prod --yes
```

**Full rollback procedures**: See [MIGRATION_ROLLBACK_PLAN.md](./MIGRATION_ROLLBACK_PLAN.md)

## Team Notification Procedures

### Pre-Deployment Notification
```markdown
Subject: 🚀 Production Deployment Scheduled - Brainrot Publishing House

Team,

Deploying to production:
- **When**: [DATE/TIME]
- **Changes**: [BRIEF DESCRIPTION]
- **Risk Level**: [LOW/MEDIUM/HIGH]
- **Expected Downtime**: [NONE/BRIEF]
- **Rollback Plan**: Available if needed

Monitor: https://www.brainrotpublishing.com
Dashboard: https://vercel.com/moomooskycow/brainrot-publishing-house

Will update when complete.
```

### Post-Deployment Notification
```markdown
Subject: ✅ Production Deployment Complete - Brainrot Publishing House

Team,

Deployment successful:
- **Deployed**: [TIMESTAMP]
- **Status**: All health checks passing
- **Performance**: [METRICS]
- **Issues**: [NONE/MINOR/DETAILS]

Site: https://www.brainrotpublishing.com
Monitoring continues for next 24 hours.
```

### Emergency Notification (If Rollback Needed)
```markdown
Subject: 🚨 ROLLBACK - Brainrot Publishing House Production

Team,

Initiating rollback:
- **Issue**: [DESCRIPTION]
- **Impact**: [USER IMPACT]
- **ETA**: [ROLLBACK TIME]
- **Status Page**: [IF AVAILABLE]

Will update every 15 minutes until resolved.
```

## Environment Configuration

### Production Environment Variables
```bash
# Required in Vercel dashboard
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT_URL=https://www.brainrotpublishing.com
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com
```

### GitHub Secrets (Already configured)
- `VERCEL_TOKEN`: Deployment automation
- `VERCEL_ORG_ID`: Organization identifier  
- `VERCEL_PROJECT_ID`: Project identifier
- `BLOB_READ_WRITE_TOKEN`: Content storage access

## Troubleshooting Guide

### Common Deployment Issues

#### Build Failures
```bash
# Clear Vercel cache
# In Vercel Dashboard: Settings → Functions → Clear Cache

# Verify local build
pnpm install --frozen-lockfile
pnpm build --filter=@brainrot/web
```

#### Environment Variable Issues
```bash
# Verify in Vercel dashboard
# Settings → Environment Variables

# Pull latest to local
vercel env pull .env.local --environment=production
```

#### Performance Degradation
```bash
# Check function logs
vercel logs --prod --filter=error

# Monitor API response times
curl -w "%{time_total}" https://www.brainrotpublishing.com/api/download?invalid=test
```

### Emergency Contacts
- **Primary**: Drew Moodie (phrazzld)
- **Vercel Support**: https://vercel.com/support  
- **GitHub Support**: https://support.github.com
- **Status Page**: https://vercel.com/status

## Success Metrics

### Deployment Success Criteria
- ✅ All automated health checks pass
- ✅ Manual verification checklist complete
- ✅ No increase in error rates
- ✅ Performance within acceptable ranges
- ✅ Security measures functioning
- ✅ Team notified successfully

### Performance Targets
- **Build Time**: <20 seconds
- **Homepage Load**: <300ms average
- **API Response**: <500ms P95
- **Uptime**: >99.9%
- **Error Rate**: <0.1%

## Related Documentation

- [Vercel Deployment](./VERCEL_DEPLOYMENT.md) - Detailed deployment configuration
- [Migration Rollback Plan](./MIGRATION_ROLLBACK_PLAN.md) - Emergency procedures
- [Security Guide](./SECURITY.md) - Security best practices  
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Monitoring Setup](./MONITORING.md) - Observability configuration

## Deployment History

| Date | Version | Changes | Status |
|------|---------|---------|---------|
| 2025-08-27 | 1.0 | Security patches, API refactor | ✅ Success |
| 2025-08-25 | 0.9 | Vitest migration, CI fixes | ✅ Success |
| 2025-08-20 | 0.8 | Monorepo migration | ✅ Success |

---

**Remember**: 
- Always run health checks after deployment
- Monitor for at least 30 minutes post-deployment  
- Don't hesitate to rollback if issues arise
- Document any lessons learned for future deployments

**This plan is living documentation** - Update based on actual deployment experiences.