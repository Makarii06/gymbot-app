from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User, WorkoutProgram, WorkoutDay, ProgramDay,
    WorkoutExercise, Exercise, ExerciseTag, ExerciseMuscle
)
from app.schemas import (
    WorkoutProgramCreate, WorkoutProgramUpdate, WorkoutProgramResponse,
    ProgramDayResponse, ProgramDayCreate, ProgramDayFromGallery,
    WorkoutDayCreate, WorkoutDayDetailResponse,
)

router = APIRouter(prefix="/api/programs", tags=["Programs"])


def _program_day_query():
    """Запит на дні програми з повними даними вправ."""
    return (
        select(ProgramDay)
        .options(
            selectinload(ProgramDay.workout_day)
            .selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.sets),
            selectinload(ProgramDay.workout_day)
            .selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.exercise_tags)
            .selectinload(ExerciseTag.tag),
            selectinload(ProgramDay.workout_day)
            .selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.muscles)
            .selectinload(ExerciseMuscle.muscle_group),
            selectinload(ProgramDay.workout_day)
            .selectinload(WorkoutDay.exercises)
            .selectinload(WorkoutExercise.exercise)
            .selectinload(Exercise.media),
        )
        .order_by(ProgramDay.position)
    )


# ==========================================
# CRUD ДЛЯ ПРОГРАМ
# ==========================================

@router.get("/", response_model=List[WorkoutProgramResponse])
async def read_programs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Повертає список програм поточного користувача."""
    result = await db.execute(
        select(WorkoutProgram)
        .where(WorkoutProgram.owner_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=WorkoutProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program_in: WorkoutProgramCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створює нову програму тренувань."""
    db_program = WorkoutProgram(
        owner_id=current_user.id,
        title=program_in.title,
        description=program_in.description,
        visibility=program_in.visibility
    )
    db.add(db_program)
    await db.commit()
    await db.refresh(db_program)
    return db_program


@router.get("/{program_id}", response_model=WorkoutProgramResponse)
async def read_program(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Повертає деталі програми."""
    result = await db.execute(select(WorkoutProgram).where(WorkoutProgram.id == program_id))
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Програму не знайдено")
    if program.visibility == "PRIVATE" and program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає доступу")

    return program


@router.put("/{program_id}", response_model=WorkoutProgramResponse)
async def update_program(
    program_id: int,
    program_in: WorkoutProgramUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлює назву або опис програми."""
    result = await db.execute(select(WorkoutProgram).where(WorkoutProgram.id == program_id))
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Програму не знайдено")
    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    update_data = program_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(program, field, value)

    await db.commit()
    await db.refresh(program)
    return program


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Видаляє програму разом з усіма днями."""
    result = await db.execute(
        select(WorkoutProgram)
        .options(selectinload(WorkoutProgram.program_days))
        .where(WorkoutProgram.id == program_id)
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Програму не знайдено")
    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    # Збираємо всі ID пов'язаних тренувань (WorkoutDay), які були в цій програмі
    workout_day_ids = [pd.workout_day_id for pd in program.program_days]

    # Видаляємо програму (це автоматично видалить ProgramDay через cascade)
    await db.delete(program)

    # Тепер видаляємо пов'язані WorkoutDay, якщо вони не є шаблонами
    if workout_day_ids:
        days_result = await db.execute(
            select(WorkoutDay).where(WorkoutDay.id.in_(workout_day_ids))
        )
        days = days_result.scalars().all()
        for day in days:
            if not day.is_template:
                await db.delete(day)

    await db.commit()
    return None


# ==========================================
# УПРАВЛІННЯ ТРЕНУВАННЯМИ В ПРОГРАМІ (PROGRAM DAYS)
# ==========================================

@router.get("/{program_id}/days", response_model=List[ProgramDayResponse])
async def get_program_days(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Повертає список тренувань (днів) у програмі з повними даними."""
    result = await db.execute(select(WorkoutProgram).where(WorkoutProgram.id == program_id))
    program = result.scalar_one_or_none()
    if not program or program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає доступу до програми")

    days_result = await db.execute(
        _program_day_query().where(ProgramDay.program_id == program_id)
    )
    return days_result.scalars().unique().all()


@router.post("/{program_id}/days", response_model=ProgramDayResponse, status_code=status.HTTP_201_CREATED)
async def add_new_day_to_program(
    program_id: int,
    body: ProgramDayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створює нове тренування і додає його до програми."""
    result = await db.execute(select(WorkoutProgram).where(WorkoutProgram.id == program_id))
    program = result.scalar_one_or_none()
    if not program or program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    # Визначаємо наступну позицію
    existing = await db.execute(select(ProgramDay).where(ProgramDay.program_id == program_id))
    position = len(existing.scalars().all()) + 1

    # Створюємо день тренування (не шаблон — це день всередині програми)
    new_day = WorkoutDay(
        owner_id=current_user.id,
        title=body.title,
        description=body.description,
        is_public=False,
        is_template=False
    )
    db.add(new_day)
    await db.flush()

    # Прив'язуємо до програми
    program_day = ProgramDay(
        program_id=program_id,
        workout_day_id=new_day.id,
        position=position
    )
    db.add(program_day)
    await db.flush()

    # Перезавантажуємо з relationships
    pd_result = await db.execute(
        _program_day_query().where(ProgramDay.id == program_day.id)
    )
    pd = pd_result.scalars().unique().one()
    await db.commit()
    return pd


@router.post("/{program_id}/days/from-gallery/{gallery_day_id}", response_model=ProgramDayResponse, status_code=status.HTTP_201_CREATED)
async def add_gallery_day_to_program(
    program_id: int,
    gallery_day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Копіює тренування з галереї у програму.
    Створює незалежну копію, щоб зміни в програмі не впливали на шаблон.
    """
    result = await db.execute(select(WorkoutProgram).where(WorkoutProgram.id == program_id))
    program = result.scalar_one_or_none()
    if not program or program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    # Завантажуємо шаблон з вправами та підходами
    template_result = await db.execute(
        select(WorkoutDay)
        .where(WorkoutDay.id == gallery_day_id)
        .options(
            selectinload(WorkoutDay.exercises).selectinload(WorkoutExercise.sets)
        )
    )
    template_day = template_result.scalars().unique().one_or_none()
    if not template_day:
        raise HTTPException(status_code=404, detail="Тренування з галереї не знайдено")

    # Визначаємо позицію
    existing = await db.execute(select(ProgramDay).where(ProgramDay.program_id == program_id))
    position = len(existing.scalars().all()) + 1

    # Клонуємо день
    cloned_day = WorkoutDay(
        owner_id=current_user.id,
        source_workout_day_id=template_day.id,
        title=template_day.title,
        description=template_day.description,
        is_public=False,
        is_template=False
    )
    db.add(cloned_day)
    await db.flush()

    # Клонуємо вправи і підходи
    from app.models import WorkoutSetTemplate
    for temp_ex in template_day.exercises:
        cloned_ex = WorkoutExercise(
            workout_day_id=cloned_day.id,
            exercise_id=temp_ex.exercise_id,
            position=temp_ex.position,
            note=temp_ex.note
        )
        db.add(cloned_ex)
        await db.flush()

        for temp_set in temp_ex.sets:
            cloned_set = WorkoutSetTemplate(
                workout_exercise_id=cloned_ex.id,
                position=temp_set.position,
                target_reps=temp_set.target_reps,
                target_weight=temp_set.target_weight,
                target_duration_sec=temp_set.target_duration_sec,
                is_warmup=temp_set.is_warmup
            )
            db.add(cloned_set)

    # Прив'язуємо клон до програми
    program_day = ProgramDay(
        program_id=program_id,
        workout_day_id=cloned_day.id,
        position=position
    )
    db.add(program_day)
    await db.flush()

    # Перезавантажуємо з relationships
    pd_result = await db.execute(
        _program_day_query().where(ProgramDay.id == program_day.id)
    )
    pd = pd_result.scalars().unique().one()
    await db.commit()
    return pd


@router.delete("/{program_id}/days/{pd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_day_from_program(
    program_id: int,
    pd_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Видаляє тренування з програми (і сам WorkoutDay якщо він не шаблон)."""
    result = await db.execute(
        select(ProgramDay).where(ProgramDay.id == pd_id, ProgramDay.program_id == program_id)
    )
    pd = result.scalar_one_or_none()
    if not pd:
        raise HTTPException(status_code=404, detail="День програми не знайдено")

    prog_result = await db.execute(select(WorkoutProgram).where(WorkoutProgram.id == program_id))
    program = prog_result.scalar_one_or_none()
    if not program or program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Немає прав")

    # Якщо WorkoutDay не є шаблоном галереї — видаляємо і його
    day_result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == pd.workout_day_id))
    day = day_result.scalar_one_or_none()

    await db.delete(pd)
    if day and not day.is_template:
        await db.delete(day)

    await db.commit()
    return None


@router.delete("/cleanup-orphans/force", status_code=status.HTTP_200_OK)
async def cleanup_orphans_temp(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Тимчасовий ендпоінт для очищення старих завислих шаблонів (які були в програмах)."""
    result = await db.execute(select(WorkoutDay).where(WorkoutDay.is_template == False))
    days = result.scalars().all()
    pd_result = await db.execute(select(ProgramDay))
    program_days = pd_result.scalars().all()
    used_day_ids = {pd.workout_day_id for pd in program_days}
    
    deleted_count = 0
    for day in days:
        if day.id not in used_day_ids:
            await db.delete(day)
            deleted_count += 1
    if deleted_count > 0:
        await db.commit()
    return {"deleted": deleted_count}