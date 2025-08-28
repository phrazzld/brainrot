#!/bin/bash

echo "=== SECURITY AUTOMATION VERIFICATION ==="
echo "Checking automated security update configuration..."
echo "Timestamp: $(date)"
echo

REPO="phrazzld/brainrot"

# Check Dependabot configuration
echo "1. DEPENDABOT CONFIGURATION"
if [[ -f ".github/dependabot.yml" ]]; then
  echo "  ✅ Dependabot configuration file exists"
  
  # Count security update configurations
  security_configs=$(grep -c "prefix: \"security" .github/dependabot.yml)
  echo "  ✅ Security update configurations: $security_configs"
  
  # Check for auto-merge labels
  auto_merge_count=$(grep -c "auto-merge" .github/dependabot.yml)
  echo "  ✅ Auto-merge configurations: $auto_merge_count"
  
  # Check schedule frequency
  daily_schedules=$(grep -c "interval: \"daily\"" .github/dependabot.yml)
  echo "  ✅ Daily security scan schedules: $daily_schedules"
else
  echo "  ❌ Dependabot configuration file missing"
fi

echo

# Check GitHub Actions workflow
echo "2. AUTO-MERGE WORKFLOW"
if [[ -f ".github/workflows/auto-merge-security.yml" ]]; then
  echo "  ✅ Auto-merge security workflow exists"
  
  # Check for required permissions
  if grep -q "contents: write" .github/workflows/auto-merge-security.yml; then
    echo "  ✅ Write permissions configured"
  else
    echo "  ⚠️ Write permissions may be missing"
  fi
  
  # Check for CI wait steps
  if grep -q "wait-for-check" .github/workflows/auto-merge-security.yml; then
    echo "  ✅ CI check validation configured"
  else
    echo "  ⚠️ CI validation may be missing"
  fi
else
  echo "  ❌ Auto-merge security workflow missing"
fi

echo

# Check current security status
echo "3. CURRENT SECURITY STATUS"
echo "Checking for existing security vulnerabilities..."

# Check npm audit
if command -v pnpm &> /dev/null; then
  audit_result=$(pnpm audit --audit-level=high 2>&1)
  if echo "$audit_result" | grep -q "found 0"; then
    echo "  ✅ No high/critical vulnerabilities found"
  else
    echo "  ⚠️ Security vulnerabilities detected:"
    echo "  $audit_result" | head -5
  fi
else
  echo "  ⚠️ pnpm not available for security audit"
fi

# Check GitHub security alerts (requires gh CLI)
if command -v gh &> /dev/null; then
  echo "  Checking GitHub security alerts..."
  alert_count=$(gh api "repos/$REPO/vulnerability-alerts" 2>/dev/null | jq length 2>/dev/null || echo "0")
  if [[ "$alert_count" == "0" ]]; then
    echo "  ✅ No active GitHub security alerts"
  else
    echo "  ⚠️ $alert_count active security alerts found"
  fi
else
  echo "  ⚠️ GitHub CLI not available for alert checking"
fi

echo

# Check recent security PRs
echo "4. RECENT SECURITY ACTIVITY"
if command -v gh &> /dev/null; then
  echo "Recent security-related PRs:"
  gh pr list --label security --state all --limit 5 2>/dev/null | head -10 || echo "  No recent security PRs found"
else
  echo "  GitHub CLI required for PR history"
fi

echo

# Check documentation
echo "5. DOCUMENTATION STATUS"
docs=(
  "docs/AUTOMATED_SECURITY_UPDATES.md"
  "docs/SECURITY.md"
  "docs/PRODUCTION_DEPLOYMENT_PLAN.md"
)

for doc in "${docs[@]}"; do
  if [[ -f "$doc" ]]; then
    echo "  ✅ $doc exists"
  else
    echo "  ❌ $doc missing"
  fi
done

echo

# Generate summary
echo "6. AUTOMATION HEALTH SUMMARY"
config_score=0
total_checks=8

# Score the configuration
[[ -f ".github/dependabot.yml" ]] && ((config_score++))
[[ -f ".github/workflows/auto-merge-security.yml" ]] && ((config_score++))
[[ $security_configs -gt 0 ]] && ((config_score++))
[[ $auto_merge_count -gt 0 ]] && ((config_score++))
[[ $daily_schedules -gt 0 ]] && ((config_score++))
[[ -f "docs/AUTOMATED_SECURITY_UPDATES.md" ]] && ((config_score++))
[[ "$audit_result" == *"found 0"* ]] && ((config_score++))
[[ "$alert_count" == "0" ]] && ((config_score++))

health_percent=$((config_score * 100 / total_checks))

if [[ $health_percent -ge 90 ]]; then
  echo "  🟢 EXCELLENT: Security automation health at ${health_percent}%"
elif [[ $health_percent -ge 75 ]]; then
  echo "  🟡 GOOD: Security automation health at ${health_percent}%"
elif [[ $health_percent -ge 50 ]]; then
  echo "  🟠 NEEDS ATTENTION: Security automation health at ${health_percent}%"
else
  echo "  🔴 CRITICAL: Security automation health at ${health_percent}%"
fi

echo
echo "Next verification: $(date -d '+1 day' 2>/dev/null || date -v+1d)"
echo "For manual checks: run 'pnpm audit' and 'gh pr list --label security'"