from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# Створюємо асинхронний двигун з пулом з'єднань
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,  # Показуватиме всі SQL-запити в терміналі докера (ідеально для розробки)
    future=True
)

# Фабрика для створення асинхронних сесій
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Залежність (Dependency Injection) для маршрутів FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()