from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Tag, UserTag
from app.schemas import TagResponse, TagCreate

router = APIRouter(prefix="/api/tags", tags=["Tags"])


@router.get("/", response_model=List[TagResponse])
async def get_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Повертає всі теги доступні користувачеві:
    - Системні теги (is_system=True)
    - Власні теги користувача (через USER_TAG)
    """
    # Системні теги
    sys_result = await db.execute(select(Tag).where(Tag.is_system == True))
    system_tags = sys_result.scalars().all()

    # Власні теги користувача
    user_result = await db.execute(
        select(Tag)
        .join(UserTag, UserTag.tag_id == Tag.id)
        .where(UserTag.user_id == current_user.id, Tag.is_system == False)
    )
    user_tags = user_result.scalars().all()

    # Об'єднуємо, уникаємо дублікатів
    seen_ids = set()
    result = []
    for tag in list(system_tags) + list(user_tags):
        if tag.id not in seen_ids:
            seen_ids.add(tag.id)
            result.append(tag)

    return sorted(result, key=lambda t: (not t.is_system, t.name))


@router.post("/", response_model=TagResponse)
async def create_or_link_tag(
    payload: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Створює або прив'язує тег до користувача.
    - Ім'я тегу завжди приводиться до нижнього регістру.
    - Якщо тег вже існує в базі — просто створюємо USER_TAG зв'язок.
    - Якщо тег ще не існує — створюємо Tag і USER_TAG.
    - Системні теги можна "приєднати" через USER_TAG (не змінюючи is_system).
    """
    tag_name = payload.name.strip().lower()
    if not tag_name:
        raise HTTPException(status_code=400, detail="Назва тегу не може бути порожньою")

    # Шукаємо існуючий тег
    tag_result = await db.execute(select(Tag).where(Tag.name == tag_name))
    tag = tag_result.scalar_one_or_none()

    if not tag:
        # Тег не існує — створюємо
        tag = Tag(name=tag_name, is_system=False)
        db.add(tag)
        await db.flush()

    # Перевіряємо чи вже є USER_TAG зв'язок
    if not tag.is_system:
        ut_result = await db.execute(
            select(UserTag).where(
                UserTag.user_id == current_user.id,
                UserTag.tag_id == tag.id
            )
        )
        existing_ut = ut_result.scalar_one_or_none()
        if not existing_ut:
            user_tag = UserTag(user_id=current_user.id, tag_id=tag.id)
            db.add(user_tag)

    await db.commit()
    await db.refresh(tag)
    return tag
