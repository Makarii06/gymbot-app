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

class TagCreate(BaseModel):
    name: str

# ==========================================
# 2. СХЕМИ ДЛЯ МЕДІА ВПРАВ
# ==========================================
class ExerciseMediaResponse(BaseModel):
    id: int
    exercise_id: int
    url: str
    media_type: str
    position: int
    class Config:
        from_attributes = True

# ==========================================
# 3. СХЕМИ ДЛЯ ВПРАВ
# ==========================================
class ExerciseMuscleCreate(BaseModel):
    muscle_group_id: int
    coefficient: Decimal = Field(max_digits=3, decimal_places=2, default=Decimal("1.00"))

class ExerciseMuscleResponse(BaseModel):
    id: int
    muscle_group_id: int
    coefficient: Decimal
    muscle_group: Optional[MuscleGroupResponse] = None
    class Config:
        from_attributes = True

class ExerciseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_public: bool = False
    muscles: List[ExerciseMuscleCreate] = []
    tag_names: List[str] = []

class ExerciseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    muscles: Optional[List[ExerciseMuscleCreate]] = None
    tag_names: Optional[List[str]] = None

class ExerciseResponse(BaseModel):
    id: int
    owner_id: int
    source_exercise_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    is_public: bool
    created_at: datetime
    tags: List[TagResponse] = []
    muscles: List[ExerciseMuscleResponse] = []
    media: List[ExerciseMediaResponse] = []
    class Config:
        from_attributes = True

# ==========================================
# 3. СХЕМИ ДЛЯ ПІДХОДІВ (SET TEMPLATES)
# ==========================================
class WorkoutSetTemplateCreate(BaseModel):
    position: int
    target_reps: Optional[int] = None
    target_weight: Optional[Decimal] = None
    target_duration_sec: Optional[int] = None
    is_warmup: bool = False

class WorkoutSetTemplateUpdate(BaseModel):
    target_reps: Optional[int] = None
    target_weight: Optional[Decimal] = None
    target_duration_sec: Optional[int] = None
    is_warmup: Optional[bool] = None

class WorkoutSetTemplateResponse(BaseModel):
    id: int
    workout_exercise_id: int
    position: int
    target_reps: Optional[int] = None
    target_weight: Optional[Decimal] = None
    target_duration_sec: Optional[int] = None
    is_warmup: bool
    class Config:
        from_attributes = True

# ==========================================
# 4. СХЕМИ ДЛЯ ВПРАВ У ТРЕНУВАННІ
# ==========================================
class WorkoutExerciseCreate(BaseModel):
    exercise_id: int
    position: int
    note: Optional[str] = None
    sets: List[WorkoutSetTemplateCreate] = []

class WorkoutExerciseAddRequest(BaseModel):
    exercise_id: int
    note: Optional[str] = None

class WorkoutExerciseNoteUpdate(BaseModel):
    note: Optional[str] = None

class ExerciseReorderItem(BaseModel):
    we_id: int
    position: int

class WorkoutExerciseResponse(BaseModel):
    id: int
    workout_day_id: int
    exercise_id: int
    position: int
    note: Optional[str] = None
    sets: List[WorkoutSetTemplateResponse] = []
    exercise: Optional[ExerciseResponse] = None
    class Config:
        from_attributes = True

# ==========================================
# 5. СХЕМИ ДЛЯ ТРЕНУВАЛЬНИХ ДНІВ (WORKOUT DAY)
# ==========================================
class WorkoutDayCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = False
    is_template: bool = True

class WorkoutDayUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class WorkoutDayResponse(BaseModel):
    id: int
    owner_id: int
    source_workout_day_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    is_public: bool
    is_template: bool
    created_at: datetime
    class Config:
        from_attributes = True

class WorkoutDayDetailResponse(WorkoutDayResponse):
    exercises: List[WorkoutExerciseResponse] = []
    class Config:
        from_attributes = True

# ==========================================
# 6. СХЕМИ ДЛЯ ПРОГРАМ
# ==========================================
class WorkoutProgramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    visibility: str = "PRIVATE"

class WorkoutProgramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None

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

class ProgramDayResponse(BaseModel):
    id: int
    program_id: int
    workout_day_id: int
    position: int
    workout_day: Optional[WorkoutDayDetailResponse] = None
    class Config:
        from_attributes = True

class ProgramDayCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ProgramDayFromGallery(BaseModel):
    workout_day_id: int


# ==========================================
# 7. СХЕМИ ДЛЯ РЕАЛЬНИХ ТРЕНУВАЛЬНИХ СЕСІЙ
# ==========================================

class SessionExerciseSetCreate(BaseModel):
    planned_reps: Optional[int] = None
    planned_weight: Optional[Decimal] = None
    is_warmup: bool = False

class SessionExerciseSetUpdate(BaseModel):
    # Планові значення (для PLANNED сесій)
    planned_reps: Optional[int] = None
    planned_weight: Optional[Decimal] = None
    # Фактичні значення (для IN_PROGRESS / DONE сесій)
    actual_reps: Optional[int] = None
    actual_weight: Optional[Decimal] = None
    actual_duration_sec: Optional[int] = None
    completed: Optional[bool] = None
    is_warmup: Optional[bool] = None

class SessionExerciseReorderItem(BaseModel):
    se_id: int
    position: int


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

class SessionExerciseAddRequest(BaseModel):
    exercise_id: int
    note: Optional[str] = None

class SessionExerciseResponse(BaseModel):
    id: int
    session_id: int
    exercise_id: int
    position: int
    note: Optional[str] = None
    sets: List[SessionExerciseSetResponse] = []
    exercise: Optional[ExerciseResponse] = None
    class Config:
        from_attributes = True

class TrainingSessionCreate(BaseModel):
    title: str
    planned_date: date
    description: Optional[str] = None
    rest_duration_seconds: Optional[int] = 90
    from_workout_day_id: Optional[int] = None
    start_immediately: bool = False

class TrainingSessionUpdate(BaseModel):
    title: Optional[str] = None
    planned_date: Optional[date] = None
    description: Optional[str] = None
    rest_duration_seconds: Optional[int] = None

class SessionExerciseUpdate(BaseModel):
    note: Optional[str] = None

class TrainingSessionResponse(BaseModel):
    id: int
    owner_id: int
    trainer_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str
    planned_date: date
    rest_duration_seconds: Optional[int] = 90
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class TrainingSessionDetailResponse(TrainingSessionResponse):
    exercises: List[SessionExerciseResponse] = []
    class Config:
        from_attributes = True



# ==========================================
# 8. СХЕМИ ДЛЯ АНТРОПОМЕТРІЇ (ЗАМІРИ)
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