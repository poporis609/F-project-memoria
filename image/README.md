# Image Generator Proxy (이미지 생성 프록시)

Bedrock Agent Core Runtime을 호출하여 일기 내용 기반 이미지를 생성하는 프록시 서버입니다. Claude Sonnet으로 프롬프트를 생성하고, Nova Canvas로 이미지를 생성한 뒤 S3에 저장합니다.

## 기술 스택

- **Node.js** + **TypeScript**
- **AWS Bedrock Agent Runtime** - Strands AI Agent 호출
- **Claude Sonnet 4.5** - 이미지 프롬프트 생성
- **Nova Canvas** - 이미지 생성
- **AWS S3** - 이미지 저장
- **OpenTelemetry** - 분산 트레이싱

## 아키텍처

```
Client → Image Proxy → Bedrock Agent Core Runtime → Strands AI Agent
                                                          ├── Claude Sonnet (프롬프트 생성)
                                                          ├── Nova Canvas (이미지 생성)
                                                          ├── S3 (저장)
                                                          └── PostgreSQL (메타데이터)
```

## 프로젝트 구조

```
image/
├── src/
│   ├── server.ts          # 메인 서버 (Express + API 라우트)
│   └── tracing.ts         # OpenTelemetry 설정
├── scripts/               # 유틸리티 스크립트
├── k8s/                   # K8s 매니페스트
├── argocd-application.yaml
├── Dockerfile
└── package.json
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/image/health` | 헬스체크 |
| GET | `/image/histories/without-image` | 이미지 없는 히스토리 조회 |
| GET | `/image/histories/:id` | 특정 히스토리 조회 |
| POST | `/image/histories/:id/generate-image` | 이미지 생성 + S3 저장 |
| POST | `/image/histories/:id/preview-image` | 이미지 미리보기 |
| POST | `/image/histories/:id/confirm-image` | 미리보기 확정 저장 |
| POST | `/image/histories/batch-generate` | 배치 이미지 생성 |
| POST | `/image/generate` | 텍스트로 직접 이미지 생성 |
| POST | `/image/build-prompt` | 프롬프트만 생성 |

## 실행

```bash
npm install
cp .env.example .env
npm run dev    # 개발 모드
npm start      # 프로덕션
```
