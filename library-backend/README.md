# Library Backend (추억 보관함 API)

FastAPI 기반 파일 관리 백엔드 서비스입니다. S3 Presigned URL을 통한 안전한 파일 업로드/다운로드와 라이브러리 아이템 CRUD를 제공합니다.

## 기술 스택

- **FastAPI** + **SQLAlchemy** (asyncpg)
- **PostgreSQL** - 메타데이터 저장
- **AWS S3** - 파일 저장 (Presigned URL)
- **Cognito JWT** - 인증
- **Alembic** - DB 마이그레이션

## 프로젝트 구조

```
library-backend/
├── app/
│   ├── main.py              # FastAPI 앱 (lifespan, CORS, 예외처리)
│   ├── api/
│   │   ├── deps.py          # Cognito JWT 인증 의존성
│   │   └── v1/
│   │       ├── library_items.py  # 라이브러리 CRUD 엔드포인트
│   │       ├── upload.py         # 파일 업로드 (Presigned URL)
│   │       └── users.py         # 사용자 관리
│   ├── core/config.py       # 설정 (환경변수, DB URL)
│   ├── database/            # DB 연결, 세션 관리
│   ├── models/              # SQLAlchemy 모델 (User, LibraryItem)
│   ├── schemas/             # Pydantic 스키마
│   └── services/
│       ├── file_service.py  # 파일 처리 로직
│       └── s3_service.py    # S3 Presigned URL 생성
├── alembic/                 # DB 마이그레이션
├── k8s-deployment.yaml      # K8s 배포 설정
├── Dockerfile
└── requirements.txt
```

## API 엔드포인트

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/library/health` | 헬스체크 | ❌ |
| GET | `/library/items` | 아이템 목록 조회 | ✅ |
| POST | `/library/items` | 아이템 생성 | ✅ |
| GET | `/library/items/{id}` | 아이템 상세 조회 | ✅ |
| PUT | `/library/items/{id}` | 아이템 수정 | ✅ |
| DELETE | `/library/items/{id}` | 아이템 삭제 | ✅ |
| POST | `/library/upload/presigned-url` | 업로드 Presigned URL 발급 | ✅ |
| GET | `/library/upload/download-url/{key}` | 다운로드 Presigned URL 발급 | ✅ |

## 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env

# 서버 실행
python run_server.py

# API 문서: http://localhost:8000/library/docs
```
