from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user
from app.models import User, WorkoutDay, WorkoutExercise, WorkoutSetTemplate, Exercise, ExerciseTag, ExerciseMuscle, ExerciseMedia
from app.schemas import (
    WorkoutDayCreate, WorkoutDayUpdate, WorkoutDayResponse, WorkoutDayDetailResponse,
    WorkoutExerciseResponse, WorkoutExerciseAddRequest, WorkoutExerciseNoteUpdate,
    WorkoutSetTemplateCreate, WorkoutSetTemplateUpdate, WorkoutSetTemplateResponse,
)

router = APIRouter(prefix="/api/workout-days", tags=["Workout Days"])


def _workout_day_detail_query():
    """Запит на тренувальний день з усіма вправами, підходами та даними вправи."""
    return (
        select(WorkoutDay)
        .options(
            selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.sets),
            selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.exercise_tags)
            .selectinload(ExerciseTag.tag),
            selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.muscles)
            .selectinload(ExerciseMuscle.muscle_group),
            selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.media),
        )
    )


# ==========================================
# CRUD ДЛЯ ТРЕНУВАЛЬНИХ ДНІВ
# ==========================================

@router.get("/", response_model=List[WorkoutDayDetailResponse])
async def read_days(
    include_programs: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Повертає список шаблонів тренувань поточного користувача."""
    query = _workout_day_detail_query().where(WorkoutDay.owner_id == current_user.id)
    if not include_programs:
        query = query.where(WorkoutDay.is_template == True)
        
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().unique().all()


@router.post("/", response_model=WorkoutDayResponse, status_code=status.HTTP_201_CREATED)
async def create_day(
    day_in: WorkoutDayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створює новий шаблон тренування."""
    db_day = WorkoutDay(
        owner_id=current_user.id,
        title=day_in.title,
        description=day_in.description,
        is_public=day_in.is_public,
        is_template=day_in.is_template
    )
    db.add(db_day)
    await db.commit()
    await db.refresh(db_day)
    return db_day


@router.get("/{day_id}", response_model=WorkoutDayDetailResponse)
async def read_day(
    day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Повертає деталі тренування з повним списком вправ і підходів."""
    result = await db.execute(
        _workout_day_detail_query().where(WorkoutDay.id == day_id)
    )
    day = result.scalars().unique().one_or_none()

    if not day:
        raise HTTPException(status_code=404, detail="Тренування не знайдено")
    if not day.is_public and day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає доступу")

    return day


@router.put("/{day_id}", response_model=WorkoutDayResponse)
async def update_day(
    day_id: int,
    day_in: WorkoutDayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлює назву або опис тренування."""
    result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    day = result.scalar_one_or_none()

    if not day:
        raise HTTPException(status_code=404, detail="Тренування не знайдено")
    if day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав для редагування")

    update_data = day_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(day, field, value)

    await db.commit()
    await db.refresh(day)
    return day


@router.delete("/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_day(
    day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Видаляє тренування разом з усіма вправами і підходами."""
    result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    day = result.scalar_one_or_none()

    if not day:
        raise HTTPException(status_code=404, detail="Тренування не знайдено")
    if day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав для видалення")

    await db.delete(day)
    await db.commit()
    return None


# ==========================================
# УПРАВЛІННЯ ВПРАВАМИ В ТРЕНУВАННІ
# ==========================================

@router.post("/{day_id}/exercises", response_model=WorkoutExerciseResponse, status_code=status.HTTP_201_CREATED)
async def add_exercise_to_day(
    day_id: int,
    body: WorkoutExerciseAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Додає вправу до тренування. Автоматично призначає позицію."""
    result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    day = result.scalar_one_or_none()

    if not day:
        raise HTTPException(status_code=404, detail="Тренування не знайдено")
    if day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    # Визначаємо наступну позицію
    existing = await db.execute(
        select(WorkoutExercise).where(WorkoutExercise.workout_day_id == day_id)
    )
    count = len(existing.scalars().all())

    db_we = WorkoutExercise(
        workout_day_id=day_id,
        exercise_id=body.exercise_id,
        position=count + 1,
        note=body.note
    )
    db.add(db_we)
    await db.flush()

    # Перезавантажуємо з relationships
    result = await db.execute(
        select(WorkoutExercise)
        .where(WorkoutExercise.id == db_we.id)
        .options(
            selectinload(WorkoutExercise.sets),
            selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.exercise_tags)
            .selectinload(ExerciseTag.tag),
            selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.muscles)
            .selectinload(ExerciseMuscle.muscle_group),
            selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.media),
        )
    )
    we = result.scalars().unique().one()

    await db.commit()
    return we


@router.delete("/{day_id}/exercises/{we_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_from_day(
    day_id: int,
    we_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Видаляє вправу з тренування разом з усіма підходами."""
    result = await db.execute(
        select(WorkoutExercise)
        .where(WorkoutExercise.id == we_id, WorkoutExercise.workout_day_id == day_id)
    )
    we = result.scalar_one_or_none()

    if not we:
        raise HTTPException(status_code=404, detail="Вправу в тренуванні не знайдено")

    day_result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    day = day_result.scalar_one_or_none()
    if not day or day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    await db.delete(we)
    await db.commit()
    return None


@router.put("/{day_id}/exercises/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_exercises_in_day(
    day_id: int,
    order: List[dict],  # [{we_id: int, position: int}]
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Змінює порядок вправ у тренуванні."""
    day_result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    day = day_result.scalar_one_or_none()
    if not day or day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    for item in order:
        we_result = await db.execute(
            select(WorkoutExercise).where(
                WorkoutExercise.id == item["we_id"],
                WorkoutExercise.workout_day_id == day_id
            )
        )
        we = we_result.scalar_one_or_none()
        if we:
            we.position = item["position"]

    await db.commit()
    return None


@router.patch("/{day_id}/exercises/{we_id}/note", response_model=WorkoutExerciseResponse)
async def update_exercise_note(
    day_id: int,
    we_id: int,
    body: WorkoutExerciseNoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлює нотатку до вправи в тренуванні."""
    result = await db.execute(
        select(WorkoutExercise)
        .where(WorkoutExercise.id == we_id, WorkoutExercise.workout_day_id == day_id)
        .options(
            selectinload(WorkoutExercise.sets),
            selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.exercise_tags)
            .selectinload(ExerciseTag.tag),
            selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.muscles)
            .selectinload(ExerciseMuscle.muscle_group),
            selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.media),
        )
    )
    we = result.scalars().unique().one_or_none()
    if not we:
        raise HTTPException(status_code=404, detail="Вправу не знайдено")

    day_result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    day = day_result.scalar_one_or_none()
    if not day or day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    we.note = body.note
    await db.commit()
    await db.refresh(we)
    return we




# ==========================================
# УПРАВЛІННЯ ПІДХОДАМИ
# ==========================================

@router.post("/exercises/{we_id}/sets", response_model=WorkoutSetTemplateResponse, status_code=status.HTTP_201_CREATED)
async def add_set_to_exercise(
    we_id: int,
    body: WorkoutSetTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Додає підхід до вправи в тренуванні."""
    result = await db.execute(
        select(WorkoutExercise)
        .where(WorkoutExercise.id == we_id)
        .options(selectinload(WorkoutExercise.sets))
    )
    we = result.scalars().unique().one_or_none()

    if not we:
        raise HTTPException(status_code=404, detail="Вправу в тренуванні не знайдено")

    # Перевіряємо власника через день
    day_result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == we.workout_day_id))
    day = day_result.scalar_one_or_none()
    if not day or day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    # Автоматично призначаємо позицію
    position = len(we.sets) + 1

    db_set = WorkoutSetTemplate(
        workout_exercise_id=we_id,
        position=position,
        target_reps=body.target_reps,
        target_weight=body.target_weight,
        target_duration_sec=body.target_duration_sec,
        is_warmup=body.is_warmup
    )
    db.add(db_set)
    await db.commit()
    await db.refresh(db_set)
    return db_set


@router.put("/sets/{set_id}", response_model=WorkoutSetTemplateResponse)
async def update_set(
    set_id: int,
    body: WorkoutSetTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлює підхід (ваги, повтори тощо)."""
    result = await db.execute(select(WorkoutSetTemplate).where(WorkoutSetTemplate.id == set_id))
    db_set = result.scalar_one_or_none()

    if not db_set:
        raise HTTPException(status_code=404, detail="Підхід не знайдено")

    # Перевіряємо власника
    we_result = await db.execute(select(WorkoutExercise).where(WorkoutExercise.id == db_set.workout_exercise_id))
    we = we_result.scalar_one_or_none()
    day_result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == we.workout_day_id))
    day = day_result.scalar_one_or_none()
    if not day or day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_set, field, value)

    await db.commit()
    await db.refresh(db_set)
    return db_set


@router.delete("/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_set(
    set_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Видаляє підхід."""
    result = await db.execute(select(WorkoutSetTemplate).where(WorkoutSetTemplate.id == set_id))
    db_set = result.scalar_one_or_none()

    if not db_set:
        raise HTTPException(status_code=404, detail="Підхід не знайдено")

    we_result = await db.execute(select(WorkoutExercise).where(WorkoutExercise.id == db_set.workout_exercise_id))
    we = we_result.scalar_one_or_none()
    day_result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == we.workout_day_id))
    day = day_result.scalar_one_or_none()
    if not day or day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    await db.delete(db_set)
    await db.commit()
    return None
