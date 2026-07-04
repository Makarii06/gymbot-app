from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models import User, Exercise, Tag, ExerciseTag, ExerciseMuscle, MuscleGroup
from app.schemas import ExerciseCreate, ExerciseResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])

@router.get("/", response_model=List[ExerciseResponse])
async def get_exercises(
    muscle_group_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Повертає список доступних вправ:
    - Системні вправи (де власник — адмін/система або які помічені як публічні).
    - Власні вправи поточного користувача.
    Враховує фільтрацію за групою м'язів, якщо параметр передано.
    """
    # Базовий запит: бачимо свої вправи АБО загальнодоступні (is_public=True)
    query = select(Exercise).where(
        (Exercise.owner_id == current_user.id) | (Exercise.is_public == True)
    )

    # Якщо обрано конкретну групу м'язів, робимо JOIN через таблицю зв'язків
    if muscle_group_id:
        query = query.join(ExerciseMuscle).where(ExerciseMuscle.muscle_group_id == muscle_group_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    payload: ExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Створює нову вправу, автоматично генерує/зв'язує теги та групи м'язів.
    """
    # 1. Створюємо саму вправу
    new_exercise = Exercise(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        media_url=payload.media_url,
        is_public=payload.is_public
    )
    db.add(new_exercise)
    await db.flush()  # Отримуємо новий ID вправи до коміту

    # 2. Обробка груп м'язів
    for m in payload.muscles:
        exercise_muscle = ExerciseMuscle(
            exercise_id=new_exercise.id,
            muscle_group_id=m.muscle_group_id,
            coefficient=m.coefficient
        )
        db.add(exercise_muscle)

    # 3. Обробка тегів (перевіряємо чи є в базі, якщо немає — створюємо)
    for tag_name in payload.tag_names:
        tag_name_clean = tag_name.strip()
        tag_query = select(Tag).where(Tag.name == tag_name_clean)
        tag_res = await db.execute(tag_query)
        tag = tag_res.scalar_one_or_none()

        if not tag:
            tag = Tag(name=tag_name_clean, is_system=False)
            db.add(tag)
            await db.flush()

        # Зв'язуємо вправу з тегом
        exercise_tag = ExerciseTag(exercise_id=new_exercise.id, tag_id=tag.id)
        db.add(exercise_tag)

    await db.commit()
    await db.refresh(new_exercise)
    return new_exercise


@router.post("/{exercise_id}/copy", response_model=ExerciseResponse)
async def copy_exercise_to_my_catalog(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    🔥 КЛЮЧОВА ФІЧА ТЗ: Глибоке копіювання вправи іншого атлета/тренера у свій каталог.
    Створює новий запис, де owner_id = мій id, а source_exercise_id = id оригіналу.
    Копіює також всі зв'язки з м'язами та тегами!
    """
    # 1. Шукаємо оригінал вправи
    orig_query = select(Exercise).where(Exercise.id == exercise_id)
    orig_res = await db.execute(orig_query)
    orig_exercise = orig_res.scalar_one_or_none()

    if not orig_exercise:
        raise HTTPException(status_code=404, detail="Оригінал вправи не знайдено")

    if orig_exercise.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Ця вправа вже є у вашому каталозі")

    # 2. Робимо клон вправи для поточного користувача
    copied_exercise = Exercise(
        owner_id=current_user.id,
        source_exercise_id=orig_exercise.id,  # Зберігаємо історію походження!
        name=f"{orig_exercise.name} (Копія)",
        description=orig_exercise.description,
        media_url=orig_exercise.media_url,
        is_public=False  # Скопійована вправа за замовчуванням приватна
    )
    db.add(copied_exercise)
    await db.flush()

    # 3. Скопіюємо зв'язки груп м'язів
    muscle_query = select(ExerciseMuscle).where(ExerciseMuscle.exercise_id == orig_exercise.id)
    muscle_res = await db.execute(muscle_query)
    for orig_muscle in muscle_res.scalars().all():
        new_muscle = ExerciseMuscle(
            exercise_id=copied_exercise.id,
            muscle_group_id=orig_muscle.muscle_group_id,
            coefficient=orig_muscle.coefficient
        )
        db.add(new_muscle)

    # 4. Скопіюємо зв'язки тегів
    tag_query = select(ExerciseTag).where(ExerciseTag.exercise_id == orig_exercise.id)
    tag_res = await db.execute(tag_query)
    for orig_tag in tag_res.scalars().all():
        new_tag_link = ExerciseTag(exercise_id=copied_exercise.id, tag_id=orig_tag.tag_id)
        db.add(new_tag_link)

    await db.commit()
    await db.refresh(copied_exercise)
    return copied_exercise