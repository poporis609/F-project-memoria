# Auth Service (인증 & 마이페이지 API)

Node.js + Express 기반 사용자 인증 및 마이페이지 백엔드 API 서버입니다. AWS Cognito와 연동하여 사용자 관리, 프로필 수정, 계정 삭제 기능을 제공합니다.

## 기술 스택

- **Node.js** + **Express** + **TypeScript**
- **AWS Cognito** - 사용자 인증
- **AWS Lambda** - 계정 삭제 처리 (`lambda_cognito_delete.py`)
- **EventBridge** - Lambda Warmup 스케줄링
- **OpenTelemetry** - 분산 트레이싱

## 프로젝트 구조

```
auth/
├── server/
│   ├── index.ts              # 메인 서버
│   ├── controllers/
│   │   └── userController.ts # 사용자 컨트롤러
│   ├── middleware/
│   │   ├── auth.ts           # JWT 인증 미들웨어
│   │   └── errorHandler.ts   # 에러 처리
│   └── routes/
│       └── userRoutes.ts     # 라우트 정의
├── src/
│   ├── services/
│   │   ├── authService.ts    # 인증 로직
│   │   ├── database.ts       # DB 연결
│   │   ├── userService.ts    # 사용자 서비스
│   │   ├── inquiryService.ts # 문의 서비스
│   │   └── reportService.ts  # 신고 서비스
│   ├── types/                # TypeScript 타입
│   └── tracing.ts            # OpenTelemetry 설정
├── lambda_cognito_delete.py  # Cognito 사용자 삭제 Lambda
├── k8s/                      # K8s 매니페스트
├── Dockerfile
└── package.json
```

## API 엔드포인트

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/health` | 헬스체크 | ❌ |
| GET | `/api/user/profile` | 프로필 조회 | ✅ |
| PUT | `/api/user/profile` | 프로필 수정 | ✅ |
| POST | `/api/user/password-reset` | 비밀번호 재설정 요청 | ❌ |
| POST | `/api/user/password-reset/confirm` | 비밀번호 재설정 확인 | ❌ |
| DELETE | `/api/user/account` | 계정 삭제 | ✅ |
| POST | `/api/user/report` | 사용자 신고 | ✅ |
| POST | `/api/user/inquiry` | 문의 등록 | ✅ |
| GET | `/api/user/inquiries` | 문의 내역 조회 | ✅ |

## 실행

```bash
npm install
cp .env.example .env
npm run dev    # → http://localhost:3001
```

## 배포

```
Git Push (main) → GitHub Actions → Docker Build → ECR Push → EKS Deploy (Rolling Update)
```
