"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.config import settings, TracingConfig
from app.core.startup import startup_handler
from app.core.tracing import init_tracing, shutdown_tracing

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Diary Orchestrator Agent API"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup():
    # Phoenix 트레이싱 초기화
    tracing_config = TracingConfig.from_environment()
    init_tracing(tracing_config)
    
    await startup_handler()

# Shutdown event
@app.on_event("shutdown")
async def shutdown():
    # 트레이싱 정상 종료
    shutdown_tracing()

# Include routers
app.include_router(router)
