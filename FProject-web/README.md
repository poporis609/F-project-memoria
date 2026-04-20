# FProject-web (Frontend)

React 18 + TypeScript 기반 일기 관리 웹 애플리케이션입니다. 빈티지 도서관 컨셉의 UI로 일기 작성, AI 요약, 추억 보관함 기능을 제공합니다.

## 기술 스택

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** - 스타일링/컴포넌트
- **TanStack Query** - 서버 상태 관리
- **Framer Motion** - 애니메이션
- **i18next** - 다국어 (한국어/영어)
- **AWS Cognito SDK** - 인증

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── auth/           # 인증 (로그인, 회원가입, OTP)
│   ├── journal/        # 일기 (메시지 입력, 요약 뷰)
│   ├── library/        # 보관함 (파일 업로드, 그리드)
│   ├── layout/         # 레이아웃 (네비게이션, 사이드바)
│   └── ui/             # shadcn/ui 기본 컴포넌트
├── contexts/           # React Context (Auth, Theme)
├── hooks/              # 커스텀 훅
├── i18n/               # 다국어 설정 및 번역 파일
├── pages/              # 페이지 컴포넌트
├── services/           # API 서비스 클래스
├── types/              # TypeScript 타입 정의
└── utils/              # 헬퍼 함수
```

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/auth` | 로그인/회원가입 |
| `/journal` | 일기 작성 (메시지 입력 → AI 요약) |
| `/library` | 추억 보관함 (사진/동영상/문서 관리) |
| `/history` | 히스토리 (AI 요약 일기 목록) |
| `/mypage` | 마이페이지 |

## 실행

```bash
npm install
cp .env.example .env  # 환경변수 설정
npm run dev           # → http://localhost:5173
```

## 빌드

```bash
npm run build:dev     # 개발 빌드
npm run build:prod    # 프로덕션 빌드
```
