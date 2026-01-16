#!/bin/bash

# Mock API Builder - 자동 설치 및 실행 스크립트
# 사용법: ./setup.sh

set -e  # 에러 발생 시 중단

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
NC='\033[0m' # No Color

# 로고 출력
print_logo() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║                                          ║"
    echo "║   🎭  Mock API Builder Setup  🎭        ║"
    echo "║                                          ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 단계 출력
print_step() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📍 $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 성공 메시지
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 경고 메시지
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 에러 메시지
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Node.js 버전 확인
check_node() {
    print_step "Step 1: Node.js 버전 확인"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js가 설치되어 있지 않습니다!"
        echo "다음 명령어로 설치해주세요:"
        echo "  Mac: brew install node"
        echo "  Ubuntu: sudo apt install nodejs npm"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    print_success "Node.js: $NODE_VERSION"
    print_success "npm: $NPM_VERSION"
    echo ""
}

# 의존성 설치
install_dependencies() {
    print_step "Step 2: 의존성 설치"
    
    echo "📦 루트 패키지 설치 중..."
    npm install --silent
    print_success "루트 패키지 설치 완료"
    echo ""
}

# Shared 빌드
build_shared() {
    print_step "Step 3: Shared 타입 빌드"
    
    cd packages/shared
    echo "🔨 TypeScript 컴파일 중..."
    npm run build
    
    # 빌드 확인
    if [ -d "dist" ]; then
        print_success "Shared 빌드 완료 (dist/ 생성됨)"
    else
        print_error "Shared 빌드 실패!"
        exit 1
    fi
    
    cd ../..
    echo ""
}

# 환경 변수 파일 생성
create_env_files() {
    print_step "Step 4: 환경 변수 설정"
    
    # Backend .env
    if [ ! -f "packages/backend/.env" ]; then
        cat > packages/backend/.env << EOF
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
EOF
        print_success "Backend .env 파일 생성됨"
    else
        print_warning "Backend .env 파일이 이미 존재합니다 (건너뜀)"
    fi
    
    # Frontend .env
    if [ ! -f "packages/frontend/.env" ]; then
        cat > packages/frontend/.env << EOF
VITE_API_URL=http://localhost:3001
EOF
        print_success "Frontend .env 파일 생성됨"
    else
        print_warning "Frontend .env 파일이 이미 존재합니다 (건너뜀)"
    fi
    
    echo ""
}

# 설치 완료 메시지
print_install_complete() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                          ║${NC}"
    echo -e "${GREEN}║   ✅  설치 완료!                         ║${NC}"
    echo -e "${GREEN}║                                          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
}

# 서버 실행 안내
print_run_instructions() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 서버 실행 방법:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}방법 1: 자동 실행 (권장)${NC}"
    echo "  ./bin/start.sh"
    echo ""
    echo -e "${YELLOW}방법 2: 수동 실행${NC}"
    echo "  # Terminal 1 - Backend"
    echo "  cd packages/backend && npm run dev"
    echo ""
    echo "  # Terminal 2 - Frontend"
    echo "  cd packages/frontend && npm run dev"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 메인 실행
main() {
    print_logo
    
    check_node
    install_dependencies
    build_shared
    create_env_files
    
    print_install_complete
    print_run_instructions

    # bin 폴더 스크립트 실행 권한 부여
    chmod +x bin/*.sh 2>/dev/null || true
}

# 스크립트 실행
main
