import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { FullscreenModal } from './FullscreenModal';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';
import { InlineSetsEditor } from './InlineSetsEditor';

interface WorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutDay: any | null;
  onUpdate?: () => void;
  zIndex?: number;
  readOnly?: boolean; // в програмі — тільки перегляд метаданих, підходи редагуються
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  isOpen,
  onClose,
  workoutDay,
  onUpdate,
  zIndex = 150,
  readOnly = false,
}) => {
  const [dayDetail, setDayDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Drag-to-reorder state
  const dragSource = useRef<any>(null);
  const [draggingOverId, setDraggingOverId] = useState<number | null>(null);

  const loadDetail = async (isBackground = false) => {
    if (!workoutDay) return;
    if (!isBackground) setLoading(true);
    try {
      const data = await api.getWorkoutDay(workoutDay.id);
      setDayDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workoutDay) {
      loadDetail();
    } else {
      setDayDetail(null);
    }
  }, [isOpen, workoutDay]);

  const handleAddExercises = async (exerciseIds: number[]) => {
    if (!dayDetail) return;
    for (const exId of exerciseIds) {
      await api.addExerciseToDay(dayDetail.id, { exercise_id: exId });
    }
    await loadDetail(true);
    onUpdate?.();
  };

  const handleRemoveExercise = async (weId: number) => {
    if (!dayDetail) return;
    await api.removeExerciseFromDay(dayDetail.id, weId);
    await loadDetail(true);
    onUpdate?.();
  };

  // ==========================================
  // DRAG-TO-REORDER
  // ==========================================

  const handleDragStart = (we: any, e: React.DragEvent) => {
    dragSource.current = we;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (we: any, _e: React.DragEvent) => {
    if (dragSource.current && dragSource.current.id !== we.id) {
      setDraggingOverId(we.id);
    }
  };

  const handleDrop = async (targetWe: any) => {
    setDraggingOverId(null);
    if (!dragSource.current || !dayDetail) return;
    if (dragSource.current.id === targetWe.id) return;

    const exercises = [...(dayDetail.exercises || [])];
    const srcIdx = exercises.findIndex((e: any) => e.id === dragSource.current.id);
    const tgtIdx = exercises.findIndex((e: any) => e.id === targetWe.id);
    if (srcIdx === -1 || tgtIdx === -1) return;

    // Переставляємо локально
    const [moved] = exercises.splice(srcIdx, 1);
    exercises.splice(tgtIdx, 0, moved);

    // Будуємо новий порядок
    const order = exercises.map((e: any, pos: number) => ({
      we_id: e.id,
      position: pos + 1,
    }));

    // Оновлюємо локально одразу
    setDayDetail({ ...dayDetail, exercises });
    dragSource.current = null;

    try {
      await api.reorderExercisesInDay(dayDetail.id, order);
      onUpdate?.();
    } catch (err) {
      console.error(err);
      await loadDetail(true); // відкатуємо при помилці
    }
  };

  const exercises: any[] = dayDetail?.exercises || [];

  return (
    <>
      <FullscreenModal
        isOpen={isOpen}
        onClose={onClose}
        title={workoutDay?.title || 'Тренування'}
        zIndex={zIndex}
      >
        <div className="p-4 space-y-3">
          {/* Опис */}
          {dayDetail?.description && (
            <p className="text-sm text-gray-400 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              {dayDetail.description}
            </p>
          )}

          {/* Завантаження */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!loading && exercises.length === 0 && (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="text-5xl mb-4">🏋️‍♂️</div>
              <p className="text-gray-400 font-semibold mb-1">Вправ ще немає</p>
              <p className="text-gray-600 text-sm">Додайте вправи нижче</p>
            </div>
          )}

          {/* Список вправ з InlineSetsEditor */}
          {!loading && exercises.map((we: any) => (
            <div key={we.id}>
              <InlineSetsEditor
                workoutExercise={we}
                dayId={dayDetail?.id}
                onUpdate={() => loadDetail(true)}
                readOnly={readOnly}
                onDragStart={readOnly ? undefined : handleDragStart}
                onDragOver={readOnly ? undefined : handleDragOver}
                onDrop={readOnly ? undefined : handleDrop}
                isDraggingOver={draggingOverId === we.id}
              />
              {/* Кнопка видалення вправи */}
              {!readOnly && (
                <div className="flex justify-end mt-1">
                  <RemoveExerciseButton onRemove={() => handleRemoveExercise(we.id)} />
                </div>
              )}
            </div>
          ))}

          {/* Кнопка "Додати вправу" — після всіх вправ */}
          {!readOnly && (
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="w-full py-3 rounded-2xl text-sm font-bold text-emerald-400 border border-dashed border-emerald-800 hover:bg-emerald-900/20 transition flex items-center justify-center gap-2 mt-2"
            >
              <span className="text-lg">+</span>
              Додати вправу
            </button>
          )}
        </div>
      </FullscreenModal>

      {/* Селектор вправ */}
      <ExerciseSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onAddExercises={handleAddExercises}
        zIndex={zIndex + 50}
      />
    </>
  );
};

// Inline підтвердження для видалення вправи
const RemoveExerciseButton: React.FC<{ onRemove: () => void }> = ({ onRemove }) => {
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (!confirm) {
      setConfirm(true);
      timer.current = setTimeout(() => setConfirm(false), 3000);
    } else {
      if (timer.current) clearTimeout(timer.current);
      onRemove();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`text-xs px-3 py-1 rounded-lg transition ${
        confirm
          ? 'bg-red-600/20 text-red-400 border border-red-800'
          : 'text-gray-600 hover:text-red-400'
      }`}
    >
      {confirm ? '⚠️ Підтвердити видалення' : 'Видалити вправу'}
    </button>
  );
};
