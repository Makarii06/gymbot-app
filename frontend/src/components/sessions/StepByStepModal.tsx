import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api';
import { ExerciseInfoModal } from '../modals/ExerciseInfoModal';

// ─── helpers ──────────────────────────────────────────────

const fmt2 = (n: number) => String(Math.max(0, n)).padStart(2, '0');
const fmtTimer = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}:${fmt2(Math.floor((s % 3600) / 60))}:${fmt2(s % 60)}`
    : `${fmt2(Math.floor(s / 60))}:${fmt2(s % 60)}`;

const fmtVal = (v: number | null | undefined) =>
  v != null ? String(parseFloat(String(v))) : '';

// ─── StepSetRow ────────────────────────────────────────────

interface StepSetRowProps {
  set: any;
  idx: number;
  isCurrent: boolean;
  sessionId: number;
  seId: number;
  sessionStatus: string;
  onUpdated: (updatedSet: any) => void;
}

const StepSetRow: React.FC<StepSetRowProps> = ({
  set,
  idx,
  isCurrent,
  sessionId,
  seId,
  sessionStatus,
  onUpdated,
}) => {
  const isPlanned = sessionStatus === 'PLANNED';
  const initReps = isPlanned
    ? fmtVal(set.planned_reps)
    : fmtVal(set.actual_reps ?? set.planned_reps);
  const initWeight = isPlanned
    ? fmtVal(set.planned_weight)
    : fmtVal(set.actual_weight ?? set.planned_weight);

  const [reps, setReps] = useState(initReps);
  const [weight, setWeight] = useState(initWeight);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReps(isPlanned ? fmtVal(set.planned_reps) : fmtVal(set.actual_reps ?? set.planned_reps));
    setWeight(isPlanned ? fmtVal(set.planned_weight) : fmtVal(set.actual_weight ?? set.planned_weight));
  }, [set.id, set.planned_reps, set.planned_weight, set.actual_reps, set.actual_weight, isPlanned]);

  const buildPayload = () =>
    isPlanned
      ? { planned_reps: reps ? parseInt(reps) : undefined, planned_weight: weight ? parseFloat(weight) : undefined }
      : { actual_reps: reps ? parseInt(reps) : undefined, actual_weight: weight ? parseFloat(weight) : undefined };

  const handleComplete = async () => {
    if (isPlanned) return;
    setSaving(true);
    try {
      const updated = await api.updateSessionSet(sessionId, seId, set.id, {
        ...buildPayload(),
        completed: !set.completed,
      });
      onUpdated(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleBlurSave = async () => {
    if (set.completed && !isPlanned) return;
    try {
      const updated = await api.updateSessionSet(sessionId, seId, set.id, buildPayload());
      onUpdated(updated);
    } catch (e) { console.error(e); }
  };

  const isWarmup = set.is_warmup;
  const isCompleted = set.completed;
  const inputDisabled = isCompleted && !isPlanned;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all ${
        isCurrent && !isCompleted
          ? 'border-blue-500 bg-blue-900/15 shadow-lg shadow-blue-900/20'
          : isCompleted
          ? 'border-emerald-700/40 bg-emerald-900/15'
          : isWarmup
          ? 'border-amber-800/25 bg-amber-900/10'
          : 'border-slate-700/60 bg-slate-800/50'
      }`}
    >
      {/* Warmup / number indicator */}
      <div className="w-7 text-center flex-shrink-0">
        {isWarmup ? (
          <span className="text-base">🔥</span>
        ) : (
          <span
            className={`text-sm font-bold ${
              isCurrent && !isCompleted
                ? 'text-blue-400'
                : isCompleted
                ? 'text-emerald-500'
                : 'text-gray-500'
            }`}
          >
            {idx + 1}
          </span>
        )}
      </div>

      {/* Reps */}
      <input
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="повт"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={handleBlurSave}
        disabled={inputDisabled}
        className={`flex-1 min-w-0 text-center text-base font-semibold py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition border ${
          isCurrent && !isCompleted
            ? 'bg-blue-900/20 border-blue-700/60 focus:border-blue-500'
            : 'bg-slate-700/80 border-slate-600 focus:border-blue-500'
        } disabled:opacity-40`}
      />

      <span className="text-gray-500 text-sm flex-shrink-0 font-bold select-none">×</span>

      {/* Weight */}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        placeholder="кг"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={handleBlurSave}
        disabled={inputDisabled}
        className={`flex-1 min-w-0 text-center text-base font-semibold py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition border ${
          isCurrent && !isCompleted
            ? 'bg-blue-900/20 border-blue-700/60 focus:border-blue-500'
            : 'bg-slate-700/80 border-slate-600 focus:border-blue-500'
        } disabled:opacity-40`}
      />

      {/* Complete ✓ */}
      <button
        onClick={handleComplete}
        disabled={saving || isPlanned}
        className={`w-12 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-base font-bold transition ${
          isCompleted
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
            : isCurrent
            ? 'bg-blue-700/40 text-blue-300 hover:bg-emerald-700/60 hover:text-emerald-300 border border-blue-600/50'
            : 'bg-slate-700 text-gray-400 hover:bg-emerald-700/60 hover:text-emerald-300 border border-slate-600'
        }`}
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          '✓'
        )}
      </button>
    </div>
  );
};

// ─── RestTimer ────────────────────────────────────────────

interface RestTimerProps {
  initialSeconds: number;
  running: boolean;
  seconds: number;
  onAdd: (delta: number) => void;
  onToggle: () => void;
}

const RestTimer: React.FC<RestTimerProps> = ({ running, seconds, onAdd, onToggle }) => {
  const urgent = seconds > 0 && seconds <= 10;
  const expired = seconds === 0 && running === false;

  return (
    <div className="flex items-center gap-1 h-10">
      {/* Timer display */}
      <button
        onClick={onToggle}
        className={`h-full flex items-center gap-1.5 px-3 rounded-xl font-mono font-bold text-sm transition ${
          running
            ? urgent
              ? 'bg-red-900/40 text-red-300 border border-red-700'
              : 'bg-amber-900/30 text-amber-300 border border-amber-700/60'
            : expired
            ? 'bg-slate-800 text-gray-500 border border-slate-700'
            : 'bg-slate-800 text-gray-400 border border-slate-700 hover:text-white'
        }`}
      >
        <span className={`text-base ${running ? 'animate-pulse' : ''}`}>⏱</span>
        <span className={urgent ? 'animate-pulse' : ''}>{fmtTimer(seconds)}</span>
      </button>

      {/* +30s */}
      <button
        onClick={() => onAdd(30)}
        className="h-full px-2 text-xs font-bold text-gray-400 hover:text-amber-400 bg-slate-800 border border-slate-700 rounded-lg transition flex items-center justify-center"
      >
        +0:30
      </button>

      {/* +60s */}
      <button
        onClick={() => onAdd(60)}
        className="h-full px-2 text-xs font-bold text-gray-400 hover:text-amber-400 bg-slate-800 border border-slate-700 rounded-lg transition flex items-center justify-center"
      >
        +1:00
      </button>
    </div>
  );
};

// ─── ExerciseInfoSection ──────────────────────────────────

interface ExerciseInfoSectionProps {
  exercise: any;
  note?: string | null;
  onOpenInfo: () => void;
}

const ExerciseInfoSection: React.FC<ExerciseInfoSectionProps> = ({
  exercise,
  note,
  onOpenInfo,
}) => {
  const images = (exercise?.media || []).filter((m: any) => m.media_type === 'image');
  const firstImg = images[0];
  const muscles: string[] = (exercise?.muscles || []).map((m: any) => m.muscle_name || m.name || '');
  const description: string | null = exercise?.description || null;

  return (
    <div
      className="cursor-pointer"
      onClick={onOpenInfo}
    >
      {firstImg ? (
        <div className="relative">
          <img
            src={firstImg.url}
            alt={exercise?.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
          <div className="absolute top-2 right-2 bg-slate-900/70 backdrop-blur-sm px-2 py-1 rounded-lg">
            <span className="text-xs text-gray-400">ℹ Докладніше</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-lg font-bold text-white">{exercise?.name}</h2>
            {muscles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {muscles.slice(0, 4).map((m: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-900/60 border border-slate-700/50 rounded-full text-gray-300">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 px-4 py-5 bg-slate-900 border-b border-slate-800 relative">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl flex-shrink-0">
            💪
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">{exercise?.name}</h2>
            {muscles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {muscles.slice(0, 3).map((m: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-gray-400">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-gray-600 text-xs flex-shrink-0">ℹ</span>
        </div>
      )}

      {/* Block note (session-exercise note) */}
      {note && (
        <div className="mx-4 mt-2 px-3 py-2.5 bg-blue-900/15 border border-blue-800/30 rounded-xl">
          <p className="text-xs text-blue-300 leading-relaxed">📝 {note}</p>
        </div>
      )}
    </div>
  );
};

// ─── StepByStepModal ──────────────────────────────────────

interface StepByStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onSetUpdated: (seId: number, updatedSet: any) => void;
  zIndex?: number;
}

export const StepByStepModal: React.FC<StepByStepModalProps> = ({
  isOpen,
  onClose,
  session,
  onSetUpdated,
  zIndex = 200,
}) => {
  const exercises: any[] = session?.exercises || [];

  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSetId, setCurrentSetId] = useState<number | null>(null);
  const [autoAdvanceMsg, setAutoAdvanceMsg] = useState(false);
  const [infoExercise, setInfoExercise] = useState<any | null>(null);

  // Rest timer
  const restDefault = session?.rest_duration_seconds ?? 90;
  const [restSeconds, setRestSeconds] = useState(restDefault);
  const [restRunning, setRestRunning] = useState(false);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Swipe
  const touchStartX = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Top bar scroll
  const topBarRef = useRef<HTMLDivElement>(null);

  // Auto-advance timer ref
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Rest timer countdown ─────────────────────────────

  useEffect(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    if (!restRunning) return;
    restTimerRef.current = setInterval(() => {
      setRestSeconds((s) => {
        if (s <= 1) {
          setRestRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restRunning]);

  // ─── Initialize / reset on open ──────────────────────

  useEffect(() => {
    if (!isOpen) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setAutoAdvanceMsg(false);
    setRestRunning(false);
    setRestSeconds(session?.rest_duration_seconds ?? 90);

    // Find first incomplete exercise
    const firstIncompleteExIdx = exercises.findIndex(
      (ex: any) => ex.sets.length === 0 || !ex.sets.every((s: any) => s.completed)
    );
    const exIdx = firstIncompleteExIdx === -1 ? 0 : firstIncompleteExIdx;
    setCurrentExIdx(exIdx);

    // First incomplete set in that exercise
    const firstSet = exercises[exIdx]?.sets?.find((s: any) => !s.completed);
    setCurrentSetId(firstSet?.id ?? exercises[exIdx]?.sets?.[0]?.id ?? null);
  }, [isOpen]);

  // ─── Scroll top bar on exercise change ───────────────

  useEffect(() => {
    if (!topBarRef.current) return;
    const itemW = 52; // approx w-11 + gap-2
    const containerW = topBarRef.current.clientWidth;
    topBarRef.current.scrollTo({
      left: Math.max(0, currentExIdx * itemW - containerW / 2 + itemW / 2),
      behavior: 'smooth',
    });
  }, [currentExIdx]);

  // ─── Helpers ─────────────────────────────────────────

  const currentEx = exercises[currentExIdx];

  const findNextIncompleteSet = useCallback(
    (fromSetId: number | null, fromExIdx: number): { setId: number; exIdx: number } | null => {
      for (let ei = fromExIdx; ei < exercises.length; ei++) {
        const ex = exercises[ei];
        const startSI =
          ei === fromExIdx && fromSetId !== null
            ? ex.sets.findIndex((s: any) => s.id === fromSetId) + 1
            : 0;
        for (let si = startSI; si < ex.sets.length; si++) {
          if (!ex.sets[si].completed) {
            return { setId: ex.sets[si].id, exIdx: ei };
          }
        }
      }
      return null;
    },
    [exercises]
  );

  const goToExercise = useCallback(
    (idx: number) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      setAutoAdvanceMsg(false);
      const clamped = Math.max(0, Math.min(idx, exercises.length - 1));
      setCurrentExIdx(clamped);
      const ex = exercises[clamped];
      const firstIncomplete = ex?.sets?.find((s: any) => !s.completed);
      setCurrentSetId(firstIncomplete?.id ?? ex?.sets?.[0]?.id ?? null);
    },
    [exercises]
  );

  const triggerAutoAdvance = useCallback(
    (nextExIdx: number) => {
      setAutoAdvanceMsg(true);
      advanceTimerRef.current = setTimeout(() => {
        goToExercise(nextExIdx);
        setAutoAdvanceMsg(false);
      }, 1200);
    },
    [goToExercise]
  );

  // ─── Bottom bar actions ───────────────────────────────

  const handleBottomComplete = async () => {
    if (!currentSetId || !currentEx) return;
    const set = currentEx.sets.find((s: any) => s.id === currentSetId);
    if (!set || set.completed) return;

    // Build payload
    const payload = {
      actual_reps: set.actual_reps ?? set.planned_reps ?? undefined,
      actual_weight: set.actual_weight
        ? parseFloat(String(set.actual_weight))
        : set.planned_weight
        ? parseFloat(String(set.planned_weight))
        : undefined,
      completed: true,
    };

    try {
      const updated = await api.updateSessionSet(session.id, currentEx.id, set.id, payload);
      onSetUpdated(currentEx.id, updated);

      // Start rest timer
      setRestSeconds(session?.rest_duration_seconds ?? 90);
      setRestRunning(true);

      // Check if all sets in current exercise will be done
      const allWillBeDone = currentEx.sets.every((s: any) =>
        s.id === set.id ? true : s.completed
      );

      if (allWillBeDone) {
        // Find next incomplete exercise
        const nextExIdx = exercises.findIndex(
          (ex: any, i: number) => i > currentExIdx && ex.sets.some((s: any) => !s.completed)
        );
        if (nextExIdx !== -1) {
          triggerAutoAdvance(nextExIdx);
        }
        // else: all done!
      } else {
        // Move to next incomplete set in same exercise
        const next = findNextIncompleteSet(set.id, currentExIdx);
        if (next) setCurrentSetId(next.setId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBottomSkip = () => {
    if (!currentEx) return;
    const next = findNextIncompleteSet(currentSetId, currentExIdx);
    if (next) {
      if (next.exIdx !== currentExIdx) {
        goToExercise(next.exIdx);
      } else {
        setCurrentSetId(next.setId);
      }
    }
  };

  // Handle individual row complete (from StepSetRow ✓ button)
  const handleRowSetUpdated = useCallback(
    (updatedSet: any) => {
      onSetUpdated(currentEx.id, updatedSet);

      if (!updatedSet.completed) return; // un-completing: no auto-advance

      // Check auto-advance
      const allWillBeDone = currentEx.sets.every((s: any) =>
        s.id === updatedSet.id ? true : s.completed
      );

      if (allWillBeDone) {
        const nextExIdx = exercises.findIndex(
          (ex: any, i: number) => i > currentExIdx && ex.sets.some((s: any) => !s.completed)
        );
        if (nextExIdx !== -1) {
          triggerAutoAdvance(nextExIdx);
          return;
        }
      }

      // Move to next incomplete set
      if (currentSetId === updatedSet.id) {
        const next = findNextIncompleteSet(updatedSet.id, currentExIdx);
        if (next && next.exIdx === currentExIdx) {
          setCurrentSetId(next.setId);
        }
      }
    },
    [currentEx, exercises, currentExIdx, currentSetId, findNextIncompleteSet, triggerAutoAdvance, onSetUpdated]
  );

  // ─── Swipe handlers ───────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0 && currentExIdx < exercises.length - 1) {
      goToExercise(currentExIdx + 1);
    } else if (delta > 0 && currentExIdx > 0) {
      goToExercise(currentExIdx - 1);
    }
  };

  // ─── Status helpers ───────────────────────────────────

  const getExStatus = (ex: any): 'done' | 'partial' | 'empty' | 'pending' => {
    if (!ex.sets.length) return 'empty';
    if (ex.sets.every((s: any) => s.completed)) return 'done';
    if (ex.sets.some((s: any) => s.completed)) return 'partial';
    return 'pending';
  };

  const doneExCount = exercises.filter(
    (ex: any) => ex.sets.length > 0 && ex.sets.every((s: any) => s.completed)
  ).length;

  const completedSetsInCurrent = currentEx?.sets?.filter((s: any) => s.completed).length ?? 0;
  const totalSetsInCurrent = currentEx?.sets?.length ?? 0;

  const allDone = doneExCount === exercises.length && exercises.length > 0;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 flex flex-col bg-slate-950 text-white"
        style={{ zIndex }}
      >
        {/* ─── Header ─── */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-slate-800 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Покроковий режим</p>
            <p className="text-sm font-bold text-white truncate">{session?.title}</p>
          </div>
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-[10px] text-gray-500">Вправ</p>
            <p className="text-xs font-bold">
              <span className="text-emerald-400">{doneExCount}</span>
              <span className="text-gray-600">/{exercises.length}</span>
            </p>
          </div>
          {/* Close — right side */}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-gray-400 hover:text-white transition flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ─── Top bar: numbered exercise indicators ─── */}
        <div
          ref={topBarRef}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-3 overflow-x-auto border-b border-slate-800"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as any}
        >
          {exercises.map((ex: any, i: number) => {
            const status = getExStatus(ex);
            const isCurrent = i === currentExIdx;
            return (
              <button
                key={ex.id}
                onClick={() => goToExercise(i)}
                className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-900/30 text-amber-300 scale-110'
                    : status === 'done'
                    ? 'border-emerald-600 bg-emerald-900/20 text-emerald-400'
                    : status === 'partial'
                    ? 'border-blue-700 bg-blue-900/20 text-blue-400'
                    : 'border-slate-700 bg-slate-800/60 text-gray-500'
                }`}
              >
                {status === 'done' && !isCurrent ? '✓' : i + 1}
              </button>
            );
          })}
          <div className="flex-shrink-0 w-4" />
        </div>

        {/* ─── Content (swipeable) ─── */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentEx ? (
            <>
              {/* Exercise info — clickable to open full info */}
              <ExerciseInfoSection
                exercise={currentEx.exercise}
                note={currentEx.note}
                onOpenInfo={() => setInfoExercise(currentEx.exercise)}
              />

              {/* Sets */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Підходи
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="text-emerald-400 font-bold">{completedSetsInCurrent}</span>
                    /{totalSetsInCurrent}
                  </p>
                </div>
                <div className="space-y-2">
                  {currentEx.sets.map((set: any, i: number) => (
                    <StepSetRow
                      key={set.id}
                      set={set}
                      idx={i}
                      isCurrent={set.id === currentSetId}
                      sessionId={session.id}
                      seId={currentEx.id}
                      sessionStatus={session.status}
                      onUpdated={handleRowSetUpdated}
                    />
                  ))}
                  {currentEx.sets.length === 0 && (
                    <p className="text-center text-gray-600 py-8 text-sm">
                      Підходів для цієї вправи немає
                    </p>
                  )}
                </div>
              </div>

              {/* Swipe hint */}
              <p className="text-center text-[10px] text-gray-700 pb-28 pt-1">
                ← свайп для навігації →
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
              <span className="text-4xl">🏋️</span>
              <p>Вправ немає</p>
            </div>
          )}
        </div>

        {/* ─── Fixed bottom bar ─── */}
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm px-4 pb-safe pb-5 pt-3">
          {allDone ? (
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl font-bold text-base bg-emerald-700 hover:bg-emerald-600 text-white transition"
            >
              🎉 Тренування завершено!
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* Skip ✕ */}
              <button
                onClick={handleBottomSkip}
                className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-white hover:border-slate-600 transition"
              >
                <span className="text-lg font-bold leading-none">✕</span>
                <span className="text-[9px] uppercase tracking-wide">пропуск</span>
              </button>

              {/* Rest timer */}
              <div className="flex-1 flex justify-center">
                <RestTimer
                  initialSeconds={restDefault}
                  running={restRunning}
                  seconds={restSeconds}
                  onAdd={(delta) => setRestSeconds((s) => s + delta)}
                  onToggle={() => {
                    if (!restRunning && restSeconds === 0) {
                      setRestSeconds(restDefault);
                    }
                    setRestRunning((r) => !r);
                  }}
                />
              </div>

              {/* Complete ✓ */}
              <button
                onClick={handleBottomComplete}
                className="w-14 h-14 flex-shrink-0 rounded-2xl bg-emerald-700 hover:bg-emerald-600 flex flex-col items-center justify-center gap-0.5 text-white transition shadow-lg shadow-emerald-900/40"
              >
                <span className="text-xl font-bold leading-none">✓</span>
                <span className="text-[9px] uppercase tracking-wide">готово</span>
              </button>
            </div>
          )}
        </div>

        {/* Auto-advance toast */}
        {autoAdvanceMsg && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 10 }}>
            <div className="flex items-center gap-2.5 px-5 py-3 bg-emerald-950/95 border border-emerald-700 rounded-2xl backdrop-blur-sm shadow-xl">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm font-semibold text-emerald-300">
                Наступна вправа…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Exercise info modal */}
      <ExerciseInfoModal
        isOpen={!!infoExercise}
        onClose={() => setInfoExercise(null)}
        exercise={infoExercise}
        zIndex={zIndex + 10}
      />
    </>
  );
};
