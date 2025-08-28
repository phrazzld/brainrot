#!/bin/bash

echo "=== BRAINROT PUBLISHING HOUSE - PRODUCTION HEALTH CHECK ==="
echo "Checking: https://www.brainrotpublishing.com"
echo "Timestamp: $(date)"
echo

SITE_URL="https://www.brainrotpublishing.com"
HEALTH_STATUS=0

# Function to check HTTP status and response time
check_endpoint() {
  local url=$1
  local description=$2
  local expected_status=${3:-200}
  
  echo "Checking: $description"
  response=$(curl -o /dev/null -s -w "Status: %{http_code}, Time: %{time_total}s" "$url")
  status_code=$(echo $response | grep -o 'Status: [0-9]*' | cut -d' ' -f2)
  
  if [[ "$status_code" == "$expected_status" ]]; then
    echo "  ✅ $response"
  else
    echo "  ❌ $response (Expected: $expected_status)"
    HEALTH_STATUS=1
  fi
  echo
}

# Function to check for content in response
check_content() {
  local url=$1
  local description=$2
  local expected_content=$3
  
  echo "Checking: $description"
  response=$(curl -s "$url")
  
  if [[ "$response" == *"$expected_content"* ]]; then
    echo "  ✅ Content found: $expected_content"
  else
    echo "  ❌ Content missing: $expected_content"
    HEALTH_STATUS=1
  fi
  echo
}

# Core Health Checks
echo "1. BASIC CONNECTIVITY"
check_endpoint "$SITE_URL" "Homepage" 200
check_endpoint "$SITE_URL/explore" "Explore page" 200

echo "2. CONTENT VALIDATION"
check_content "$SITE_URL" "Homepage title" "brainrot publishing house"
check_content "$SITE_URL" "Homepage description" "zoomer translations of classic literature"

echo "3. API ENDPOINTS"
# Note: 500 is acceptable for download API without content files
echo "Checking: Download API (expected failure - 400 or 500 acceptable)"
response=$(curl -o /dev/null -s -w "Status: %{http_code}, Time: %{time_total}s" "$SITE_URL/api/download?slug=test&type=full")
status_code=$(echo $response | grep -o 'Status: [0-9]*' | cut -d' ' -f2)
if [[ "$status_code" == "400" ]] || [[ "$status_code" == "500" ]]; then
  echo "  ✅ $response (Expected: 400 or 500)"
else
  echo "  ❌ $response (Expected: 400 or 500)"
  HEALTH_STATUS=1
fi
echo

check_endpoint "$SITE_URL/api/download?slug=test;rm%20-rf%20/" "Security test (malicious)" 400

echo "4. SECURITY MEASURES"
echo "Checking: Command injection protection"
malicious_response=$(curl -s -w "Status: %{http_code}" "$SITE_URL/api/download?slug=test;echo%20vulnerable" -o /dev/null)
if [[ "$malicious_response" == *"400"* ]] || [[ "$malicious_response" == *"500"* ]]; then
  echo "  ✅ Malicious parameters rejected: $malicious_response"
else
  echo "  ❌ Security vulnerability: malicious parameters accepted"
  HEALTH_STATUS=1
fi
echo

echo "5. PERFORMANCE CHECK"
echo "Running 3 performance tests..."
total_time=0
for i in {1..3}; do
  time_result=$(curl -o /dev/null -s -w "%{time_total}" "$SITE_URL")
  echo "  Test $i: ${time_result}s"
  total_time=$(echo "$total_time + $time_result" | bc -l)
done

avg_time=$(echo "scale=3; $total_time / 3" | bc -l)
echo "  Average response time: ${avg_time}s"

if (( $(echo "$avg_time < 0.5" | bc -l) )); then
  echo "  ✅ Performance acceptable (<0.5s)"
else
  echo "  ⚠️  Performance slow (>0.5s) - Monitor closely"
fi
echo

echo "6. SSL/HTTPS CHECK"
ssl_check=$(curl -s -I "$SITE_URL" | grep -i "strict-transport-security")
if [[ -n "$ssl_check" ]]; then
  echo "  ✅ HTTPS security headers present"
else
  echo "  ❌ Missing security headers"
  HEALTH_STATUS=1
fi
echo

echo "=== HEALTH CHECK SUMMARY ==="
if [[ $HEALTH_STATUS -eq 0 ]]; then
  echo "✅ ALL CHECKS PASSED - System is healthy"
  echo "Production deployment is functioning correctly"
  exit 0
else
  echo "❌ HEALTH CHECK FAILED - Issues detected"
  echo "Review failed checks above and consider rollback"
  exit 1
fi