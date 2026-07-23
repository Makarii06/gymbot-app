import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api';
import { FullscreenModal } from '../modals/FullscreenModal';
import { ExerciseSelectorModal } from '../modals/ExerciseSelectorModal';
import { ExerciseInfoModal } from '../modals/ExerciseInfoModal';
import { StepByStepModal } from './StepByStepModal';

// ─── helpers ──────────────────────────────────────────────

const fmt2 = (n: number) => String(n).padStart(2, '0');

const formatElapsed = (startedAt: string | null): string => {
  if (!startedAt) return '00:00:00';
  const startMs = new Date(startedAt.endsWith('Z') ? startedAt : startedAt + 'Z').getTime();
  const ms = Math.max(0, Date.now() - startMs);
  const s = Math.floor(ms / 1000);
  return `${fmt2(Math.floor(s / 3600))}:${fmt2(Math.floor((s % 3600) / 60))}:${fmt2(s % 60)}`;
};

const formatDuration = (startedAt: string | null, finishedAt: string | null): string => {
  if (!startedAt) return '—';
  const endMs = finishedAt
    ? new Date(finishedAt.endsWith('Z') ? finishedAt : finishedAt + 'Z').getTime()
    : Date.now();
  const ms = endMs - new Date(startedAt.endsWith('Z') ? startedAt : startedAt + 'Z').getTime();
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} год ${fmt2(m)} хв`;
  return `${m} хв`;
};

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtVal = (v: number | null | undefined) =>
  v != null ? String(parseFloat(String(v))) : '';

// ─── SessionSetRow ─────────────────────────────────────────

interface SessionSetRowProps {
  set: any;
  idx: number;
  sessionId: number;
  seId: number;
  sessionStatus: string;
  onUpdated: (updatedSet: any) => void;
  onDelete: (setId: number) => void;
}

const SessionSetRow: React.FC<SessionSetRowProps> = ({
  set,
  idx,
  sessionId,
  seId,
  sessionStatus,
  onUpdated,
  onDelete,
}) => {
  const isPlanned = sessionStatus === 'PLANNED';
  const isActive = sessionStatus === 'IN_PROGRESS';
  const isDone = sessionStatus === 'DONE';

  const initReps = isPlanned
    ? fmtVal(set.planned_reps)
    : fmtVal(set.actual_reps ?? set.planned_reps);
  const initWeight = isPlanned
    ? fmtVal(set.planned_weight)
    : fmtVal(set.actual_weight ?? set.planned_weight);

  const [reps, setReps] = useState(initReps);
  const [weight, setWeight] = useState(initWeight);
  const [saving, setSaving] = useState(false);
  const [warmupSaving, setWarmupSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const confirmDelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setReps(isPlanned ? fmtVal(set.planned_reps) : fmtVal(set.actual_reps ?? set.planned_reps));
    setWeight(isPlanned ? fmtVal(set.planned_weight) : fmtVal(set.actual_weight ?? set.planned_weight));
  }, [set.id, set.planned_reps, set.planned_weight, set.actual_reps, set.actual_weight, isPlanned]);

  const buildPayload = () =>
    isPlanned
      ? {
          planned_reps: reps !== '' ? parseInt(reps) : undefined,
          planned_weight: weight !== '' ? parseFloat(weight) : undefined,
        }
      : {
          actual_reps: reps !== '' ? parseInt(reps) : undefined,
          actual_weight: weight !== '' ? parseFloat(weight) : undefined,
        };

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
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleWarmup = async () => {
    setWarmupSaving(true);
    try {
      const updated = await api.updateSessionSet(sessionId, seId, set.id, {
        is_warmup: !set.is_warmup,
      });
      onUpdated(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setWarmupSaving(false);
    }
  };

  const handleDeleteClick = () => {
    if (!confirmDel) {
      setConfirmDel(true);
      confirmDelTimer.current = setTimeout(() => setConfirmDel(false), 3000);
    } else {
      if (confirmDelTimer.current) clearTimeout(confirmDelTimer.current);
      onDelete(set.id);
    }
  };

  const isWarmup = set.is_warmup;
  const isCompleted = set.completed;
  const showComplete = isActive || isDone;
  const inputDisabled = isCompleted && !isPlanned;

  return (
    <div
      className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-all ${
        isCompleted
          ? 'bg-emerald-900/20 border border-emerald-800/30'
          : isWarmup
          ? 'bg-amber-900/10 border border-amber-800/20'
          : 'bg-slate-800/60 border border-slate-700/50'
      }`}
    >
      {/* Warmup toggle / set number */}
      <button
        onClick={handleToggleWarmup}
        disabled={warmupSaving}
        title={isWarmup ? 'Розминочний. Натисніть щоб скасувати' : 'Позначити як розминочний'}
        className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded hover:bg-slate-700 transition"
      >
        {warmupSaving ? (
          <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
        ) : isWarmup ? (
          <span className="text-sm">🔥</span>
        ) : (
          <span className="text-xs text-gray-500 font-mono">{idx + 1}</span>
        )}
      </button>

      {/* Reps input */}
      <input
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="повт"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={handleBlurSave}
        disabled={inputDisabled}
        className="flex-1 min-w-0 text-center text-sm py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40 transition"
      />

      {/* × visual separator */}
      <span className="text-gray-500 text-xs flex-shrink-0 select-none">×</span>

      {/* Weight input */}
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
        className="flex-1 min-w-0 text-center text-sm py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40 transition"
      />

      {/* Complete ✓ button */}
      {showComplete && (
        <button
          onClick={handleComplete}
          disabled={saving}
          className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-sm transition ${
            isCompleted
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-700 text-gray-400 hover:bg-emerald-700/50 hover:text-emerald-400'
          }`}
        >
          {saving ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            '✓'
          )}
        </button>
      )}

      {/* Delete button (always available — editing allowed for all statuses) */}
      <button
        onClick={handleDeleteClick}
        className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-xs transition ${
          confirmDel ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-red-400 hover:bg-red-900/20'
        }`}
      >
        {confirmDel ? '!' : '✕'}
      </button>
    </div>
  );
};

// ─── SessionExerciseBlock ──────────────────────────────────

interface SessionExerciseBlockProps {
  se: any;
  sessionId: number;
  sessionStatus: string;
  onSetUpdated: (updatedSet: any) => void;
  onSetDeleted: (setId: number) => void;
  onAddSet: () => void;
  onRemove: () => void;
  onInfoOpen: (ex: any) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

const SessionExerciseBlock: React.FC<SessionExerciseBlockProps> = ({
  se,
  sessionId,
  sessionStatus,
  onSetUpdated,
  onSetDeleted,
  onAddSet,
  onRemove,
  onInfoOpen,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ex = se.exercise;
  const firstImg = (ex?.media || []).find((m: any) => m.media_type === 'image');
  const isActive = sessionStatus === 'IN_PROGRESS';

  const handleRemoveClick = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      removeTimer.current = setTimeout(() => setConfirmRemove(false), 3000);
    } else {
      if (removeTimer.current) clearTimeout(removeTimer.current);
      onRemove();
    }
  };

  // Note editing
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(se.note || '');
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const handleNoteBlur = async () => {
    setEditingNote(false);
    if (noteValue !== (se.note || '')) {
      try {
        await api.updateSessionExercise(sessionId, se.id, { note: noteValue || null });
      } catch (e) { console.error(e); }
    }
  };

  const openNoteEdit = () => {
    setEditingNote(true);
    setTimeout(() => noteInputRef.current?.focus(), 50);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
        isDragOver
          ? 'border-blue-500 bg-slate-800/80 scale-[1.01]'
          : isDragging
          ? 'border-slate-700 opacity-40'
          : 'border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3">
        {/* Drag handle */}
        <div className="text-gray-600 text-base cursor-grab active:cursor-grabbing select-none flex-shrink-0">
          ⠿
        </div>

        {/* Photo */}
        <div
          className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={() => onInfoOpen(ex)}
        >
          {firstImg ? (
            <img src={firstImg.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">💪</span>
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onInfoOpen(ex)}>
          <p className="text-sm font-bold text-white truncate">{ex?.name || '—'}</p>
        </div>

        {/* Note edit / show */}
        <button
          onClick={openNoteEdit}
          className="text-gray-600 hover:text-blue-400 text-sm px-1 flex-shrink-0 transition"
          title="Додати/змінити нотатку"
        >
          ✏️
        </button>

        <button
          onClick={handleRemoveClick}
          className={`text-xs px-2 py-1 rounded-lg transition flex-shrink-0 border ${
            confirmRemove
              ? 'bg-red-600/20 text-red-400 border-red-800'
              : 'text-gray-600 border-slate-700 hover:text-red-400 hover:border-red-900'
          }`}
        >
          {confirmRemove ? 'Видалити?' : '✕'}
        </button>
      </div>

      {/* Inline note editing */}
      {editingNote ? (
        <div className="px-3 pb-2 flex items-start gap-2">
          <textarea
            ref={noteInputRef}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Нотатка до вправи..."
            rows={2}
            className="flex-1 text-xs bg-slate-800 border border-blue-700/60 rounded-xl px-3 py-2 text-gray-300 placeholder-gray-600 focus:outline-none resize-none"
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleNoteBlur();
            }}
            className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition flex-shrink-0"
          >
            ✓
          </button>
        </div>
      ) : noteValue ? (
        <div
          className="mx-3 mb-2 px-2.5 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg cursor-pointer hover:border-slate-600 transition"
          onClick={openNoteEdit}
        >
          <p className="text-xs text-gray-500">{noteValue}</p>
        </div>
      ) : null}

      {/* Column headers */}
      <div className="flex items-center gap-2 px-2 pb-1 text-[10px] text-gray-600 uppercase tracking-wider">
        <div className="w-6" /> {/* warmup toggle */}
        <div className="flex-1 text-center">Повт</div>
        <div className="w-3" /> {/* × */}
        <div className="flex-1 text-center">Вага (кг)</div>
        {(isActive || sessionStatus === 'DONE') && <div className="w-8" />} {/* ✓ */}
        <div className="w-7" /> {/* delete */}
      </div>

      {/* Set rows */}
      <div className="px-2 pb-2 space-y-1">
        {se.sets.map((set: any, i: number) => (
          <SessionSetRow
            key={set.id}
            set={set}
            idx={i}
            sessionId={sessionId}
            seId={se.id}
            sessionStatus={sessionStatus}
            onUpdated={onSetUpdated}
            onDelete={onSetDeleted}
          />
        ))}

        {/* Phantom add set row */}
        <button
          onClick={onAddSet}
          className="w-full text-xs text-gray-600 hover:text-blue-400 py-1.5 flex items-center justify-center gap-1 transition rounded-lg hover:bg-blue-900/10"
        >
          <span className="text-base leading-none">+</span> підхід
        </button>
      </div>
    </div>
  );
};

// ─── SessionDetailModal ────────────────────────────────────

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number | null;
  onUpdate: () => void;
  zIndex?: number;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onUpdate,
  zIndex = 150,
}) => {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const [infoExercise, setInfoExercise] = useState<any | null>(null);
  const [isStepByStepOpen, setIsStepByStepOpen] = useState(false);
  const [showStepHint, setShowStepHint] = useState(false);
  const progressBarRef = useRef<HTMLButtonElement>(null);

  // Drag state
  const [dragSrcId, setDragSrcId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // ─── Load ─────────────────────────────────────────────

  const loadSession = useCallback(
    async (bg = false) => {
      if (!sessionId) return;
      if (!bg) setLoading(true);
      try {
        const data = await api.getSession(sessionId);
        setSession(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!bg) setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (isOpen && sessionId) {
      loadSession();
    } else {
      setSession(null);
      setConfirmFinish(false);
      setConfirmDelete(false);
      setDragSrcId(null);
      setDragOverId(null);
    }
  }, [isOpen, sessionId]);

  // ─── Timer ────────────────────────────────────────────

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (session?.status === 'IN_PROGRESS' && session.started_at) {
      setTimer(formatElapsed(session.started_at));
      timerRef.current = setInterval(
        () => setTimer(formatElapsed(session.started_at)),
        1000
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status, session?.started_at]);

  // ─── Computed ─────────────────────────────────────────

  const todayStr = getTodayStr();
  const isPlanned = session?.status === 'PLANNED';
  const isActive = session?.status === 'IN_PROGRESS';
  const isDone = session?.status === 'DONE';

  const canStart = isPlanned && session?.planned_date <= todayStr;
  const canResume = isDone; // можна відновити будь-яку виконану сесію

  const completedSets =
    session?.exercises?.flatMap((se: any) => se.sets).filter((s: any) => s.completed).length ?? 0;
  const totalSets = session?.exercises?.flatMap((se: any) => se.sets).length ?? 0;

  const statusLabel = isActive
    ? `⏱ ${timer}`
    : isDone
    ? '✓ Виконано'
    : '📅 Заплановано';

  // ─── Actions ──────────────────────────────────────────

  const handleStart = async () => {
    if (!session) return;
    try {
      const updated = await api.startSession(session.id);
      setSession((prev: any) => ({ ...prev, ...updated }));
      onUpdate();

      setShowStepHint(true);
      setTimeout(() => {
        progressBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      setTimeout(() => setShowStepHint(false), 5000);
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      const updated = await api.resumeSession(session.id);
      setSession((prev: any) => ({ ...prev, ...updated }));
      onUpdate();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const handleFinish = async () => {
    if (!session) return;
    if (!confirmFinish) {
      setConfirmFinish(true);
      finishTimerRef.current = setTimeout(() => setConfirmFinish(false), 4000);
      return;
    }
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    try {
      await api.finishSession(session.id);
      onUpdate();
      onClose();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 3500);
      return;
    }
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    try {
      await api.deleteSession(session.id);
      onUpdate();
      onClose();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const handleAddExercises = async (exerciseIds: number[]) => {
    if (!session) return;
    for (const id of exerciseIds) {
      await api.addExerciseToSession(session.id, { exercise_id: id });
    }
    await loadSession(true);
    onUpdate();
  };

  const handleRemoveExercise = async (seId: number) => {
    if (!session) return;
    await api.removeExerciseFromSession(session.id, seId);
    await loadSession(true);
    onUpdate();
  };

  const handleSetUpdated = (seId: number, updatedSet: any) => {
    setSession((prev: any) => ({
      ...prev,
      exercises: prev.exercises.map((se: any) =>
        se.id === seId
          ? { ...se, sets: se.sets.map((s: any) => (s.id === updatedSet.id ? updatedSet : s)) }
          : se
      ),
    }));
  };

  const handleSetDeleted = async (seId: number, setId: number) => {
    if (!session) return;
    try {
      await api.deleteSessionSet(session.id, seId, setId);
      setSession((prev: any) => ({
        ...prev,
        exercises: prev.exercises.map((se: any) =>
          se.id === seId ? { ...se, sets: se.sets.filter((s: any) => s.id !== setId) } : se
        ),
      }));
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const handleAddSet = async (se: any) => {
    if (!session) return;
    const lastSet = se.sets[se.sets.length - 1];
    try {
      let newSet = await api.addSetToSessionExercise(session.id, se.id, {
        planned_reps: lastSet?.planned_reps || undefined,
        planned_weight: lastSet?.planned_weight
          ? parseFloat(String(lastSet.planned_weight))
          : undefined,
        is_warmup: false,
      });

      // Для DONE сесій — новий підхід одразу позначаємо виконаним
      if (isDone) {
        newSet = await api.updateSessionSet(session.id, se.id, newSet.id, {
          actual_reps: newSet.planned_reps,
          actual_weight: newSet.planned_weight,
          completed: true,
        });
      }

      setSession((prev: any) => ({
        ...prev,
        exercises: prev.exercises.map((s: any) =>
          s.id === se.id ? { ...s, sets: [...s.sets, newSet] } : s
        ),
      }));
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  // ─── Drag & Drop ──────────────────────────────────────

  const handleDragStart = (seId: number) => setDragSrcId(seId);
  const handleDragOver = (e: React.DragEvent, seId: number) => {
    e.preventDefault();
    if (seId !== dragSrcId) setDragOverId(seId);
  };
  const handleDrop = async (targetId: number) => {
    if (!session || dragSrcId === null || dragSrcId === targetId) {
      setDragSrcId(null);
      setDragOverId(null);
      return;
    }
    const exercises: any[] = [...session.exercises];
    const srcIdx = exercises.findIndex((se) => se.id === dragSrcId);
    const tgtIdx = exercises.findIndex((se) => se.id === targetId);
    const [moved] = exercises.splice(srcIdx, 1);
    exercises.splice(tgtIdx, 0, moved);
    const reordered = exercises.map((se, i) => ({ ...se, position: i + 1 }));
    setSession((prev: any) => ({ ...prev, exercises: reordered }));
    setDragSrcId(null);
    setDragOverId(null);
    try {
      await api.reorderSessionExercises(
        session.id,
        reordered.map((se) => ({ se_id: se.id, position: se.position }))
      );
      onUpdate();
    } catch (e) {
      console.error(e);
      loadSession(true);
    }
  };
  const handleDragEnd = () => {
    setDragSrcId(null);
    setDragOverId(null);
  };

  // ─── Render ───────────────────────────────────────────

  return (
    <>
      <FullscreenModal
        isOpen={isOpen}
        onClose={onClose}
        title={session?.title || '…'}
        zIndex={zIndex}
        headerCenter={
          session ? (
            <span
              className={`text-xs font-mono px-2 py-1 rounded-full border ${
                isActive
                  ? 'bg-amber-900/30 border-amber-700 text-amber-400 animate-pulse'
                  : isDone
                  ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-gray-400'
              }`}
            >
              {statusLabel}
            </span>
          ) : undefined
        }
      >
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && session && (
          <div className="p-4 space-y-3">
            {/* Опис сесії */}
            {session.description && (
              <div className="px-1">
                <p className="text-xs text-gray-500 leading-relaxed">{session.description}</p>
              </div>
            )}

            {/* Прогрес-бар — клік (відкриває покроковий режим) */}
            {isActive && totalSets > 0 && (
              <button
                ref={progressBarRef}
                onClick={() => setIsStepByStepOpen(true)}
                className={`w-full border rounded-2xl p-3 transition-all duration-500 group ${
                  showStepHint
                    ? 'border-blue-400 bg-blue-900/20 shadow-lg shadow-blue-500/20 animate-pulse'
                    : 'bg-slate-900 border-slate-700 hover:border-blue-600 hover:bg-blue-900/10'
                }`}
              >
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-blue-500 text-base">📋</span>
                    <span>Підходів виконано</span>
                    {showStepHint ? (
                      <span className="text-[10px] text-blue-400 font-bold ml-1">Натисніть для покрокового режиму!</span>
                    ) : (
                      <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition">→ покроковий режим</span>
                    )}
                  </span>
                  <span className="font-bold text-white">
                    {completedSets} / {totalSets}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%',
                    }}
                  />
                </div>
              </button>
            )}


            {/* Тривалість (DONE) */}
            {isDone && session.started_at && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-4">
                <span className="text-2xl">⏱</span>
                <div>
                  <p className="text-xs text-gray-400">Тривалість</p>
                  <p className="text-sm font-bold text-white">
                    {formatDuration(session.started_at, session.finished_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Підходів</p>
                  <p className="text-sm font-bold text-emerald-400">
                    {completedSets} / {totalSets}
                  </p>
                </div>
              </div>
            )}

            {/* Вправи */}
            {session.exercises?.length === 0 && (
              <div className="border border-dashed border-slate-700 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">💪</div>
                <p className="text-gray-500 text-sm">Вправ ще немає</p>
              </div>
            )}

            {session.exercises?.map((se: any) => (
              <SessionExerciseBlock
                key={se.id}
                se={se}
                sessionId={session.id}
                sessionStatus={session.status}
                onSetUpdated={(updatedSet) => handleSetUpdated(se.id, updatedSet)}
                onSetDeleted={(setId) => handleSetDeleted(se.id, setId)}
                onAddSet={() => handleAddSet(se)}
                onRemove={() => handleRemoveExercise(se.id)}
                onInfoOpen={(ex) => setInfoExercise(ex)}
                isDragging={dragSrcId === se.id}
                isDragOver={dragOverId === se.id}
                onDragStart={() => handleDragStart(se.id)}
                onDragOver={(e) => handleDragOver(e, se.id)}
                onDrop={() => handleDrop(se.id)}
                onDragEnd={handleDragEnd}
              />
            ))}

            {/* Додати вправу (завжди доступно) */}
            <button
              onClick={() => setIsExerciseSelectorOpen(true)}
              className="w-full py-3 rounded-2xl text-sm font-bold text-emerald-400 border border-dashed border-emerald-800 hover:bg-emerald-900/20 transition flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span> Додати вправу
            </button>

            {/* ─── Кнопки дій ─── */}
            <div className="space-y-2 pt-1">
              {/* Почати (PLANNED + date ≤ today) */}
              {canStart && (
                <button
                  onClick={handleStart}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-amber-600 hover:bg-amber-500 transition"
                >
                  ▶ Почати тренування
                </button>
              )}

              {/* Заплановано на майбутнє */}
              {isPlanned && !canStart && (
                <div className="w-full py-3 rounded-2xl text-center text-sm text-gray-500 border border-slate-800">
                  📅 Заплановано на{' '}
                  {new Date(session.planned_date + 'T00:00:00').toLocaleDateString('uk-UA', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
              )}

              {/* Покроковий режим — видалено, відкривається через прогрес-бар */}

              {/* Завершити (IN_PROGRESS) */}

              {isActive && (
                <button
                  onClick={handleFinish}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition ${
                    confirmFinish
                      ? 'bg-emerald-600 animate-pulse'
                      : 'bg-slate-800 border border-slate-700 text-emerald-400 hover:bg-emerald-900/20'
                  }`}
                >
                  {confirmFinish
                    ? '⚠️ Натисніть ще раз — завершити'
                    : '✓ Завершити тренування'}
                </button>
              )}

              {/* Продовжити (DONE → IN_PROGRESS) */}
              {canResume && (
                <button
                  onClick={handleResume}
                  className="w-full py-3 rounded-2xl font-bold text-sm bg-slate-800 border border-amber-800/50 text-amber-400 hover:bg-amber-900/20 transition"
                >
                  ↩ Продовжити тренування
                </button>
              )}

              {/* Видалити (завжди) */}
              <button
                onClick={handleDelete}
                className={`w-full py-2.5 rounded-2xl font-bold text-xs transition border ${
                  confirmDelete
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-transparent border-slate-700 text-gray-500 hover:border-red-900 hover:text-red-400'
                }`}
              >
                {confirmDelete ? '⚠️ Підтвердити видалення' : '🗑 Видалити тренування'}
              </button>
            </div>

            <div className="h-8" />
          </div>
        )}
      </FullscreenModal>

      {/* Вибір вправ */}
      <ExerciseSelectorModal
        isOpen={isExerciseSelectorOpen}
        onClose={() => setIsExerciseSelectorOpen(false)}
        onAddExercises={handleAddExercises}
        zIndex={zIndex + 50}
      />

      {/* Info вправи */}
      <ExerciseInfoModal
        isOpen={!!infoExercise}
        onClose={() => setInfoExercise(null)}
        exercise={infoExercise}
        zIndex={zIndex + 60}
      />

      {/* Покроковий режим */}
      {session && (
        <StepByStepModal
          isOpen={isStepByStepOpen}
          onClose={() => setIsStepByStepOpen(false)}
          session={session}
          onSetUpdated={(seId, updatedSet) => handleSetUpdated(seId, updatedSet)}
          zIndex={zIndex + 70}
        />
      )}
    </>
  );
};
