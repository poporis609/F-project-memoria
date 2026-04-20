# Weekly Report Service (주간 리포트)

Strands AI Agent 기반 주간 일기 분석 및 감정 리포트 서비스입니다. Lambda + EventBridge로 주간 자동 실행되며, 감정 트렌드 분석과 개인화된 조언을 제공합니다.

## 기술 스택

- **FastAPI** + **SQLAlchemy** (PostgreSQL)
- **Strands Agents** + **AWS Bedrock** (Claude) - AI 감정 분석
- **AWS Lambda + EventBridge** - 주간 자동 실행 스케줄러
- **Cognito JWT** - 인증
- **SES** - 이메일 발송
- **OpenTelemetry** - 분산 트레이싱

## 프로젝트 구조

```
reports/
├── app/
│   ├── main.py              # FastAPI 앱
│   ├── api/
│   │   └── endpoints/
│   │       └── report.py    # 리포트 생성/조회 API
│   ├── config/settings.py   # 환경변수 설정
│   ├── core/startup.py      # 앱 초기화
│   ├── models/              # DB 모델 (History, User, WeeklyReport)
│   ├── repositories/        # Repository 패턴 (데이터 접근 계층)
│   └── services/
│       ├── cognito_service.py  # Cognito 사용자 조회
│       ├── email_service.py    # SES 이메일 발송
│       ├── report_service.py   # 리포트 생성 비즈니스 로직
│       ├── s3_service.py       # S3 히스토리 텍스트 조회
│       └── strands_service.py  # Strands AI 감정 분석
├── lambda/
│   └── weekly_report_scheduler/  # Lambda 스케줄러 (EventBridge 트리거)
├── infra/                        # AWS IAM 정책, EventBridge 설정
├── k8s/                          # K8s 배포 매니페스트
├── tests/                        # 테스트 코드
├── Dockerfile
└── requirements.txt
```

## API 엔드포인트

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/health` | 헬스체크 | ❌ |
| POST | `/reports/generate` | 주간 리포트 생성 | ✅ |
| GET | `/reports/{user_id}` | 리포트 조회 | ✅ |
| GET | `/reports/{user_id}/latest` | 최신 리포트 조회 | ✅ |

## 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env

# 서버 실행
uvicorn app.main:app --reload

# API 문서: http://localhost:8000/docs
```
