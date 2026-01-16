#!/bin/bash

# Mock API Builder - 서버 종료 스크립트
# 사용법: ./stop.sh

# 스크립트 위치 기준으로 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 포트 프로세스 종료 (macOS/Linux 호환)
kill_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -ti:$port | xargs kill -9 2>/dev/null
    elif command -v fuser &> /dev/null; then
        fuser -k $port/tcp 2>/dev/null
    elif command -v ss &> /dev/null; then
        local pid=$(ss -tlnp | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
        [ -n "$pid" ] && kill -9 $pid 2>/dev/null
    fi
}

echo -e "${YELLOW}🛑 서버 종료 중...${NC}"
echo ""

# PID 파일로 종료
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo -e "${GREEN}✅ Backend 종료됨 (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend 프로세스가 이미 종료되었습니다${NC}"
    fi
    rm -f logs/backend.pid
fi

if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✅ Frontend 종료됨 (PID: $FRONTEND_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend 프로세스가 이미 종료되었습니다${NC}"
    fi
    rm -f logs/frontend.pid
fi

# 포트 기반으로 강제 종료
echo ""
echo -e "${YELLOW}🔍 포트 정리 중...${NC}"

if check_port 3001; then
    kill_port 3001
    echo -e "${GREEN}✅ 포트 3001 정리됨${NC}"
fi

if check_port 5173; then
    kill_port 5173
    echo -e "${GREEN}✅ 포트 5173 정리됨${NC}"
fi

echo ""
echo -e "${GREEN}✅ 모든 서버가 종료되었습니다${NC}"
