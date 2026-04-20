# Journal API (일기 관리)

FastAPI 기반 일기 및 메시지 관리 시스템입니다. 메시지 저장, AI 자동 분류/요약, S3 이중 저장 기능을 제공합니다.

## 기술 스택

- **FastAPI** + **SQLAlchemy** (PostgreSQL)
- **AWS S3** - 일기 텍스트 파일 저장
- **AWS Secrets Manager** - 프로덕션 시크릿 관리
- **httpx** - Agent API 비동기 호출
- **OpenTelemetry** - 분산 트레이싱 (FastAPI, httpx, SQLAlchemy 자동 계측)

## 프로젝트 구조

```
journal/
├── main.py              # FastAPI 앱
├── database.py          # DB 연결 관리
├── config.py            # 설정 (로컬 .env / 프로덕션 Secrets Manager)
├── tracing.py           # OpenTelemetry 설정
├── models/              # SQLAlchemy 모델
│   ├── message.py       # Messages 테이블
│   └── history.py       # History 테이블
├── schemas/             # Pydantic 스키마
│   ├── message.py
│   ├── history.py
│   └── summary.py
├── routers/             # FastAPI 라우터
│   ├── agent.py         # Flow API (자동 분류 + 처리)
│   ├── messages.py      # 메시지 CRUD
│   ├── history.py       # 히스토리 CRUD + 검색
│   └── summary.py       # AI 요약 생성
├── services/
│   ├── agent_api.py     # Agent API 호출
│   └── s3.py            # S3 파일 저장/조회
├── k8s/                 # K8s 매니페스트
├── Dockerfile
└── requirements.txt
```

## 주요 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/journal/messages` | 메시지 저장 |
| GET | `/journal/messages` | 오늘 메시지 조회 (KST 기준) |
| POST | `/journal/process` | 통합 처리 (자동 분류: 데이터/질문/일기) |
| POST | `/journal/summary` | AI 요약 생성 → History + S3 저장 |
| GET | `/journal/summary/check/{user_id}` | 오늘 요약 존재 확인 |
| GET | `/journal/history` | 히스토리 조회 (날짜/태그 필터) |
| GET | `/journal/history/search` | 키워드 검색 |

## 데이터 흐름

```
사용자 입력 → /process → Agent API 분류
                          ├── "데이터" → Messages 테이블 저장
                          ├── "질문"  → AI 답변 반환 (저장 안함)
                          └── "일기"  → /summary → History 테이블 + S3 텍스트 저장
```

## 실행

```bash
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload    # → http://localhost:8000/journal/docs
```
