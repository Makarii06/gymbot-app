from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, date

# ==========================================
# 1. СХЕМИ ДЛЯ ГРУП М'ЯЗІВ ТА ТЕГІВ
# ==========================================
class MuscleGroupBase(BaseModel):
    name: str
    parent_group_id: Optional[int] = None

class MuscleGroupResponse(MuscleGroupBase):
    id: int
    class Config:
        from_attributes = True

class TagResponse(BaseModel):
    id: int
    name: str
    is_system: bool
    class Config:
        from_attributes = True

# ==========================================
# 2. СХЕМИ ДЛЯ ВПРАВ
# ==========================================
class ExerciseMuscleCreate(BaseModel):
    muscle_group_id: int
    coefficient: Decimal = Field(max_digits=3, decimal_places=2, default=Decimal("1.00"))

class ExerciseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    media_url: Optional[str] = None
    is_public: bool = False
    muscles: List[ExerciseMuscleCreate] = []
    tag_names: List[str] = []

class ExerciseResponse(BaseModel):
    id: int
    owner_id: int
    source_exercise_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    media_url: Optional[str] = None
    is_public: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ==========================================
# 3. СХЕМИ ДЛЯ КОНСТРУКТОРА ПРОГРАМ (ШАБЛОНИ)
# ==========================================
class WorkoutSetTemplateCreate(BaseModel):
    position: int
    target_reps: Optional[int] = None
    target_weight: Optional[Decimal] = None
    target_duration_sec: Optional[int] = None
    is_warmup: bool = False

class WorkoutSetTemplateResponse(WorkoutSetTemplateCreate):
    id: int
    workout_exercise_id: int
    class Config:
        from_attributes = True

class WorkoutExerciseCreate(BaseModel):
    exercise_id: int
    position: int
    note: Optional[str] = None
    sets: List[WorkoutSetTemplateCreate] = [] # Створення вправи відразу з підходами!

class WorkoutExerciseResponse(BaseModel):
    id: int
    workout_day_id: int
    exercise_id: int
    position: int
    note: Optional[str] = None
    class Config:
        from_attributes = True

class WorkoutDayCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = False
    exercises: List[WorkoutExerciseCreate] = [] # Можливість створювати день на ходу з вправами

class WorkoutDayResponse(BaseModel):
    id: int
    owner_id: int
    source_workout_day_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    is_public: bool
    created_at: datetime
    class Config:
        from_attributes = True

class WorkoutProgramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    visibility: str = "PRIVATE" # PRIVATE, COACH_STUDENTS, PUBLIC
    day_ids: List[int] = [] # Список ID днів, які входять в програму

class WorkoutProgramResponse(BaseModel):
    id: int
    owner_id: int
    source_program_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    visibility: str
    created_at: datetime
    class Config:
        from_attributes = True

# ==========================================
# 4. СХЕМИ ДЛЯ РЕАЛЬНИХ ТРЕНУВАЛЬНИХ СЕСІЙ
# ==========================================
class SessionExerciseSetUpdate(BaseModel):
    actual_reps: Optional[int] = None
    actual_weight: Optional[Decimal] = None
    actual_duration_sec: Optional[int] = None
    completed: bool = False

class SessionExerciseSetResponse(BaseModel):
    id: int
    session_exercise_id: int
    position: int
    planned_reps: Optional[int] = None
    planned_weight: Optional[Decimal] = None
    planned_duration_sec: Optional[int] = None
    actual_reps: Optional[int] = None
    actual_weight: Optional[Decimal] = None
    actual_duration_sec: Optional[int] = None
    completed: bool
    is_warmup: bool
    class Config:
        from_attributes = True

class TrainingSessionResponse(BaseModel):
    id: int
    owner_id: int
    trainer_id: Optional[int] = None
    title: str
    status: str
    planned_date: date
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# ==========================================
# 5. СХЕМИ ДЛЯ АНТРОПОМЕТРІЇ (ЗАМІРИ)
# ==========================================
class BodyMeasurementCreate(BaseModel):
    measurement_date: date
    weight_kg: Optional[Decimal] = None
    body_fat_percent: Optional[Decimal] = None
    chest_cm: Optional[Decimal] = None
    waist_cm: Optional[Decimal] = None
    hips_cm: Optional[Decimal] = None
    arm_cm: Optional[Decimal] = None
    thigh_cm: Optional[Decimal] = None
    calf_cm: Optional[Decimal] = None

class BodyMeasurementResponse(BodyMeasurementCreate):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True