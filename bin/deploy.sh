#!/bin/bash

# Mock API Builder - 서버 배포 스크립트
# 사용법: ./deploy.sh [서버주소]

# 설정
REMOTE_USER="was"
REMOTE_HOST="10.254.241.251"
REMOTE_PATH="/home/was/moki"
REMOTE_PASS="wasrhksflwk@"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 스크립트 위치 기준으로 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# sshpass 확인
if ! command -v sshpass &> /dev/null; then
  echo -e "${YELLOW}⚠️  sshpass가 설치되어 있지 않습니다${NC}"
  echo ""
  echo "설치 방법:"
  echo "  macOS: brew install hudochenkov/sshpass/sshpass"
  echo "  Linux: sudo apt install sshpass"
  exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🚀 배포 시작${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  대상 서버: ${GREEN}${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}${NC}"
echo ""

# rsync로 파일 동기화 (node_modules 제외)
sshpass -p "$REMOTE_PASS" rsync -avz --progress \
  -e "ssh -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'logs' \
  --exclude '*.log' \
  --exclude '.env.local' \
  --exclude 'dist' \
  "$PROJECT_ROOT/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"

echo ""
echo -e "${GREEN}✅ 파일 동기화 완료${NC}"
echo ""

# 서버의 프론트엔드 .env 파일 업데이트 (localhost -> 서버IP)
echo -e "${CYAN}🔧 프론트엔드 환경변수 설정 중...${NC}"
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
  "echo 'VITE_API_URL=http://${REMOTE_HOST}:3001' > ${REMOTE_PATH}/packages/frontend/.env"
echo -e "${GREEN}✅ 프론트엔드 API URL: http://${REMOTE_HOST}:3001${NC}"
echo ""

# 서버에서 재시작 여부 확인
echo -e "${YELLOW}서버에서 재시작하시겠습니까? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
  echo -e "${CYAN}🔄 서버 재시작 중...${NC}"
  sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PATH} && ./bin/stop.sh && ./bin/start.sh"
  echo -e "${GREEN}✅ 서버 재시작 완료${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
