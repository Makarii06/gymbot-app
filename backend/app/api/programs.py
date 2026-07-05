from fastapi import APIRouter
from app.api.endpoints.programs import router as programs_router

router = APIRouter()
router.include_router(programs_router, tags=["programs"])