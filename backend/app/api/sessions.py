from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update as sql_update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date as date_type

from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User, TrainingSession, SessionExercise, SessionExerciseSet,
    WorkoutDay, WorkoutExercise, Exercise, ExerciseTag, ExerciseMuscle
)
from app.schemas import (
    TrainingSessionCreate, TrainingSessionUpdate,
    TrainingSessionResponse, TrainingSessionDetailResponse,
    SessionExerciseAddRequest, SessionExerciseSetUpdate, SessionExerciseSetCreate,
    SessionExerciseResponse, SessionExerciseSetResponse, SessionExerciseReorderItem,
    SessionExerciseUpdate,
)

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

def _session_detail_options():
    """selectinload для повного завантаження сесії."""
    return [
        selectinload(TrainingSession.exercises)
        .selectinload(SessionExercise.sets),
        selectinload(TrainingSession.exercises)
        .selectinload(SessionExercise.exercise)
        .selectinload(Exercise.exercise_tags)
        .selectinload(ExerciseTag.tag),
        selectinload(TrainingSession.exercises)
        .selectinload(SessionExercise.exercise)
        .selectinload(Exercise.muscles)
        .selectinload(ExerciseMuscle.muscle_group),
        selectinload(TrainingSession.exercises)
        .selectinload(SessionExercise.exercise)
        .selectinload(Exercise.media),
    ]


async def _get_session_or_404(
    session_id: int, owner_id: int, db: AsyncSession, *, detail: bool = False
) -> TrainingSession:
    query = select(TrainingSession).where(
        TrainingSession.id == session_id,
        TrainingSession.owner_id == owner_id,
    )
    if detail:
        query = query.options(*_session_detail_options())

    result = await db.execute(query)
    session = result.scalars().unique().one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Сесію не знайдено")
    return session


# ─────────────────────────────────────────
# Список сесій
# ─────────────────────────────────────────

@router.get("/", response_model=List[TrainingSessionResponse])
async def list_sessions(
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(TrainingSession)
        .where(TrainingSession.owner_id == current_user.id)
        .order_by(TrainingSession.planned_date, TrainingSession.created_at)
    )
    if date_from:
        query = query.where(TrainingSession.planned_date >= date_from)
    if date_to:
        query = query.where(TrainingSession.planned_date <= date_to)

    result = await db.execute(query)
    return result.scalars().all()


# ─────────────────────────────────────────
# Створення сесії
# ─────────────────────────────────────────

@router.post("/", response_model=TrainingSessionDetailResponse, status_code=201)
async def create_session(
    data: TrainingSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Визначаємо статус залежно від дати
    today = date_type.today()
    if data.planned_date < today:
        # Минуле тренування — одразу DONE
        status_val = "DONE"
        now = datetime.utcnow()
        started_at = now
        finished_at = now
    elif data.start_immediately:
        status_val = "IN_PROGRESS"
        started_at = datetime.utcnow()
        finished_at = None
    else:
        status_val = "PLANNED"
        started_at = None
        finished_at = None

    session = TrainingSession(
        owner_id=current_user.id,
        title=data.title,
        planned_date=data.planned_date,
        description=data.description,
        status=status_val,
        started_at=started_at,
        finished_at=finished_at,
    )
    db.add(session)
    await db.flush()  # отримуємо session.id

    # Якщо передано workout_day_id — копіюємо вправи та підходи з шаблону
    if data.from_workout_day_id:
        wd_result = await db.execute(
            select(WorkoutDay)
            .where(WorkoutDay.id == data.from_workout_day_id)
            .options(
                selectinload(WorkoutDay.exercises)
                .selectinload(WorkoutExercise.sets)
            )
        )
        workout_day = wd_result.scalar_one_or_none()

        if workout_day:
            for we in sorted(workout_day.exercises, key=lambda x: x.position):
                se = SessionExercise(
                    session_id=session.id,
                    exercise_id=we.exercise_id,
                    position=we.position,
                    note=we.note,
                )
                db.add(se)
                await db.flush()

                for wst in sorted(we.sets, key=lambda x: x.position):
                    ses = SessionExerciseSet(
                        session_exercise_id=se.id,
                        position=wst.position,
                        planned_reps=wst.target_reps,
                        planned_weight=wst.target_weight,
                        planned_duration_sec=wst.target_duration_sec,
                        is_warmup=wst.is_warmup,
                        completed=False,
                    )
                    db.add(ses)

    await db.commit()

    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session.id)
        .options(*_session_detail_options())
    )
    return result.scalars().unique().one()


# ─────────────────────────────────────────
# Деталі сесії
# ─────────────────────────────────────────

@router.get("/{session_id}", response_model=TrainingSessionDetailResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_session_or_404(session_id, current_user.id, db, detail=True)


# ─────────────────────────────────────────
# Оновлення назви / дати
# ─────────────────────────────────────────

@router.patch("/{session_id}", response_model=TrainingSessionResponse)
async def update_session(
    session_id: int,
    data: TrainingSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await _get_session_or_404(session_id, current_user.id, db)
    if data.title is not None:
        session.title = data.title
    if data.planned_date is not None:
        session.planned_date = data.planned_date
    if data.description is not None:
        session.description = data.description
    if data.rest_duration_seconds is not None:
        session.rest_duration_seconds = data.rest_duration_seconds
    await db.commit()
    await db.refresh(session)
    return session


# ─────────────────────────────────────────
# Видалення сесії
# ─────────────────────────────────────────

@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await _get_session_or_404(session_id, current_user.id, db)
    await db.delete(session)
    await db.commit()


# ─────────────────────────────────────────
# Старт / Завершення сесії
# ─────────────────────────────────────────

@router.patch("/{session_id}/start", response_model=TrainingSessionResponse)
async def start_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await _get_session_or_404(session_id, current_user.id, db)
    session.status = "IN_PROGRESS"
    session.started_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return session


@router.patch("/{session_id}/finish", response_model=TrainingSessionResponse)
async def finish_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await _get_session_or_404(session_id, current_user.id, db)
    session.status = "DONE"
    session.finished_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return session


@router.patch("/{session_id}/resume", response_model=TrainingSessionResponse)
async def resume_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Повертає завершену сесію у стан IN_PROGRESS."""
    session = await _get_session_or_404(session_id, current_user.id, db)
    session.status = "IN_PROGRESS"
    session.finished_at = None
    # started_at залишаємо незмінним
    await db.commit()
    await db.refresh(session)
    return session


# ─────────────────────────────────────────
# Управління вправами в сесії
# ─────────────────────────────────────────

@router.post("/{session_id}/exercises", response_model=TrainingSessionDetailResponse, status_code=201)
async def add_exercise_to_session(
    session_id: int,
    data: SessionExerciseAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_session_or_404(session_id, current_user.id, db)

    pos_result = await db.execute(
        select(SessionExercise).where(SessionExercise.session_id == session_id)
    )
    existing = pos_result.scalars().all()
    position = max((e.position for e in existing), default=0) + 1

    se = SessionExercise(
        session_id=session_id,
        exercise_id=data.exercise_id,
        position=position,
        note=data.note,
    )
    db.add(se)
    await db.commit()

    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .options(*_session_detail_options())
    )
    return result.scalars().unique().one()


@router.delete("/{session_id}/exercises/{se_id}", status_code=204)
async def remove_exercise_from_session(
    session_id: int,
    se_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_session_or_404(session_id, current_user.id, db)

    result = await db.execute(
        select(SessionExercise).where(
            SessionExercise.id == se_id,
            SessionExercise.session_id == session_id,
        )
    )
    se = result.scalar_one_or_none()
    if not se:
        raise HTTPException(status_code=404, detail="Вправу не знайдено")

    await db.delete(se)
    await db.commit()


# ─────────────────────────────────────────
# Оновлення вправи в сесії (нотатка)
# ─────────────────────────────────────────

@router.patch("/{session_id}/exercises/{se_id}", response_model=SessionExerciseResponse)
async def update_session_exercise(
    session_id: int,
    se_id: int,
    data: SessionExerciseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_session_or_404(session_id, current_user.id, db)
    result = await db.execute(
        select(SessionExercise).where(
            SessionExercise.id == se_id,
            SessionExercise.session_id == session_id,
        )
    )
    se = result.scalar_one_or_none()
    if not se:
        raise HTTPException(status_code=404, detail="Вправу не знайдено")
    if data.note is not None:
        se.note = data.note
    await db.commit()
    await db.refresh(se)
    # Повертаємо повний об’єкт із eagerly-завантаженими зв’язками
    result2 = await db.execute(
        select(SessionExercise)
        .where(SessionExercise.id == se_id)
        .options(
            selectinload(SessionExercise.exercise).selectinload(Exercise.media),
            selectinload(SessionExercise.exercise).selectinload(Exercise.muscles),
            selectinload(SessionExercise.sets),
        )
    )
    return result2.scalars().unique().one()


# ─────────────────────────────────────────
# Управління підходами в сесії
# ─────────────────────────────────────────

@router.patch(
    "/{session_id}/exercises/{se_id}/sets/{set_id}",
    response_model=SessionExerciseSetResponse,
)
async def update_session_set(
    session_id: int,
    se_id: int,
    set_id: int,
    data: SessionExerciseSetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_session_or_404(session_id, current_user.id, db)

    result = await db.execute(
        select(SessionExerciseSet).where(
            SessionExerciseSet.id == set_id,
            SessionExerciseSet.session_exercise_id == se_id,
        )
    )
    set_obj = result.scalar_one_or_none()
    if not set_obj:
        raise HTTPException(status_code=404, detail="Підхід не знайдено")

    # Оновлюємо лише ті поля, які передані (partial update)
    if data.planned_reps is not None:
        set_obj.planned_reps = data.planned_reps
    if data.planned_weight is not None:
        set_obj.planned_weight = data.planned_weight
    if data.actual_reps is not None:
        set_obj.actual_reps = data.actual_reps
    if data.actual_weight is not None:
        set_obj.actual_weight = data.actual_weight
    if data.actual_duration_sec is not None:
        set_obj.actual_duration_sec = data.actual_duration_sec
    if data.completed is not None:
        set_obj.completed = data.completed
    if data.is_warmup is not None:
        set_obj.is_warmup = data.is_warmup

    await db.commit()
    await db.refresh(set_obj)
    return set_obj


@router.post(
    "/{session_id}/exercises/{se_id}/sets",
    response_model=SessionExerciseSetResponse,
    status_code=201,
)
async def add_set_to_session_exercise(
    session_id: int,
    se_id: int,
    data: SessionExerciseSetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_session_or_404(session_id, current_user.id, db)

    pos_result = await db.execute(
        select(SessionExerciseSet).where(SessionExerciseSet.session_exercise_id == se_id)
    )
    existing = pos_result.scalars().all()
    position = max((s.position for s in existing), default=0) + 1

    new_set = SessionExerciseSet(
        session_exercise_id=se_id,
        position=position,
        planned_reps=data.planned_reps,
        planned_weight=data.planned_weight,
        is_warmup=data.is_warmup,
        completed=False,
    )
    db.add(new_set)
    await db.commit()
    await db.refresh(new_set)
    return new_set


@router.post("/{session_id}/complete-all-sets", response_model=TrainingSessionDetailResponse)
async def complete_all_session_sets(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Позначає всі невиконані підходи як виконані, копіюючи планові значення у фактичні."""
    session = await _get_session_or_404(session_id, current_user.id, db, detail=True)

    for ex in session.exercises:
        for s in ex.sets:
            if not s.completed:
                s.actual_reps = s.actual_reps if s.actual_reps is not None else s.planned_reps
                s.actual_weight = s.actual_weight if s.actual_weight is not None else s.planned_weight
                s.completed = True

    await db.commit()
    
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .options(*_session_detail_options())
    )
    return result.scalars().unique().one()

@router.delete("/{session_id}/exercises/{se_id}/sets/{set_id}", status_code=204)
async def delete_session_set(
    session_id: int,
    se_id: int,
    set_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_session_or_404(session_id, current_user.id, db)

    result = await db.execute(
        select(SessionExerciseSet).where(
            SessionExerciseSet.id == set_id,
            SessionExerciseSet.session_exercise_id == se_id,
        )
    )
    set_obj = result.scalar_one_or_none()
    if not set_obj:
        raise HTTPException(status_code=404, detail="Підхід не знайдено")

    await db.delete(set_obj)
    await db.commit()


# ─────────────────────────────────────────
# Пересортування вправ у сесії
# ─────────────────────────────────────────

@router.put("/{session_id}/exercises/reorder", status_code=204)
async def reorder_session_exercises(
    session_id: int,
    order: List[SessionExerciseReorderItem],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_session_or_404(session_id, current_user.id, db)
    for item in order:
        await db.execute(
            sql_update(SessionExercise)
            .where(
                SessionExercise.id == item.se_id,
                SessionExercise.session_id == session_id,
            )
            .values(position=item.position)
        )
    await db.commit()
