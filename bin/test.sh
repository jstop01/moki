#!/bin/bash

# Mock API Builder - 테스트 스크립트
# 사용법: ./test.sh

# 스크립트 위치 기준으로 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 포트 확인 (macOS: lsof, Linux: ss/netstat)
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    elif command -v ss &> /dev/null; then
        ss -tlnp | grep -q ":$port "
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep -q ":$port "
    else
        curl -s --connect-timeout 1 "http://localhost:$port" >/dev/null 2>&1
    fi
}

# 로고
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║                                          ║"
echo "║   🧪  Mock API Builder Tests  🧪        ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 테스트 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 테스트 함수
test_endpoint() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -e "${BLUE}Test $TOTAL_TESTS: $name${NC}"
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}  ✅ PASSED (Status: $status_code)${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}  ❌ FAILED (Expected: $expected_status, Got: $status_code)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo ""
}

# 서버 상태 확인
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 서버 상태 확인${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! check_port 3001; then
    echo -e "${RED}❌ Backend가 실행되지 않았습니다!${NC}"
    echo "다음 명령어로 서버를 시작하세요: ./start.sh"
    exit 1
fi

echo -e "${GREEN}✅ Backend 실행 중 (Port 3001)${NC}"
echo ""

# Admin API 테스트
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📡 Admin API 테스트${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "Health Check" "http://localhost:3001/api/admin/health" 200
test_endpoint "Get Endpoints" "http://localhost:3001/api/admin/endpoints" 200
test_endpoint "Get Logs" "http://localhost:3001/api/admin/logs" 200

# Mock API 테스트
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🎭 Mock API 테스트${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "Get Users (Sample)" "http://localhost:3001/mock/api/users" 200
test_endpoint "Get User by ID (Sample)" "http://localhost:3001/mock/api/users/1" 200
test_endpoint "Error Response (Sample)" "http://localhost:3001/mock/api/error" 500
test_endpoint "Not Found" "http://localhost:3001/mock/api/nonexistent" 404

# 엔드포인트 생성 테스트
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}➕ 엔드포인트 생성 테스트${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "${BLUE}Test $TOTAL_TESTS: Create Test Endpoint${NC}"

response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/admin/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "path": "/api/test",
    "responseStatus": 200,
    "responseData": {"message": "Test endpoint works!"}
  }' 2>/dev/null)

status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "201" ]; then
    echo -e "${GREEN}  ✅ PASSED (Status: $status_code)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # 생성된 엔드포인트 호출
    echo ""
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}Test $TOTAL_TESTS: Call Created Endpoint${NC}"
    
    sleep 1
    test_response=$(curl -s http://localhost:3001/mock/api/test 2>/dev/null)
    
    if echo "$test_response" | grep -q "Test endpoint works"; then
        echo -e "${GREEN}  ✅ PASSED${NC}"
        echo -e "${CYAN}  Response: $test_response${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}  ❌ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
else
    echo -e "${RED}  ❌ FAILED (Status: $status_code)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# 결과 요약
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 테스트 결과${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  총 테스트:   $TOTAL_TESTS"
echo -e "  ${GREEN}성공:       $PASSED_TESTS${NC}"
echo -e "  ${RED}실패:       $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                          ║${NC}"
    echo -e "${GREEN}║   ✅  모든 테스트 통과!                  ║${NC}"
    echo -e "${GREEN}║                                          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                          ║${NC}"
    echo -e "${RED}║   ❌  일부 테스트 실패                   ║${NC}"
    echo -e "${RED}║                                          ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════╝${NC}"
    exit 1
fi
