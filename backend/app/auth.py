import hashlib
import hmac
import json
from urllib.parse import unquote
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.database import get_db
from app.models import User

# У реальному режимі залишаємо контроль за FastAPI, але обробку помилок робимо самі
security = HTTPBearer(auto_error=False)

def verify_telegram_init_data(init_data: str) -> dict:
    """
    Строга офіційна валідація Telegram initData.
    Обчислює HMAC-SHA256 на основі BOT_TOKEN і порівнює з надісланим хешем.
    """
    if not init_data or init_data == "undefined":
        raise HTTPException(status_code=401, detail="Missing or undefined initData")

    try:
        # Розбираємо параметри url-строки
        pairs = init_data.split('&')
        parsed_data = {}
        for pair in pairs:
            if '=' in pair:
                k, v = pair.split('=', 1)
                parsed_data[k] = v
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid initData format")

    if "hash" not in parsed_data:
        raise HTTPException(status_code=401, detail="Missing hash in initData")

    tg_hash = parsed_data.pop("hash")
    
    # Сортуємо параметри за алфавітом. Значення для check_string мають бути в unquote форматі
    data_check_string = "\n".join(f"{k}={unquote(v)}" for k, v in sorted(parsed_data.items()))

    # 1. Створюємо секретний ключ за допомогою константи 'WebAppData' та токена бота
    secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    
    # 2. Обчислюємо фінальний хеш від сформованого рядка даних
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    # Спроба 2: деякі версії Telegram (особливо на iOS/Desktop) вимагають сирий check_string без unquote
    if calculated_hash != tg_hash:
        data_check_string_raw = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        calculated_hash_raw = hmac.new(secret_key, data_check_string_raw.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash_raw != tg_hash:
            print("[SECURITY WARNING] Спроба зламу чи невалідний токен бота! Хеші не збігаються.")
            raise HTTPException(status_code=401, detail="Invalid Telegram signature (Data compromised)")

    # Якщо перевірка успішна — витягуємо JSON користувача
    user_encoded = parsed_data.get("user")
    if not user_encoded:
        raise HTTPException(status_code=400, detail="User parameter missing in initData")

    return json.loads(unquote(user_encoded))


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Головна залежність для захисту ендпоінтів. 
    Гарантує, що запит надіслано реальним користувачем зсередини офіційного Telegram.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated (Empty credentials)")
        
    init_data = credentials.credentials
    
    # Запускаємо строгу валідацію підпису
    tg_user = verify_telegram_init_data(init_data)
    
    tg_id = tg_user.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="Telegram ID missing")

    # Шукаємо атлета в базі
    query = select(User).where(User.tg_id == tg_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    # Якщо користувач пройшов криптографічну перевірку, але його ще немає в БД — створюємо
    if not user:
        user = User(
            tg_id=tg_id,
            username=tg_user.get("username"),
            full_name=f"{tg_user.get('first_name', '')} {tg_user.get('last_name', '')}".strip() or None,
            is_trainer=False
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"[API CORE] Успішно авторизовано та створено нового користувача: ID {user.id}")

    return user