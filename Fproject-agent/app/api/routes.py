"""
API Routes
"""
from fastapi import APIRouter
from app.api.endpoints import health, agent, image, report, summarize, question

router = APIRouter()

# All endpoints under /agent prefix
router.include_router(health.router, prefix="/agent", tags=["health"])
router.include_router(agent.router, prefix="/agent", tags=["agent"])
router.include_router(image.router, prefix="/agent/image", tags=["image"])
router.include_router(report.router, prefix="/agent/report", tags=["report"])
router.include_router(summarize.router, prefix="/agent/summarize", tags=["summarize"])
router.include_router(question.router, prefix="/agent/question", tags=["question"])
