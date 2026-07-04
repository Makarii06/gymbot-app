from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models import User, WorkoutProgram, WorkoutDay, ProgramDay, WorkoutExercise, WorkoutSetTemplate
from app.schemas import WorkoutProgramCreate, WorkoutProgramResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/programs", tags=["Workout Programs"])

@router.post("/", response_model=WorkoutProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    payload: WorkoutProgramCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Створює нову тренувальну програму.
    Приймає список day_ids для прив'язки існуючих шаблонів днів.
    """
    new_program = WorkoutProgram(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        visibility=payload.visibility
    )
    db.add(new_program)
    await db.flush() # Отримуємо ID програми

    # Прив'язуємо дні до програми, якщо вони передані
    for position, day_id in enumerate(payload.day_ids):
        # Перевіряємо чи існує такий день
        day_check = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
        if day_check.scalar_one_or_none():
            program_day = ProgramDay(
                program_id=new_program.id,
                workout_day_id=day_id,
                position=position
            )
            db.add(program_day)

    await db.commit()
    await db.refresh(new_program)
    return new_program


@router.get("/", response_model=List[WorkoutProgramResponse])
async def get_my_programs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Повертає список усіх програм поточного користувача.
    """
    query = select(WorkoutProgram).where(WorkoutProgram.owner_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()