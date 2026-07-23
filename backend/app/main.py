import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db, engine
from app.models import Base, User
from app.auth import get_current_user
from app.api.exercises import router as exercises_router
from app.api.workout_days import router as workout_days_router
from app.api.programs import router as programs_router
from app.api.tags import router as tags_router
from app.api.sessions import router as sessions_router

app = FastAPI(title="GymBot API", version="0.3.0")

MEDIA_DIR = "/app/media"
os.makedirs(MEDIA_DIR, exist_ok=True)

# Роздача статичних медіафайлів через FastAPI
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Безпечне додавання нових колонок (ігноруємо помилку якщо вже існує)
        migrations = [
            "ALTER TABLE training_sessions ADD COLUMN description TEXT",
            "ALTER TABLE training_sessions ADD COLUMN rest_duration_seconds INTEGER DEFAULT 90",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass  # Колонка вже існує
    print("Усі таблиці бази даних успішно перевірено/створено!")



@app.get("/")
async def root():
    return {"status": "ok", "message": "Welcome to GymBot API v0.3"}


@app.get("/api/db-test")
async def test_db_connection(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "success", "database": "connected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "tg_id": current_user.tg_id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "is_trainer": current_user.is_trainer,
        "created_at": current_user.created_at
    }


# Підключаємо всі роутери
app.include_router(exercises_router)
app.include_router(workout_days_router)
app.include_router(programs_router)
app.include_router(tags_router)
app.include_router(sessions_router)
