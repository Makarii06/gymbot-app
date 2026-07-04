from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import ProgramOut, ProgramCreate
from app.crud import program as crud_program
from app.models import User  # Припускаємо, що модель користувача є

router = APIRouter()

@router.post("/", response_model=ProgramOut, status_code=status.HTTP_201_CREATED)
def create_program(
    *,
    db: Session = Depends(deps.get_db),
    program_in: ProgramCreate,
    current_user: User = Depends(deps.get_current_user)  # Залежність для авторизації через TG
):
    """
    Створення нової тренувальної програми разом із днями та вправами (пакетно).
    """
    # Перевірка: тільки тренери або користувачі для себе можуть створювати програми
    return crud_program.create_program_with_days(db=db, program_in=program_in, owner_id=current_user.id)


@router.get("/", response_model=List[ProgramOut])
def read_programs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Отримання списку всіх програм поточного користувача.
    """
    programs = crud_program.get_programs_by_owner(db=db, owner_id=current_user.id, skip=skip, limit=limit)
    return programs


@router.get("/{program_id}", response_model=ProgramOut)
def read_program(
    program_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Отримання детальної інформації про конкретну програму.
    """
    program = crud_program.get_program(db=db, program_id=program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Програму не знайдено")
    
    # Перевірка прав доступу (власник програми або тренер учня)
    if program.owner_id != current_user.id:
        # Тут згодом додамо логіку перевірки TrainerRelationship
        raise HTTPException(status_code=403, detail="Немає доступу до цієї програми")
    
    return program


@router.delete("/{program_id}", response_model=ProgramOut)
def delete_program(
    program_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Видалення програми.
    """
    program = crud_program.get_program(db=db, program_id=program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Програму не знайдено")
    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ви не є власником цієї програми")
    
    return crud_program.delete_program(db=db, program_id=program_id)