from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import WorkoutProgram, WorkoutDay, ProgramDay

async def get_program(db: AsyncSession, program_id: int) -> Optional[WorkoutProgram]:
    result = await db.execute(select(WorkoutProgram).filter(WorkoutProgram.id == program_id))
    return result.scalars().first()

async def get_programs_by_owner(db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100) -> List[WorkoutProgram]:
    result = await db.execute(
        select(WorkoutProgram)
        .filter(WorkoutProgram.owner_id == owner_id)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())

async def create_workout_program(
    db: AsyncSession, 
    owner_id: int, 
    title: str, 
    description: Optional[str] = None, 
    visibility: str = "private",
    day_ids: Optional[List[int]] = None
) -> WorkoutProgram:
    # 1. Створюємо саму програму
    db_program = WorkoutProgram(
        owner_id=owner_id,
        title=title,
        description=description,
        visibility=visibility
    )
    db.add(db_program)
    await db.flush()  # Отримуємо db_program.id без коміту всієї транзакції

    # 2. Якщо передані ID днів, зв'язуємо їх через міст PROGRAM_DAY
    if day_ids:
        for order_index, day_id in enumerate(day_ids):
            # Перевіряємо чи існує такий день (можна опціонально)
            program_day = ProgramDay(
                program_id=db_program.id,
                day_id=day_id,
                order_index=order_index
            )
            db.add(program_day)
        await db.flush()

    await db.commit()
    await db.refresh(db_program)
    return db_program

async def delete_program(db: AsyncSession, program_id: int) -> bool:
    program = await get_program(db, program_id)
    if program:
        await db.delete(program)
        await db.commit()
        return True
    return False