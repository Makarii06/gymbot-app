from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db, engine
from app.models import Base, User
from app.auth import get_current_user
from app.api.exercises import router as exercises_router

app = FastAPI(title="GymBot API", version="0.1.0")

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Усі таблиці бази даних успішно перевірено/створено!")

@app.get("/")
async def root():
    return {"status": "ok", "message": "Welcome to GymBot API"}

@app.get("/api/db-test")
async def test_db_connection(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "success", "database": "connected successfully and models initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Новий ендпоінт для авторизації та отримання профілю
@app.get("/api/users/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Повертає профіль поточного користувача. 
    Завдяки Depends(get_current_user), користувач створиться автоматично, якщо він новий.
    """
    return {
        "id": current_user.id,
        "tg_id": current_user.tg_id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "is_trainer": current_user.is_trainer,
        "created_at": current_user.created_at
    }

# Підключаємо маршрути для вправ
app.include_router(exercises_router)
