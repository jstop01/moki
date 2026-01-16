#!/bin/bash

# Mock API Builder - 파일 변경 감지 자동 배포
# 사용법: ./watch-deploy.sh [서버주소]
# 종료: Ctrl+C

# 설정
REMOTE_USER="was"
REMOTE_HOST="10.254.241.251"
REMOTE_PATH="/home/was/moki"
REMOTE_PASS="wasrhksflwk@"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# 스크립트 위치 기준으로 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# sshpass 확인
if ! command -v sshpass &> /dev/null; then
  echo -e "${RED}❌ sshpass가 설치되어 있지 않습니다${NC}"
  echo ""
  echo "설치 방법:"
  echo "  macOS: brew install hudochenkov/sshpass/sshpass"
  echo "  Linux: sudo apt install sshpass"
  exit 1
fi

# fswatch 확인
if ! command -v fswatch &> /dev/null; then
  echo -e "${RED}❌ fswatch가 설치되어 있지 않습니다${NC}"
  echo ""
  echo "설치 방법:"
  echo "  macOS: brew install fswatch"
  echo "  Linux: sudo apt install fswatch"
  exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}👀 파일 변경 감지 모드${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  감시 경로: ${GREEN}${PROJECT_ROOT}${NC}"
echo -e "  대상 서버: ${GREEN}${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}${NC}"
echo ""
echo -e "${YELLOW}파일 변경 시 자동으로 동기화됩니다. 종료하려면 Ctrl+C${NC}"
echo ""

# 동기화 함수
sync_files() {
  echo -e "${CYAN}[$(date '+%H:%M:%S')] 🔄 동기화 중...${NC}"
  sshpass -p "$REMOTE_PASS" rsync -az --delete \
    -e "ssh -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude 'dist' \
    "$PROJECT_ROOT/" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/" 2>/dev/null
  # 서버의 프론트엔드 .env 파일 업데이트 (localhost -> 서버IP)
  sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
    "echo 'VITE_API_URL=http://${REMOTE_HOST}:3001' > ${REMOTE_PATH}/packages/frontend/.env" 2>/dev/null
  echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ 동기화 완료${NC}"
}

# 초기 동기화
sync_files

# 파일 변경 감지 및 동기화
fswatch -o \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'logs' \
  --exclude '\.log$' \
  "$PROJECT_ROOT" | while read; do
  sync_files
done
