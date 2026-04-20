# 기억의 도서관 (Memory Library) 📚

일상의 순간을 기록하고, AI가 요약·분석·이미지 생성까지 해주는 **개인 일기 관리 플랫폼**입니다.

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│   FProject-web (React + TypeScript + Vite)                   │
│   - 일기 작성, 추억 보관함, 히스토리, 마이페이지              │
└───────────┬────────────┬──────────────┬──────────────────────┘
            │            │              │
    ┌───────▼──┐   ┌─────▼─────┐  ┌────▼─────┐
    │ auth     │   │ journal   │  │ library  │
    │ (Node)   │   │ (FastAPI) │  │ (FastAPI) │
    │ 인증/계정│   │ 메시지/   │  │ 파일     │
    │ 관리     │   │ 히스토리  │  │ 업로드/  │
    └──────────┘   └─────┬─────┘  │ 관리     │
                         │        └──────────┘
                  ┌──────▼──────┐
                  │ Fproject-   │
                  │ agent       │─────────────┐
                  │ (FastAPI +  │             │
                  │ Strands AI) │        ┌────▼─────┐
                  └──────┬──────┘        │ reports  │
                         │               │ (FastAPI) │
                  ┌──────▼──────┐        │ 주간     │
                  │ image       │        │ 리포트   │
                  │ (Node)      │        └──────────┘
                  │ 이미지 생성 │
                  │ 프록시      │
                  └─────────────┘

인프라: AWS EKS + ArgoCD (GitOps) + ALB
AI/ML: AWS Bedrock (Claude Sonnet 4.5, Nova Canvas)
DB: PostgreSQL (RDS)
스토리지: AWS S3 + Cognito (인증)
모니터링: Arize Phoenix + OpenTelemetry
```

---

## 프로젝트 구성

| 디렉토리 | 역할 | 기술 스택 | 설명 |
|-----------|------|-----------|------|
| **FProject-web** | Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui | 웹 UI (일기, 보관함, 히스토리) |
| **Fproject-agent** | AI Agent | FastAPI, Strands Agents, AWS Bedrock | Multi-Agent 오케스트레이터 (질문/요약/이미지/리포트) |
| **auth** | 인증 API | Node.js, Express, TypeScript | 사용자 프로필, 계정 관리, Cognito 연동 |
| **image** | 이미지 프록시 | Node.js, TypeScript | Bedrock Agent Runtime → 이미지 생성/저장 |
| **journal** | 일기 API | FastAPI, SQLAlchemy, PostgreSQL | 메시지 CRUD, AI 요약, S3 저장 |
| **library-backend** | 보관함 API | FastAPI, SQLAlchemy, PostgreSQL | 파일 업로드(S3 Presigned URL), 라이브러리 관리 |
| **reports** | 주간 리포트 | FastAPI, Strands Agents, Lambda | 감정 분석, 주간 요약 리포트, 이메일 발송 |

---

## 핵심 기능

### 📝 일기 작성 & AI 요약
- 실시간 메시지 입력 → 자동 분류 (데이터/질문/일기)
- Strands AI Agent가 하루치 메시지를 문학적 일기로 요약
- 히스토리 DB + S3 이중 저장

### 🎨 AI 이미지 생성
- Claude Sonnet으로 일기 내용 기반 프롬프트 생성
- Nova Canvas로 일러스트레이션 자동 생성
- 미리보기 → 확정 저장 플로우

### 📊 주간 감정 분석 리포트
- Lambda + EventBridge로 주간 자동 실행
- 감정 트렌드 분석 + 개인화된 조언
- 이메일 발송

### 🔐 인증 & 보안
- AWS Cognito 기반 OAuth 2.0 인증
- JWT 토큰 검증 미들웨어
- Lambda를 통한 계정 삭제 처리

### 📸 추억 보관함
- S3 Presigned URL을 통한 안전한 파일 업/다운로드
- 사진, 동영상, 문서 관리
- 공개/비공개 설정

---

## 빠른 시작

### 사전 요구사항
- **Node.js 18+** (Frontend, auth, image)
- **Python 3.8+** (journal, library-backend, reports, agent)
- **PostgreSQL** (journal, library-backend, reports)
- **AWS 계정** (Cognito, S3, Bedrock, Secrets Manager)

### 1. 환경 변수 설정
각 프로젝트의 `.env.example`을 복사하여 `.env` 파일 생성:
```bash
# 각 프로젝트 폴더에서
cp .env.example .env
# .env 파일을 편집하여 실제 값 설정
```

### 2. 백엔드 실행

```bash
# journal API (Python)
cd journal
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# library-backend (Python)
cd library-backend
pip install -r requirements.txt
python run_server.py

# auth API (Node.js)
cd auth
npm install
npm run dev

# image proxy (Node.js)
cd image
npm install
npm run dev
```

### 3. AI Agent 실행

```bash
cd Fproject-agent
pip install -r requirements.txt
python run.py
```

### 4. Frontend 실행

```bash
cd FProject-web
npm install
npm run dev
# → http://localhost:5173
```

---

## 배포 (GitOps)

```
코드 Push → GitHub Actions → Docker Build → ECR Push → ArgoCD Sync → EKS 배포
```

각 서비스는 독립적인 Docker 이미지로 빌드되며, K8s manifest(`k8s/`)를 통해 EKS에 배포됩니다.

---

## 모니터링

- **Arize Phoenix**: AI Agent 호출 추적 및 분석
- **OpenTelemetry**: 분산 트레이싱 (FastAPI, httpx, SQLAlchemy 자동 계측)
- **K8s Probes**: liveness/readiness 헬스체크

---

## 프로젝트별 상세 정보

각 서비스의 상세 설명은 해당 디렉토리의 `README.md`를 참조하세요.

---

**Made with ❤️ using React, FastAPI, Strands AI, and AWS**
