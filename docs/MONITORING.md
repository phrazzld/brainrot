# Production Monitoring & Alerting Setup

**Project**: Brainrot Publishing House Monorepo  
**Document Version**: 1.0  
**Created**: 2025-08-27  
**Status**: Active Monitoring Configured

## Monitoring Overview

This document outlines the comprehensive monitoring and alerting strategy for the Brainrot Publishing House production environment.

## Current Monitoring Stack

### 1. Vercel Built-in Monitoring
- **Analytics Dashboard**: https://vercel.com/moomooskycow/brainrot-publishing-house/analytics
- **Function Logs**: Real-time serverless function monitoring
- **Build Monitoring**: Deployment success/failure tracking
- **Performance Metrics**: Core Web Vitals, response times

### 2. Application Health Monitoring
- **Health Check Script**: `scripts/health-check-production.sh`
- **Manual Verification**: Post-deployment checklist
- **Automated Testing**: API endpoint validation

## Key Metrics & Thresholds

### Performance Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Homepage Load Time | <300ms | >500ms | >1000ms |
| API Response Time (P95) | <200ms | >500ms | >1000ms |
| Build Time | <20s | >30s | >60s |
| Uptime | >99.9% | <99.5% | <99% |

### Security Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Failed Auth Attempts | 0 | >5 per minute |
| Malicious Parameter Tests | Rejected (400/500) | Any acceptance (200) |
| Command Injection Attempts | Blocked | Any success |
| Suspicious Traffic Patterns | Normal | Anomaly detection |

### Error Monitoring

| Error Type | Target | Alert Threshold |
|------------|--------|-----------------|
| Application Errors | <0.1% | >1% |
| 5xx Server Errors | <0.1% | >0.5% |
| 4xx Client Errors | <2% | >10% |
| Build Failures | 0% | Any failure |

## Monitoring Configuration

### Vercel Dashboard Alerts

#### Function Monitoring
```javascript
// Vercel automatically monitors:
// - Function execution time
// - Function error rate
// - Cold start frequency
// - Memory usage
// - Invocation count
```

#### Deployment Monitoring
- ✅ **Build Success/Failure**: Automatic notifications
- ✅ **Deployment Status**: Real-time status updates  
- ✅ **Performance Regression**: Web Vitals tracking

### Custom Health Monitoring

#### Automated Health Checks
```bash
# Run every 15 minutes via cron or CI
*/15 * * * * /path/to/brainrot/scripts/health-check-production.sh >> /var/log/health-check.log 2>&1

# GitHub Actions workflow (daily)
name: Production Health Check
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:
```

#### Manual Health Verification
```bash
# Post-deployment (immediate)
./scripts/health-check-production.sh

# Daily operations check
curl -I https://www.brainrotpublishing.com
curl -s https://www.brainrotpublishing.com/api/download?invalid=test | grep -q "error"
```

## Alert Configuration

### Immediate Alerts (0-5 minutes)

#### Critical System Issues
- **Site Down** (HTTP 5xx errors for >2 minutes)
- **Build Failure** (Deployment fails)
- **Security Breach** (Malicious parameters accepted)
- **Performance Degradation** (>1000ms response times)

```bash
# Example alert check
if ! curl -f -s https://www.brainrotpublishing.com > /dev/null; then
  echo "CRITICAL: Site is down!" 
  # Trigger immediate notification
fi
```

#### Security Alerts
```bash
# Test security measures
response=$(curl -s -w "%{http_code}" "https://www.brainrotpublishing.com/api/download?slug=test;rm%20-rf%20/" -o /dev/null)
if [[ "$response" == "200" ]]; then
  echo "SECURITY ALERT: Malicious parameters accepted!"
  # Trigger security team notification
fi
```

### Warning Alerts (5-15 minutes)

#### Performance Issues
- **Slow Response Times** (>500ms for 3 consecutive checks)
- **High Error Rates** (>1% error rate)
- **Resource Usage** (High memory/CPU in functions)

#### Operational Issues  
- **Failed Health Checks** (Non-critical components)
- **Content Loading Issues** (Individual books/chapters)
- **SEO Problems** (Meta tags missing)

## Monitoring Tools & Integration

### Vercel Analytics
```javascript
// Already integrated via Vercel dashboard
// Tracks:
// - Page views and user sessions
// - Core Web Vitals (LCP, FID, CLS)
// - Geographic distribution
// - Device and browser analytics
```

### Custom Monitoring Scripts

#### Performance Monitor
```bash
#!/bin/bash
# Monitor API performance continuously
while true; do
  response_time=$(curl -o /dev/null -s -w '%{time_total}' https://www.brainrotpublishing.com)
  if (( $(echo "$response_time > 0.5" | bc -l) )); then
    echo "WARNING: Slow response time: ${response_time}s"
  fi
  sleep 300  # Check every 5 minutes
done
```

#### Error Rate Monitor  
```bash
#!/bin/bash
# Check error rates in Vercel logs
vercel logs --prod --since=1h | grep -c "ERROR" > /tmp/error_count
if [[ $(cat /tmp/error_count) -gt 10 ]]; then
  echo "WARNING: High error rate detected"
fi
```

## Notification Channels

### Primary Notifications
- **Email**: drew@phrazzld.com
- **Vercel Dashboard**: Real-time alerts
- **GitHub Notifications**: Build/deployment status

### Emergency Escalation
1. **Immediate** (0-15 min): Direct notification
2. **Escalated** (15-30 min): Secondary contact
3. **Critical** (30+ min): Full team notification

## Log Management

### Application Logs
```bash
# Vercel function logs
vercel logs --prod --follow

# Local development logs  
pnpm dev 2>&1 | tee logs/development.log

# Build logs
pnpm build 2>&1 | tee logs/build.log
```

### Security Logs
```bash
# Monitor for security events
grep -i "security\|malicious\|attack" /var/log/application.log

# Check for command injection attempts
grep -i "rm\|echo\|cat\|;" /var/log/api-requests.log
```

### Performance Logs
```bash
# Track response times
awk '/response_time/ {print $0}' /var/log/performance.log | tail -100

# Monitor resource usage
top -p $(pgrep -f "brainrot") -b -n 1
```

## Monitoring Dashboard

### Key Metrics Dashboard
- **Uptime Status**: Green/Red indicator
- **Response Times**: Real-time graph
- **Error Rates**: Percentage over time  
- **Security Events**: Count and details
- **Build Status**: Success/failure with timestamps

### Vercel Analytics Dashboard
Access: https://vercel.com/moomooskycow/brainrot-publishing-house/analytics

Key sections:
- **Real User Monitoring**: Actual user experience
- **Core Web Vitals**: Performance metrics
- **Traffic Analysis**: Usage patterns
- **Error Tracking**: Runtime errors

## Incident Response

### Alert Severity Levels

#### P0 - Critical (Immediate Response)
- Site completely down
- Security breach detected  
- Data loss or corruption
- Complete build system failure

**Response**: <5 minutes, immediate rollback if needed

#### P1 - High (Response within 30 minutes)
- Significant performance degradation
- Major features broken
- High error rates
- Deployment failures

**Response**: <30 minutes, investigate and fix

#### P2 - Medium (Response within 2 hours)
- Minor performance issues
- Non-critical features broken
- Cosmetic problems
- Build warnings

**Response**: <2 hours, plan fix during business hours

### Incident Response Playbook

#### Immediate Actions (0-5 minutes)
1. **Acknowledge Alert**: Confirm receipt and investigation start
2. **Assess Impact**: Determine severity and user impact
3. **Initial Response**: Stop further damage (rollback if needed)
4. **Communicate**: Alert team and stakeholders

#### Investigation Phase (5-30 minutes)
1. **Gather Data**: Check logs, metrics, recent changes
2. **Identify Root Cause**: Determine what caused the issue
3. **Plan Resolution**: Decide on fix vs rollback
4. **Execute Fix**: Implement solution

#### Recovery Phase (30+ minutes)
1. **Verify Fix**: Confirm issue is resolved
2. **Monitor**: Watch for related issues
3. **Communicate Resolution**: Update stakeholders
4. **Document**: Record incident details for post-mortem

## Monitoring Checklist

### Daily Monitoring Tasks
- [ ] Check Vercel dashboard for alerts
- [ ] Review application logs for errors
- [ ] Verify key functionality working
- [ ] Check performance metrics
- [ ] Review security logs

### Weekly Monitoring Tasks  
- [ ] Run comprehensive health check
- [ ] Review performance trends
- [ ] Check for security updates needed
- [ ] Analyze error patterns
- [ ] Update monitoring thresholds if needed

### Monthly Monitoring Tasks
- [ ] Review and update alert configurations
- [ ] Analyze long-term performance trends
- [ ] Update monitoring documentation
- [ ] Review incident response effectiveness
- [ ] Plan monitoring improvements

## Continuous Improvement

### Monitoring Evolution
- **Baseline Establishment**: Track metrics over time
- **Threshold Tuning**: Adjust alerts based on patterns
- **Tool Evaluation**: Consider additional monitoring tools
- **Process Refinement**: Improve response procedures

### Success Metrics
- **Mean Time To Detection** (MTTD): <5 minutes for critical issues
- **Mean Time To Resolution** (MTTR): <30 minutes for critical issues  
- **False Positive Rate**: <5% for alerts
- **Alert Coverage**: >95% of issues detected automatically

---

**Remember**:
- Monitor continuously, but avoid alert fatigue
- Tune thresholds based on actual system behavior
- Document all incidents for continuous improvement
- Test monitoring systems regularly

**This monitoring strategy is living documentation** - Update based on operational experience and new requirements.