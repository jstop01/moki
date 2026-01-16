# Moki - Mock API Builder

Mock API를 쉽게 생성하고 관리할 수 있는 웹 기반 도구입니다.

## 주요 기능

- **엔드포인트 관리**: REST API 엔드포인트를 UI에서 쉽게 생성/수정/삭제
- **조건부 응답**: Query String, Header, Body 값에 따라 다른 응답 반환
- **실시간 로그**: API 호출 내역 실시간 모니터링
- **API Playground**: 생성한 Mock API를 바로 테스트
- **Import/Export**: 엔드포인트 설정 백업 및 복원

## 스크린샷

### 대시보드
API 상태와 최근 호출 내역을 한눈에 확인

### 엔드포인트 관리
엔드포인트 목록 조회 및 상세 설정

### 조건부 응답
쿼리 파라미터에 따라 다른 응답 반환 설정

## 설치

### 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치 방법

```bash
# 저장소 클론
git clone https://github.com/jstop01/moki.git
cd moki

# 의존성 설치
./bin/setup.sh
# 또는
npm install
```

## 실행

### 개발 모드 (터미널 유지)
```bash
./bin/start.sh
```

### 백그라운드 모드 (터미널 닫아도 실행)
```bash
./bin/start-bg.sh
```

### 서버 종료
```bash
./bin/stop.sh      # 일반 모드
./bin/stop-bg.sh   # 백그라운드 모드
```

## 접속

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Mock API**: http://localhost:3001/mock

## 사용법

### 1. 엔드포인트 생성

1. "Endpoints" 탭으로 이동
2. "새 엔드포인트" 버튼 클릭
3. HTTP 메서드, 경로, 응답 데이터 입력
4. 저장

### 2. 조건부 응답 설정

특정 조건에 따라 다른 응답을 반환하고 싶을 때:

1. 엔드포인트 상세 페이지 → "수정" 클릭
2. "조건부 응답" 섹션에서 "조건 추가"
3. 조건 설정:
   - **Source**: Query String / Header / Body
   - **Field**: 파라미터 이름 (예: `serviceType`)
   - **Operator**: 같음, 포함, 시작 등
   - **Value**: 매칭할 값
4. 해당 조건의 응답 상태 코드와 Body 설정
5. 저장

**예시**: `GET /api/process/getInputFields?serviceType=ProcessHTTP`
- `serviceType=ProcessHTTP` → ProcessHTTP 필드 반환
- `serviceType=ProcessDB` → ProcessDB 필드 반환
- 조건 미매칭 → 기본 응답 (400 에러)

### 3. API 호출

```bash
# Mock API 호출
curl http://localhost:3001/mock/api/users

# 조건부 응답 테스트
curl "http://localhost:3001/mock/api/process/getInputFields?serviceType=ProcessHTTP"
```

### 4. 로그 확인

"Request Logs" 탭에서 모든 API 호출 내역 확인 가능

## 프로젝트 구조

```
moki/
├── bin/                    # 실행 스크립트
│   ├── setup.sh           # 초기 설치
│   ├── start.sh           # 서버 시작
│   ├── start-bg.sh        # 백그라운드 시작
│   ├── stop.sh            # 서버 종료
│   ├── stop-bg.sh         # 백그라운드 종료
│   └── deploy.sh          # 원격 배포
├── packages/
│   ├── backend/           # Express.js 백엔드
│   │   └── src/
│   │       ├── server.ts
│   │       ├── routes/
│   │       │   ├── admin.ts    # 관리 API
│   │       │   └── mock.ts     # Mock API 핸들러
│   │       └── storage/
│   │           ├── MemoryStore.ts
│   │           └── FileStore.ts
│   ├── frontend/          # React + Vite 프론트엔드
│   │   └── src/
│   │       └── app/
│   │           ├── components/
│   │           └── utils/
│   └── shared/            # 공유 타입 정의
└── logs/                  # 로그 파일
```

## 환경 변수

### Frontend (`packages/frontend/.env`)
```
VITE_API_URL=http://localhost:3001
```

서버 배포 시 백엔드 URL에 맞게 변경:
```
VITE_API_URL=http://your-server-ip:3001
```

## 원격 서버 배포

### 배포 설정
`bin/deploy.sh`에서 서버 정보 수정:
```bash
REMOTE_USER="your-username"
REMOTE_HOST="your-ip"
REMOTE_PATH="/home/was/moki"
REMOTE_PASS="your-password"
```

### 배포 실행
```bash
./bin/deploy.sh
```

## 기술 스택

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Storage**: File-based JSON storage

## 라이선스

MIT License
