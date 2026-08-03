#!/bin/bash
# ============================================================
# VoteWise — Smoke Test Script
# ============================================================
# Run after deployment to verify all endpoints are working.
# Usage: ./scripts/smoke-test.sh https://votewise.com.ng
# ============================================================

BASE_URL=${1:-http://localhost:3000}
PASSED=0
FAILED=0

check() {
    local name=$1
    local url=$2
    local expected=$3

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$RESPONSE" = "$expected" ]; then
        echo "  ✅ $name ($RESPONSE)"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ $name (expected $expected, got $RESPONSE)"
        FAILED=$((FAILED + 1))
    fi
}

echo "============================================"
echo "VoteWise Smoke Test — $BASE_URL"
echo "============================================"
echo ""

echo "Public Routes:"
check "Landing" "$BASE_URL/" "200"
check "Login" "$BASE_URL/login" "200"
check "Register" "$BASE_URL/register" "200"
check "Health" "$BASE_URL/api/health" "200"
check "Portal (achema)" "$BASE_URL/o/achema" "200"
check "Vote" "$BASE_URL/o/achema/vote?election=election-sug-2025" "200"
check "Results" "$BASE_URL/o/achema/results?election=election-sug-2025" "200"
check "Candidates" "$BASE_URL/o/achema/candidates?election=election-sug-2025" "200"
check "Archive" "$BASE_URL/o/achema/archive" "200"
check "Audit" "$BASE_URL/o/achema/audit" "200"
check "Check" "$BASE_URL/o/achema/check" "200"
check "Verify" "$BASE_URL/o/achema/verify" "200"
echo ""

echo "API Routes:"
check "Portal API" "$BASE_URL/api/portal/achema" "200"
check "Announcements API" "$BASE_URL/api/portal/achema/announcements" "200"
check "Archive API" "$BASE_URL/api/portal/achema/archive" "200"
check "Election API" "$BASE_URL/api/elections/election-sug-2025" "200"
check "Results API" "$BASE_URL/api/results/election-sug-2025" "200"
check "Public Audit API" "$BASE_URL/api/public/audit/achema" "200"
check "Voter Template" "$BASE_URL/api/dashboard/voters/template" "200"
echo ""

echo "Auth-Protected Routes (should redirect):"
check "Dashboard" "$BASE_URL/dashboard" "307"
check "Admin" "$BASE_URL/admin" "307"
echo ""

echo "============================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "============================================"

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
