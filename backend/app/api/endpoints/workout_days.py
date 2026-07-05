from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.schemas import WorkoutDayResponse, WorkoutDayCreate
from app.crud import workout_day as crud_workout_day

router = APIRouter()

@router.post("/", response_model=WorkoutDayResponse, status_code=status.HTTP_201_CREATED)
async def create_day(
    day_in: WorkoutDayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await crud_workout_day.create_workout_day(
        db=db, owner_id=current_user.id, day_in=day_in
    )

@router.get("/", response_model=List[WorkoutDayResponse])
async def read_days(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Тепер повертаємо тільки шаблони для Галереї!
    return await crud_workout_day.get_workout_days_templates(
        db=db, owner_id=current_user.id, skip=skip, limit=limit
    )

@router.get("/{day_id}", response_model=WorkoutDayResponse)
async def read_day(
    day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    day = await crud_workout_day.get_workout_day(db=db, day_id=day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Workout day not found")
    
    if not day.is_public and day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return day

@router.delete("/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_day(
    day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    day = await crud_workout_day.get_workout_day(db=db, day_id=day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Workout day not found")
    if day.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    await crud_workout_day.delete_workout_day(db=db, day_id=day_id)
    return None