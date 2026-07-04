from sqlalchemy.orm import Session
from app.models import Program, ProgramDay, ProgramExercise, Exercise
from app.schemas import ProgramCreate, ProgramUpdate

def get_program(db: Session, program_id: int):
    return db.query(Program).filter(Program.id == program_id).first()

def get_programs_by_owner(db: Session, owner_id: int, skip: int = 0, limit: int = 100):
    return db.query(Program).filter(Program.owner_id == owner_id).offset(skip).limit(limit).all()

def create_program_with_days(db: Session, program_in: ProgramCreate, owner_id: int) -> Program:
    # 1. Створення самої програми
    db_program = Program(
        title=program_in.title,
        description=program_in.description,
        owner_id=owner_id,
        parent_program_id=program_in.parent_program_id
    )
    db.add(db_program)
    db.flush()  # Отримуємо db_program.id без фіксації транзакції

    # 2. Якщо передані дні тренувань, створюємо їх
    if program_in.days:
        for day_idx, day_in in enumerate(program_in.days):
            db_day = ProgramDay(
                program_id=db_program.id,
                name=day_in.name or f"День {day_idx + 1}",
                order_index=day_idx
            )
            db.add(db_day)
            db.flush()

            # 3. Якщо в дні є вправи/сети
            if day_in.exercises:
                for ex_idx, ex_in in enumerate(day_in.exercises):
                    db_exercise = ProgramExercise(
                        program_day_id=db_day.id,
                        exercise_id=ex_in.exercise_id,
                        sets_count=ex_in.sets_count,
                        reps_str=ex_in.reps_str,
                        weight_str=ex_in.weight_str,
                        target_rpe=ex_in.target_rpe,
                        rest_time_seconds=ex_in.rest_time_seconds,
                        order_index=ex_idx
                    )
                    db.add(db_exercise)

    db.commit()
    db.refresh(db_program)
    return db_program

def delete_program(db: Session, program_id: int):
    db_program = db.query(Program).filter(Program.id == program_id).first()
    if db_program:
        db.delete(db_program)
        db.commit()
    return db_program