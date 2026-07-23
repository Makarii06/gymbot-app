import React, { useState, useRef, useCallback } from 'react';
import { api } from '../../api';
import { ExerciseInfoModal } from './ExerciseInfoModal';

interface InlineSetsEditorProps {
  workoutExercise: any;         // {id, position, note, exercise, sets}
  dayId: number;
  onUpdate: () => void;         // перезавантажити день після змін
  readOnly?: boolean;           // в програмі — можна редагувати підходи (дані однакові)
  onDragStart?: (we: any, e: React.DragEvent) => void;
  onDragOver?: (we: any, e: React.DragEvent) => void;
  onDrop?: (we: any) => void;
  isDraggingOver?: boolean;
}

interface PhantomSet {
  target_reps: string;
  target_weight: string;
  is_warmup: boolean;
}

const EMPTY_PHANTOM: PhantomSet = { target_reps: '', target_weight: '', is_warmup: false };

export const InlineSetsEditor: React.FC<InlineSetsEditorProps> = ({
  workoutExercise,
  dayId,
  onUpdate,
  readOnly = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDraggingOver = false,
}) => {
  const sets: any[] = workoutExercise.sets || [];
  const exercise = workoutExercise.exercise;

  const [phantom, setPhantom] = useState<PhantomSet>(EMPTY_PHANTOM);
  const [savingPhantom, setSavingPhantom] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  // Inline confirm per set delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Media — перша картинка для preview
  const firstImage = (exercise?.media || []).find((m: any) => m.media_type === 'image');

  // ==========================================
  // SET OPERATIONS
  // ==========================================

  const handleSetBlur = useCallback(async (setId: number, field: string, rawValue: string) => {
    const value = rawValue === '' ? null : field === 'target_weight' ? parseFloat(rawValue) : parseInt(rawValue);
    try {
      await api.updateSet(setId, { [field]: value });
      onUpdate();
    } catch (e: any) {
      console.error(`updateSet error: ${e.message}`);
    }
  }, [onUpdate]);

  const handleWarmupToggle = async (setId: number, current: boolean) => {
    try {
      await api.updateSet(setId, { is_warmup: !current });
      onUpdate();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteSet = async (setId: number) => {
    if (confirmDeleteId !== setId) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmDeleteId(setId);
      confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmDeleteId(null);
    try {
      await api.deleteSet(setId);
      onUpdate();
    } catch (e: any) {
      console.error(e);
    }
  };

  // ==========================================
  // PHANTOM ROW (новий підхід)
  // ==========================================

  const savePhantomIfNeeded = async (updatedPhantom: PhantomSet) => {
    const hasReps = updatedPhantom.target_reps !== '';
    const hasWeight = updatedPhantom.target_weight !== '';
    if (!hasReps && !hasWeight) return;
    if (savingPhantom) return;

    setSavingPhantom(true);
    try {
      await api.addSetToExercise(workoutExercise.id, {
        position: sets.length + 1,
        target_reps: hasReps ? parseInt(updatedPhantom.target_reps) : null,
        target_weight: hasWeight ? parseFloat(updatedPhantom.target_weight) : null,
        is_warmup: updatedPhantom.is_warmup,
      });
      setPhantom(EMPTY_PHANTOM);
      onUpdate();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSavingPhantom(false);
    }
  };

  const handlePhantomBlur = async (field: keyof PhantomSet, value: string | boolean) => {
    const updated = { ...phantom, [field]: value };
    setPhantom(updated);
    await savePhantomIfNeeded(updated);
  };

  // ==========================================
  // NOTE
  // ==========================================
  const [localNote, setLocalNote] = useState(workoutExercise.note || '');

  const handleNoteBlur = async () => {
    try {
      await api.updateExerciseNote(dayId, workoutExercise.id, localNote || null);
    } catch (e) {
      console.error(e);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <div
        className={`bg-slate-900 border rounded-2xl overflow-hidden transition ${
          isDraggingOver ? 'border-blue-500/60 bg-blue-500/5' : 'border-slate-800'
        }`}
        draggable={!readOnly}
        onDragStart={onDragStart ? (e) => onDragStart(workoutExercise, e) : undefined}
        onDragOver={onDragOver ? (e) => { e.preventDefault(); onDragOver(workoutExercise, e); } : undefined}
        onDrop={onDrop ? () => onDrop(workoutExercise) : undefined}
      >
        {/* ====== ЗАГОЛОВОК ВПРАВИ ====== */}
        <div
          className="flex items-center p-3 cursor-pointer hover:bg-slate-800/60 transition active:bg-slate-800"
          onClick={() => setInfoOpen(true)}
        >
          {/* Медіа preview / іконка */}
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 mr-3 bg-slate-800 flex items-center justify-center">
            {firstImage ? (
              <img src={firstImage.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">💪</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {exercise?.name || `Вправа #${workoutExercise.exercise_id}`}
            </p>
            {exercise?.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{exercise.description}</p>
            )}
            {/* Теги */}
            {exercise?.tags && exercise.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {exercise.tags.slice(0, 3).map((tag: any) => (
                  <span key={tag.id} className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/15">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Drag handle */}
          {!readOnly && (
            <div className="ml-2 text-gray-700 flex-shrink-0 cursor-grab active:cursor-grabbing px-1">
              ⠿
            </div>
          )}
        </div>

        {/* ====== НОТАТКА ====== */}
        {!readOnly && (
          <div className="px-3 pb-2">
            <input
              type="text"
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder="Нотатка до вправи..."
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:border-slate-600 transition"
            />
          </div>
        )}
        {readOnly && workoutExercise.note && (
          <p className="px-3 pb-2 text-xs text-gray-500 italic">{workoutExercise.note}</p>
        )}

        {/* ====== ПІДХОДИ ====== */}
        <div className="px-3 pb-3 space-y-1.5">
          {/* Заголовки */}
          {sets.length > 0 && (
            <div className="grid grid-cols-12 gap-1 px-1 mb-1">
              <span className="col-span-1 text-[9px] font-bold text-gray-600 uppercase">#</span>
              <span className="col-span-4 text-[9px] font-bold text-gray-600 uppercase text-center">Повт.</span>
              <span className="col-span-4 text-[9px] font-bold text-gray-600 uppercase text-center">Вага кг</span>
              <span className="col-span-2 text-[9px] font-bold text-gray-600 uppercase text-center">🔥</span>
              <span className="col-span-1"></span>
            </div>
          )}

          {/* Реальні підходи */}
          {sets.map((set, idx) => (
            <div
              key={set.id}
              className={`grid grid-cols-12 gap-1 items-center rounded-xl px-1 py-1 ${
                set.is_warmup ? 'bg-amber-500/10' : 'bg-slate-800/50'
              }`}
            >
              <span className="col-span-1 text-xs font-bold text-gray-600">{idx + 1}</span>

              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="numeric"
                  defaultValue={set.target_reps ?? ''}
                  onBlur={(e) => handleSetBlur(set.id, 'target_reps', e.target.value)}
                  placeholder="—"
                  disabled={readOnly}
                  className="w-full px-2 py-1.5 bg-slate-700 rounded-lg text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:text-gray-400"
                />
              </div>

              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  defaultValue={set.target_weight ?? ''}
                  onBlur={(e) => handleSetBlur(set.id, 'target_weight', e.target.value)}
                  placeholder="—"
                  disabled={readOnly}
                  className="w-full px-2 py-1.5 bg-slate-700 rounded-lg text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:text-gray-400"
                />
              </div>

              <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => !readOnly && handleWarmupToggle(set.id, set.is_warmup)}
                  disabled={readOnly}
                  className={`w-7 h-7 rounded-lg text-sm transition ${
                    set.is_warmup
                      ? 'bg-amber-500/30 text-amber-400'
                      : 'bg-slate-700 text-gray-600 hover:text-amber-400'
                  } disabled:cursor-default`}
                >
                  🔥
                </button>
              </div>

              <div className="col-span-1 flex justify-center">
                {!readOnly && (
                  <button
                    onClick={() => handleDeleteSet(set.id)}
                    className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition ${
                      confirmDeleteId === set.id
                        ? 'bg-red-600/30 text-red-400'
                        : 'text-gray-600 hover:text-red-400'
                    }`}
                    title={confirmDeleteId === set.id ? 'Підтвердити' : 'Видалити'}
                  >
                    {confirmDeleteId === set.id ? '✓' : '×'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Phantom row — новий підхід */}
          {!readOnly && (
            <div className="grid grid-cols-12 gap-1 items-center rounded-xl px-1 py-1 border border-dashed border-slate-700">
              <span className="col-span-1 text-xs font-bold text-gray-700">{sets.length + 1}</span>

              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="numeric"
                  value={phantom.target_reps}
                  onChange={(e) => setPhantom((p) => ({ ...p, target_reps: e.target.value }))}
                  onBlur={(e) => handlePhantomBlur('target_reps', e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1.5 bg-slate-800 rounded-lg text-center text-sm text-gray-400 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:text-white"
                />
              </div>

              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={phantom.target_weight}
                  onChange={(e) => setPhantom((p) => ({ ...p, target_weight: e.target.value }))}
                  onBlur={(e) => handlePhantomBlur('target_weight', e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1.5 bg-slate-800 rounded-lg text-center text-sm text-gray-400 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:text-white"
                />
              </div>

              <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => setPhantom((p) => ({ ...p, is_warmup: !p.is_warmup }))}
                  className={`w-7 h-7 rounded-lg text-sm transition ${
                    phantom.is_warmup
                      ? 'bg-amber-500/30 text-amber-400'
                      : 'bg-slate-800 text-gray-700 hover:text-amber-400'
                  }`}
                >
                  🔥
                </button>
              </div>

              <div className="col-span-1">
                {savingPhantom && (
                  <div className="w-4 h-4 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {sets.length === 0 && readOnly && (
            <p className="text-xs text-gray-600 text-center py-1">Підходи не задані</p>
          )}
        </div>
      </div>

      {/* Read-only інфо про вправу */}
      <ExerciseInfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        exercise={exercise}
        zIndex={450}
      />
    </>
  );
};
