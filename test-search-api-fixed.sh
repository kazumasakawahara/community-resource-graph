#!/bin/bash

# Community Resource Graph - Search API Test Script (macOS Compatible)
# バックエンド検索機能の総合テスト

echo "========================================"
echo "  Community Resource Graph"
echo "  Search API Test Suite (Fixed)"
echo "========================================"
echo ""

BASE_URL="http://localhost:3000"
PASS_COUNT=0
FAIL_COUNT=0

# カラー出力
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト関数
test_endpoint() {
  local test_name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  
  echo -n "Testing: $test_name ... "
  
  start_time=$(date +%s%N)
  response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
  end_time=$(date +%s%N)
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  # 実行時間を計算（ミリ秒）
  elapsed_ms=$(( (end_time - start_time) / 1000000 ))
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (${elapsed_ms}ms)"
    PASS_COUNT=$((PASS_COUNT + 1))
    
    # レスポンスボディのサンプルを表示（最初の200文字）
    if [ ${#body} -gt 0 ]; then
      echo "  Response preview: $(echo "$body" | head -c 200)..."
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $http_code, Time: ${elapsed_ms}ms)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "  Response: $body"
  fi
  echo ""
}

# URL encode function for Japanese text
urlencode() {
  python3 -c "import sys, urllib.parse as ul; print(ul.quote_plus(sys.argv[1]))" "$1"
}

# ===================================
# Test 1: Health Check
# ===================================
echo "===================="
echo "Test 1: Health Check"
echo "===================="
test_endpoint "Health Check" "$BASE_URL/health" 200

# ===================================
# Test 2: Search API - Basic
# ===================================
echo "========================="
echo "Test 2: Basic Search Test"
echo "========================="

# 2-1: 簡単な日本語キーワード
KEYWORD1=$(urlencode "静かな場所")
test_endpoint "Search: 静かな場所" "$BASE_URL/api/resources/search?keyword=$KEYWORD1" 200

# 2-2: 別のキーワード
KEYWORD2=$(urlencode "相談")
test_endpoint "Search: 相談" "$BASE_URL/api/resources/search?keyword=$KEYWORD2" 200

# 2-3: 短いキーワード
KEYWORD3=$(urlencode "支援")
test_endpoint "Search: 支援" "$BASE_URL/api/resources/search?keyword=$KEYWORD3" 200

# ===================================
# Test 3: Performance Test
# ===================================
echo "============================="
echo "Test 3: Performance Test"
echo "============================="
echo "同じクエリを3回実行してキャッシュ効果を確認"
echo ""

KEYWORD_PERF=$(urlencode "カフェ")
PERF_URL="$BASE_URL/api/resources/search?keyword=$KEYWORD_PERF"

for i in {1..3}; do
  echo -n "Run $i/3: "
  start_time=$(date +%s%N)
  response=$(curl -s -w "\n%{http_code}" "$PERF_URL" 2>/dev/null)
  end_time=$(date +%s%N)
  
  http_code=$(echo "$response" | tail -n 1)
  elapsed_ms=$(( (end_time - start_time) / 1000000 ))
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ ${elapsed_ms}ms${NC}"
  else
    echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
  fi
done
echo ""

# ===================================
# Test 4: Parameter Validation
# ===================================
echo "================================"
echo "Test 4: Parameter Validation"
echo "================================"

# 4-1: キーワードなし（全件取得）
test_endpoint "No keyword (all resources)" "$BASE_URL/api/resources/search" 200

# 4-2: ページネーション
test_endpoint "Pagination: page=1, limit=5" "$BASE_URL/api/resources/search?page=1&limit=5" 200

# 4-3: 複数パラメータ
KEYWORD_MULTI=$(urlencode "支援")
test_endpoint "Multiple params" "$BASE_URL/api/resources/search?keyword=$KEYWORD_MULTI&page=1&limit=10" 200

# ===================================
# Test 5: Resource Detail
# ===================================
echo "========================="
echo "Test 5: Resource Detail"
echo "========================="

# まず検索して有効なIDを取得
echo "Getting resource ID from search..."
search_response=$(curl -s "$BASE_URL/api/resources/search?limit=1")
resource_id=$(echo "$search_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$resource_id" ]; then
  echo "Found resource ID: $resource_id"
  test_endpoint "Get resource detail" "$BASE_URL/api/resources/$resource_id" 200
else
  echo -e "${YELLOW}⚠ Warning: No resource found to test detail endpoint${NC}"
  echo ""
fi

# ===================================
# Test 6: Edge Cases
# ===================================
echo "====================="
echo "Test 6: Edge Cases"
echo "====================="

# 6-1: 存在しないリソース
test_endpoint "Non-existent resource" "$BASE_URL/api/resources/nonexistent-id-12345" 404

# 6-2: 空文字列検索
test_endpoint "Empty keyword" "$BASE_URL/api/resources/search?keyword=" 200

# 6-3: 非常に長いキーワード
long_keyword=$(urlencode "これは非常に長いキーワードでシステムがどのように応答するかをテストするためのものです")
test_endpoint "Very long keyword" "$BASE_URL/api/resources/search?keyword=$long_keyword" 200

# ===================================
# Summary
# ===================================
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Total tests: $((PASS_COUNT + FAIL_COUNT))"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
