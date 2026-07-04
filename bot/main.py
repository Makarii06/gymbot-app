import asyncio
import os
import sys
from datetime import datetime

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.future import select
from sqlalchemy import BigInteger, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# 1. Зчитуємо конфігурацію з оточення Докера
BOT_TOKEN = os.getenv("BOT_TOKEN")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_DB = os.getenv("POSTGRES_DB")
WEBAPP_URL = os.getenv("NGROK_DOMAIN")  # Твій постійний домен Ngrok

if not WEBAPP_URL.startswith("http"):
    WEBAPP_URL = f"https://{WEBAPP_URL}"

# Збираємо рядок підключення до БД (всередині Докера хост бази — 'db')
DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@db:5432/{POSTGRES_DB}"

# 2. Налаштування SQLAlchemy для бота
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# Описуємо модель користувача, щоб бот міг читати/писати в ту саму таблицю 'users'
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str] = mapped_column(String, nullable=True)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    is_trainer: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

# 3. Ініціалізація бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(message: types.Message, command: CommandObject):
    tg_id = message.from_user.id
    first_name = message.from_user.first_name or ""
    last_name = message.from_user.last_name or ""
    username = message.from_user.username
    full_name = f"{first_name} {last_name}".strip() or f"User_{tg_id}"

    # Обробка реферального посилання для тренерів (якщо є параметр start=ref_123)
    args = command.args
    url_with_params = WEBAPP_URL
    if args:
        url_with_params = f"{WEBAPP_URL}?start_param={args}"

    is_new_user = False

    # Перевіряємо або створюємо користувача в БД
    async with AsyncSessionLocal() as session:
        async with session.begin():
            query = select(User).where(User.tg_id == tg_id)
            result = await session.execute(query)
            user = result.scalar_one_or_none()

            if not user:
                # Якщо користувача немає — реєструємо його відразу з бота!
                user = User(
                    tg_id=tg_id,
                    username=username,
                    full_name=full_name,
                    is_trainer=False
                )
                session.add(user)
                is_new_user = True
                print(f"[BOT] Автоматично зареєстровано нового користувача через /start: {full_name}")

    # Формуємо клавіатуру для запуску Mini App
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Відкрити GymBot 💪", web_app=WebAppInfo(url=url_with_params))]
    ])

    # Динамічний текст повідомлення залежно від статусу користувача
    if is_new_user:
        welcome_text = (
            f"Вітаю, {first_name}! 👋\n\n"
            f"💪 Радий бачити тебе у **GymBot**! Ти тут **вперше**, і це чудовий початок твоєї нової фітнес-історії.\n\n"
            f"Я допоможу тобі створювати вправи, планувати тренування та відстежувати прогрес замеров тіла. "
            f"Тисни кнопку нижче, щоб розігрітися та відкрити застосунок!"
        )
    else:
        welcome_text = (
            f"Радий знову бачити тебе, {first_name}! 🏋️‍♂️🔥\n\n"
            f"Твій залізобетонний характер на місці, а отже — час ставати ще сильнішим! "
            f"Всі твої програми тренувань, статистика та плани вже чекають на тебе всередині.\n\n"
            f"Тисни кнопку нижче і до справи!"
        )

    await message.answer(welcome_text, reply_markup=keyboard, parse_mode="Markdown")

async def main():
    print("[BOT] Telegram чат-бот успішно запущено...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())