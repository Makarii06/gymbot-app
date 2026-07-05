from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.schemas import WorkoutProgramResponse, WorkoutProgramCreate
from app.crud import program as crud_program

router = APIRouter()

@router.post("/", response_model=WorkoutProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program_in: WorkoutProgramCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await crud_program.create_workout_program(
        db=db,
        owner_id=current_user.id,
        title=program_in.title,
        description=program_in.description,
        visibility=program_in.visibility,
        day_ids=program_in.day_ids
    )

@router.get("/", response_model=List[WorkoutProgramResponse])
async def read_programs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await crud_program.get_programs_by_owner(
        db=db, owner_id=current_user.id, skip=skip, limit=limit
    )

@router.get("/{program_id}", response_model=WorkoutProgramResponse)
async def read_program(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    program = await crud_program.get_program(db=db, program_id=program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Перевірка приватності (якщо не власник і програма приватна)
    if program.visibility == "private" and program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return program

@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    program = await crud_program.get_program(db=db, program_id=program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    await crud_program.delete_program(db=db, program_id=program_id)
    return None

@router.post("/{program_id}/add-day-from-template/{template_day_id}", response_model=WorkoutDayResponse)
async def add_template_day_to_program(
    program_id: int,
    template_day_id: int,
    position: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Перевіряємо чи програма належить користувачу
    program = await crud_program.get_program(db=db, program_id=program_id)
    if not program or program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions or program not found")
        
    try:
        cloned = await crud_workout_day.clone_day_to_program(
            db=db, 
            owner_id=current_user.id, 
            template_day_id=template_day_id, 
            program_id=program_id, 
            position=position
        )
        return cloned
    except ValueError as e:
        raise HTTPException(status_code=444, detail=str(e))