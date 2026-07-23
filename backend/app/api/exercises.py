import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models import User, Exercise, Tag, ExerciseTag, ExerciseMuscle, MuscleGroup, ExerciseMedia, UserTag
from app.schemas import ExerciseCreate, ExerciseUpdate, ExerciseResponse, ExerciseMediaResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])

MEDIA_DIR = "/app/media/exercises"
os.makedirs(MEDIA_DIR, exist_ok=True)


def _exercise_query():
    """Базовий запит на вправи з усіма залежностями."""
    return (
        select(Exercise)
        .options(
            selectinload(Exercise.exercise_tags).selectinload(ExerciseTag.tag),
            selectinload(Exercise.muscles).selectinload(ExerciseMuscle.muscle_group),
            selectinload(Exercise.media),
        )
    )


def _build_exercise_response(exercise: Exercise) -> dict:
    """Конвертує ORM об'єкт у dict для ExerciseResponse."""
    return {
        "id": exercise.id,
        "owner_id": exercise.owner_id,
        "source_exercise_id": exercise.source_exercise_id,
        "name": exercise.name,
        "description": exercise.description,
        "is_public": exercise.is_public,
        "created_at": exercise.created_at,
        "tags": [et.tag for et in exercise.exercise_tags if et.tag],
        "muscles": exercise.muscles,
        "media": sorted(exercise.media, key=lambda m: m.position),
    }


async def _apply_tags(db, exercise_id: int, tag_names: List[str], owner_id: int):
    """Застосовує теги: lowercase → знаходить або створює → прив'язує до вправи."""
    for tag_name in tag_names:
        tag_name_clean = tag_name.strip().lower()
        if not tag_name_clean:
            continue
        tag_query = select(Tag).where(Tag.name == tag_name_clean)
        tag_res = await db.execute(tag_query)
        tag = tag_res.scalar_one_or_none()

        if not tag:
            tag = Tag(name=tag_name_clean, is_system=False)
            db.add(tag)
            await db.flush()

        # Додаємо USER_TAG зв'язок якщо не системний
        if not tag.is_system:
            ut_check = await db.execute(
                select(UserTag).where(UserTag.user_id == owner_id, UserTag.tag_id == tag.id)
            )
            if not ut_check.scalar_one_or_none():
                db.add(UserTag(user_id=owner_id, tag_id=tag.id))

        et_check = await db.execute(
            select(ExerciseTag).where(
                ExerciseTag.exercise_id == exercise_id,
                ExerciseTag.tag_id == tag.id
            )
        )
        if not et_check.scalar_one_or_none():
            db.add(ExerciseTag(exercise_id=exercise_id, tag_id=tag.id))


# ==========================================
# CRUD ДЛЯ ВПРАВ
# ==========================================

@router.get("/", response_model=List[ExerciseResponse])
async def get_exercises(
    muscle_group_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = _exercise_query().where(
        (Exercise.owner_id == current_user.id) | (Exercise.is_public == True)
    )
    if muscle_group_id:
        query = query.join(ExerciseMuscle).where(ExerciseMuscle.muscle_group_id == muscle_group_id)

    result = await db.execute(query)
    exercises = result.scalars().unique().all()
    return [_build_exercise_response(ex) for ex in exercises]


@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    payload: ExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_exercise = Exercise(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        is_public=payload.is_public
    )
    db.add(new_exercise)
    await db.flush()

    for m in payload.muscles:
        db.add(ExerciseMuscle(
            exercise_id=new_exercise.id,
            muscle_group_id=m.muscle_group_id,
            coefficient=m.coefficient
        ))

    await _apply_tags(db, new_exercise.id, payload.tag_names, current_user.id)

    await db.commit()
    result = await db.execute(_exercise_query().where(Exercise.id == new_exercise.id))
    exercise = result.scalars().unique().one()
    return _build_exercise_response(exercise)


@router.put("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: int,
    payload: ExerciseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(_exercise_query().where(Exercise.id == exercise_id))
    exercise = result.scalars().unique().one_or_none()

    if not exercise:
        raise HTTPException(status_code=404, detail="Вправу не знайдено")
    if exercise.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав для редагування")

    if payload.name is not None:
        exercise.name = payload.name
    if payload.description is not None:
        exercise.description = payload.description
    if payload.is_public is not None:
        exercise.is_public = payload.is_public

    if payload.tag_names is not None:
        for et in list(exercise.exercise_tags):
            await db.delete(et)
        await db.flush()
        await _apply_tags(db, exercise.id, payload.tag_names, current_user.id)

    if payload.muscles is not None:
        for m in list(exercise.muscles):
            await db.delete(m)
        await db.flush()
        for m in payload.muscles:
            db.add(ExerciseMuscle(
                exercise_id=exercise.id,
                muscle_group_id=m.muscle_group_id,
                coefficient=m.coefficient
            ))

    await db.commit()
    result = await db.execute(_exercise_query().where(Exercise.id == exercise_id))
    exercise = result.scalars().unique().one()
    return _build_exercise_response(exercise)


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Exercise).options(selectinload(Exercise.media)).where(Exercise.id == exercise_id)
    )
    exercise = result.scalars().unique().one_or_none()

    if not exercise:
        raise HTTPException(status_code=404, detail="Вправу не знайдено")
    if exercise.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав для видалення")

    # Видаляємо медіафайли з диску
    for media in exercise.media:
        file_path = media.url.replace("/media/exercises/", MEDIA_DIR + "/", 1)
        if os.path.exists(file_path):
            os.remove(file_path)

    await db.delete(exercise)
    await db.commit()
    return None


# ==========================================
# МЕДІА ВПРАВИ
# ==========================================

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
MAX_FILE_SIZE_MB = 50


@router.post("/{exercise_id}/media", response_model=ExerciseMediaResponse, status_code=status.HTTP_201_CREATED)
async def upload_exercise_media(
    exercise_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Завантажує фото або відео до вправи."""
    result = await db.execute(
        select(Exercise).options(selectinload(Exercise.media)).where(Exercise.id == exercise_id)
    )
    exercise = result.scalars().unique().one_or_none()

    if not exercise:
        raise HTTPException(status_code=404, detail="Вправу не знайдено")
    if exercise.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = "image"
        ext = content_type.split("/")[-1]
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = "video"
        ext = "mp4" if "mp4" in content_type else "mov"
    else:
        raise HTTPException(status_code=400, detail=f"Непідтримуваний тип файлу: {content_type}")

    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(MEDIA_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    position = len(exercise.media)
    media = ExerciseMedia(
        exercise_id=exercise_id,
        url=f"/media/exercises/{filename}",
        media_type=media_type,
        position=position
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    return media


@router.delete("/{exercise_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise_media(
    exercise_id: int,
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Видаляє конкретний медіафайл вправи."""
    media_result = await db.execute(
        select(ExerciseMedia).where(
            ExerciseMedia.id == media_id,
            ExerciseMedia.exercise_id == exercise_id
        )
    )
    media = media_result.scalar_one_or_none()

    if not media:
        raise HTTPException(status_code=404, detail="Медіафайл не знайдено")

    ex_result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = ex_result.scalar_one_or_none()
    if not exercise or exercise.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    # Видаляємо файл з диску
    file_path = media.url.replace("/media/exercises/", MEDIA_DIR + "/", 1)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(media)
    await db.commit()
    return None


@router.put("/{exercise_id}/media/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_exercise_media(
    exercise_id: int,
    order: List[int],  # список media_id в новому порядку
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Змінює порядок медіафайлів вправи."""
    ex_result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = ex_result.scalar_one_or_none()
    if not exercise or exercise.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    for pos, media_id in enumerate(order):
        media_result = await db.execute(
            select(ExerciseMedia).where(
                ExerciseMedia.id == media_id,
                ExerciseMedia.exercise_id == exercise_id
            )
        )
        media = media_result.scalar_one_or_none()
        if media:
            media.position = pos

    await db.commit()
    return None


@router.post("/{exercise_id}/copy", response_model=ExerciseResponse)
async def copy_exercise_to_my_catalog(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Глибоке копіювання вправи у свій каталог."""
    orig_result = await db.execute(_exercise_query().where(Exercise.id == exercise_id))
    orig_exercise = orig_result.scalars().unique().one_or_none()

    if not orig_exercise:
        raise HTTPException(status_code=404, detail="Оригінал вправи не знайдено")
    if orig_exercise.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Ця вправа вже є у вашому каталозі")

    copied_exercise = Exercise(
        owner_id=current_user.id,
        source_exercise_id=orig_exercise.id,
        name=f"{orig_exercise.name} (Копія)",
        description=orig_exercise.description,
        is_public=False
    )
    db.add(copied_exercise)
    await db.flush()

    for orig_muscle in orig_exercise.muscles:
        db.add(ExerciseMuscle(
            exercise_id=copied_exercise.id,
            muscle_group_id=orig_muscle.muscle_group_id,
            coefficient=orig_muscle.coefficient
        ))

    for orig_et in orig_exercise.exercise_tags:
        db.add(ExerciseTag(exercise_id=copied_exercise.id, tag_id=orig_et.tag_id))

    # Медіа не копіюємо — посилання на ті ж файли, але нові записи в БД
    for orig_media in orig_exercise.media:
        db.add(ExerciseMedia(
            exercise_id=copied_exercise.id,
            url=orig_media.url,
            media_type=orig_media.media_type,
            position=orig_media.position
        ))

    await db.commit()
    result = await db.execute(_exercise_query().where(Exercise.id == copied_exercise.id))
    exercise = result.scalars().unique().one()
    return _build_exercise_response(exercise)