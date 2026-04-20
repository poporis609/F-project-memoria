# Fproject-agent (AI Agent 오케스트레이터)

Strands AI 기반 Multi-Agent 일기 관리 시스템입니다. 사용자 입력을 자동 분류하고 질문 답변, 일기 생성, 이미지 생성, 주간 리포트 기능을 수행합니다.

## 기술 스택

- **FastAPI** - API 서버
- **Strands Agents** - AI Agent 프레임워크
- **AWS Bedrock** - Claude Sonnet 4.5 (텍스트), Nova Canvas (이미지)
- **Arize Phoenix** - AI 모니터링 및 트레이싱
- **OpenTelemetry** - 분산 트레이싱

## 아키텍처

```
사용자 입력 → Orchestrator Agent → 분류
                                    ├── "데이터" → 메시지 저장
                                    ├── "질문"  → Knowledge Base 검색 → 답변
                                    └── "일기"  → 요약 Agent → 일기 생성
                                                   └── 이미지 Agent → 일러스트 생성
```

## 프로젝트 구조

```
app/
├── api/endpoints/          # API 엔드포인트
├── services/
│   ├── orchestrator/
│   │   ├── orchestra_agent.py    # 메인 오케스트레이터
│   │   ├── question/             # 질문 답변 Agent
│   │   ├── summarize/            # 일기 생성 Agent
│   │   ├── image_generator/      # 이미지 생성 Agent
│   │   └── weekly_report/        # 주간 리포트 Agent
│   └── utils/              # 유틸리티
├── core/                   # 설정, 트레이싱
└── schemas/                # 요청/응답 스키마
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/agent` | 오케스트레이터 (자동 분류 + 처리) |
| POST | `/agent/image` | 이미지 생성 |
| POST | `/agent/report` | 주간 리포트 생성 |
| POST | `/agent/summarize` | 일기 요약 생성 |

## 실행

```bash
pip install -r requirements.txt
cp .env.example .env
python run.py    # → http://localhost:8000
```
