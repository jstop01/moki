#!/bin/bash

# Mock API Builder - 서버 자동 실행 스크립트
# 사용법: ./start.sh

# 스크립트 위치 기준으로 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로고
print_logo() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║                                          ║"
    echo "║   🚀  Mock API Builder Starting  🚀     ║"
    echo "║                                          ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 포트 확인 (macOS: lsof, Linux: ss/netstat)
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        # macOS / lsof 설치된 Linux
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    elif command -v ss &> /dev/null; then
        # Linux (ss)
        ss -tlnp | grep -q ":$port "
    elif command -v netstat &> /dev/null; then
        # Linux (netstat)
        netstat -tlnp 2>/dev/null | grep -q ":$port "
    else
        # 폴백: curl로 확인
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
        # ss로 PID 찾아서 kill
        local pid=$(ss -tlnp | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
        [ -n "$pid" ] && kill -9 $pid 2>/dev/null
    fi
}

# 포트 정리
cleanup_ports() {
    echo -e "${YELLOW}🔍 포트 상태 확인 중...${NC}"
    
    if check_port 3001; then
        echo -e "${YELLOW}⚠️  포트 3001이 사용 중입니다${NC}"
        echo "종료하시겠습니까? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            kill_port 3001
            echo -e "${GREEN}✅ 포트 3001 정리 완료${NC}"
        fi
    fi

    if check_port 5173; then
        echo -e "${YELLOW}⚠️  포트 5173이 사용 중입니다${NC}"
        echo "종료하시겠습니까? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            kill_port 5173
            echo -e "${GREEN}✅ 포트 5173 정리 완료${NC}"
        fi
    fi
    
    echo ""
}

# 로그 파일 위치
BACKEND_LOG="logs/backend.log"
FRONTEND_LOG="logs/frontend.log"

# 로그 디렉토리 생성
mkdir -p logs

# 기존 로그 정리
> "$BACKEND_LOG"
> "$FRONTEND_LOG"

# 서버 시작
start_servers() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📡 Backend 시작 중...${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Backend 시작
    cd packages/backend
    npm run dev > ../../"$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    cd ../..
    
    echo -e "${GREEN}✅ Backend 시작됨 (PID: $BACKEND_PID)${NC}"
    echo -e "${CYAN}   로그: $BACKEND_LOG${NC}"
    echo ""
    
    # Backend 준비 대기
    echo "⏳ Backend 준비 중..."
    sleep 3
    
    # Backend 상태 확인
    if check_port 3001; then
        echo -e "${GREEN}✅ Backend 준비 완료: http://localhost:3001${NC}"
    else
        echo -e "${RED}❌ Backend 시작 실패!${NC}"
        echo "로그를 확인하세요: tail -f $BACKEND_LOG"
        exit 1
    fi
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🎨 Frontend 시작 중...${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Frontend 시작
    cd packages/frontend
    npm run dev > ../../"$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    
    echo -e "${GREEN}✅ Frontend 시작됨 (PID: $FRONTEND_PID)${NC}"
    echo -e "${CYAN}   로그: $FRONTEND_LOG${NC}"
    echo ""
    
    # Frontend 준비 대기
    echo "⏳ Frontend 준비 중..."
    sleep 3
    
    # Frontend 상태 확인
    if check_port 5173; then
        echo -e "${GREEN}✅ Frontend 준비 완료: http://localhost:5173${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend 시작 지연 중... (정상일 수 있음)${NC}"
    fi
    
    # PID 저장
    echo "$BACKEND_PID" > logs/backend.pid
    echo "$FRONTEND_PID" > logs/frontend.pid
}

# 상태 출력
print_status() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                          ║${NC}"
    echo -e "${GREEN}║   ✅  서버 실행 중!                      ║${NC}"
    echo -e "${GREEN}║                                          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🌐 서비스 URL:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${GREEN}Backend:${NC}  http://localhost:3001"
    echo -e "  ${GREEN}Frontend:${NC} http://localhost:5173"
    echo -e "  ${GREEN}Health:${NC}   http://localhost:3001/api/admin/health"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 빠른 테스트:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  curl http://localhost:3001/mock/api/users"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 로그 확인:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Backend:  tail -f $BACKEND_LOG"
    echo "  Frontend: tail -f $FRONTEND_LOG"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}종료하려면: Ctrl+C${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 종료 핸들러
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 서버 종료 중...${NC}"
    
    if [ -f logs/backend.pid ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Backend 종료됨${NC}"
    fi
    
    if [ -f logs/frontend.pid ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Frontend 종료됨${NC}"
    fi
    
    # 포트 강제 종료
    kill_port 3001
    kill_port 5173
    
    rm -f logs/*.pid
    
    echo -e "${GREEN}✅ 정리 완료${NC}"
    exit 0
}

# Ctrl+C 트랩
trap cleanup INT TERM

# 메인 실행
main() {
    print_logo
    cleanup_ports
    start_servers
    print_status
    
    # 계속 실행 (로그 tail)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "실시간 로그 (Backend):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -f "$BACKEND_LOG"
}

# 스크립트 실행
main
