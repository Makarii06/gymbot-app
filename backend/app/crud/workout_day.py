from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models import WorkoutDay, WorkoutExercise, WorkoutSetTemplate, ProgramDay
from app.schemas import WorkoutDayCreate, WorkoutDayUpdate

async def get_workout_day(db: AsyncSession, day_id: int) -> Optional[WorkoutDay]:
    result = await db.execute(select(WorkoutDay).filter(WorkoutDay.id == day_id))
    return result.scalars().first()

async def get_workout_days_templates(db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100) -> List[WorkoutDay]:
    # Завантажуємо лише ТЕМПЛЕЙТИ користувача (або публічні) для Галереї
    result = await db.execute(
        select(WorkoutDay)
        .filter((WorkoutDay.owner_id == owner_id) & (WorkoutDay.is_template == True))
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())

async def create_workout_day(db: AsyncSession, owner_id: int, day_in: WorkoutDayCreate) -> WorkoutDay:
    db_day = WorkoutDay(
        owner_id=owner_id,
        title=day_in.title,
        description=day_in.description,
        is_public=day_in.is_public,
        is_template=day_in.is_template
    )
    db.add(db_day)
    await db.flush()

    for ex_in in day_in.exercises:
        db_exercise = WorkoutExercise(
            workout_day_id=db_day.id,
            exercise_id=ex_in.exercise_id,
            position=ex_in.position,
            note=ex_in.note
        )
        db.add(db_exercise)
        await db.flush()

        for set_in in ex_in.sets:
            db_set = WorkoutSetTemplate(
                workout_exercise_id=db_exercise.id,
                position=set_in.position,
                target_reps=set_in.target_reps,
                target_weight=set_in.target_weight,
                target_duration_sec=set_in.target_duration_sec,
                is_warmup=set_in.is_warmup
            )
            db.add(db_set)

    await db.commit()
    await db.refresh(db_day)
    return db_day

async def clone_day_to_program(db: AsyncSession, owner_id: int, template_day_id: int, program_id: int, position: int) -> WorkoutDay:
    # 1. Отримуємо оригінальний день-шаблон
    result = await db.execute(select(WorkoutDay).filter(WorkoutDay.id == template_day_id))
    template_day = result.scalars().first()
    if not template_day:
        raise ValueError("Template day not found")

    # 2. Створюємо ізольовану копію
    cloned_day = WorkoutDay(
        owner_id=owner_id,
        source_workout_day_id=template_day.id,
        title=template_day.title,
        description=template_day.description,
        is_public=False,
        is_template=False  # Це інстанс всередині програми!
    )
    db.add(cloned_day)
    await db.flush()

    # 3. Копіюємо вправи з оригінального дня
    ex_result = await db.execute(select(WorkoutExercise).filter(WorkoutExercise.workout_day_id == template_day_id))
    template_exercises = ex_result.scalars().all()

    for temp_ex in template_exercises:
        cloned_ex = WorkoutExercise(
            workout_day_id=cloned_day.id,
            exercise_id=temp_ex.exercise_id,
            position=temp_ex.position,
            note=temp_ex.note
        )
        db.add(cloned_ex)
        await db.flush()

        # Копіюємо підходи для цієї вправи
        sets_result = await db.execute(select(WorkoutSetTemplate).filter(WorkoutSetTemplate.workout_exercise_id == temp_ex.id))
        template_sets = sets_result.scalars().all()

        for temp_set in template_sets:
            cloned_set = WorkoutSetTemplate(
                workout_exercise_id=cloned_ex.id,
                position=temp_set.position,
                target_reps=temp_set.target_reps,
                target_weight=temp_set.target_weight,
                target_duration_sec=temp_set.target_duration_sec,
                is_warmup=temp_set.is_warmup
            )
            db.add(cloned_set)

    # 4. Зв'язуємо цей клонований день з програмою через міст PROGRAM_DAY
    program_day = ProgramDay(
        program_id=program_id,
        workout_day_id=cloned_day.id,
        position=position
    )
    db.add(program_day)
    
    await db.commit()
    await db.refresh(cloned_day)
    return cloned_day

async def update_workout_day(db: AsyncSession, day_id: int, day_in: WorkoutDayUpdate) -> Optional[WorkoutDay]:
    day = await get_workout_day(db, day_id)
    if not day:
        return None
    update_data = day_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(day, field, value)
    await db.commit()
    await db.refresh(day)
    return day