from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import BigInteger, String, Boolean, DateTime, Date, Text, ForeignKey, Numeric, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

# ==========================================
# 1. КОРИСТУВАЧІ ТА ТРЕНЕРСТВО
# ==========================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_trainer: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class TrainerRelationship(Base):
    __tablename__ = "trainer_relationships"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    trainer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String, default="PENDING")
    can_view_history_after: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ==========================================
# 2. ВПРАВИ, М'ЯЗИ ТА ТЕГИ
# ==========================================

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

class UserTag(Base):
    __tablename__ = "user_tags"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    source_exercise_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True)
    
    name: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ExerciseTag(Base):
    __tablename__ = "exercise_tags"

    exercise_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exercises.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

class MuscleGroup(Base):
    __tablename__ = "muscle_groups"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    parent_group_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("muscle_groups.id", ondelete="CASCADE"), nullable=True)
    name: Mapped[str] = mapped_column(String, unique=True)

class ExerciseMuscle(Base):
    __tablename__ = "exercise_muscles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    exercise_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exercises.id", ondelete="CASCADE"))
    muscle_group_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("muscle_groups.id", ondelete="CASCADE"))
    coefficient: Mapped[Decimal] = mapped_column(Numeric(3, 2))


# ==========================================
# 3. ПРОГРАМИ ТА ШАБЛОНИ ТРЕНУВАНЬ
# ==========================================

class WorkoutProgram(Base):
    __tablename__ = "workout_programs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    source_program_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("workout_programs.id", ondelete="SET NULL"), nullable=True)
    
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visibility: Mapped[str] = mapped_column(String, default="PRIVATE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class WorkoutDay(Base):
    __tablename__ = "workout_days"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    source_workout_day_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("workout_days.id", ondelete="SET NULL"), nullable=True)
    
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_template: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ProgramDay(Base):
    __tablename__ = "program_days"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    program_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workout_programs.id", ondelete="CASCADE"))
    workout_day_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workout_days.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)

class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    workout_day_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workout_days.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exercises.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class WorkoutSetTemplate(Base):
    __tablename__ = "workout_set_templates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    workout_exercise_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workout_exercises.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    target_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    target_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    target_duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_warmup: Mapped[bool] = mapped_column(Boolean, default=False)


# ==========================================
# 4. РЕАЛЬНІ ТРЕНУВАЛЬНІ СЕСІЇ (АКТИВНІСТЬ)
# ==========================================

class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    trainer_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    title: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="PLANNED")
    planned_date: Mapped[date] = mapped_column(Date)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class SessionExercise(Base):
    __tablename__ = "session_exercises"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("training_sessions.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exercises.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class SessionExerciseSet(Base):
    __tablename__ = "session_exercise_sets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_exercise_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("session_exercises.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    
    planned_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    planned_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    planned_duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    actual_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actual_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    actual_duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_warmup: Mapped[bool] = mapped_column(Boolean, default=False)


# ==========================================
# 5. АНТРОПОМЕТРІЯ (ЗАМІРИ ТІЛА)
# ==========================================

class BodyMeasurement(Base):
    __tablename__ = "body_measurements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    measurement_date: Mapped[date] = mapped_column(Date)
    
    weight_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    body_fat_percent: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 2), nullable=True)
    chest_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    waist_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    hips_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    arm_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    thigh_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    calf_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)