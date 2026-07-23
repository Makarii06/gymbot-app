import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { FullscreenModal } from './FullscreenModal';
import { PopupModal } from './PopupModal';
import { InlineSetsEditor } from './InlineSetsEditor';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';

interface ProgramDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: any | null;
  onUpdate?: () => void;
  zIndex?: number;
}

export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({
  isOpen,
  onClose,
  program,
  onUpdate,
  zIndex = 120,
}) => {
  const [programDays, setProgramDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Стан для додавання тренувального дня
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'gallery'>('new');
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newDayDesc, setNewDayDesc] = useState('');
  const [galleryDays, setGalleryDays] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Inline confirm видалення дня (через X на вкладці)
  const [confirmRemoveTabId, setConfirmRemoveTabId] = useState<number | null>(null);
  const confirmTabTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Управління вправами в тренуванні
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const dragSource = useRef<any>(null);
  const [draggingOverId, setDraggingOverId] = useState<number | null>(null);

  // ==========================================
  // ЗАГРУЗКА ДАНИХ
  // ==========================================

  const loadProgramDays = async (isBackground = false) => {
    if (!program) return;
    if (!isBackground) setLoading(true);
    try {
      const data = await api.getProgramDays(program.id);
      setProgramDays(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && program) {
      loadProgramDays();
      setActiveTabIdx(0);
    } else {
      setProgramDays([]);
    }
  }, [isOpen, program]);

  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const data = await api.getWorkoutDays();
      setGalleryDays(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGallery(false);
    }
  };

  // ==========================================
  // ТРЕНУВАЛЬНІ ДНІ
  // ==========================================

  const openAddDay = () => {
    setAddMode('new');
    setNewDayTitle('');
    setNewDayDesc('');
    setIsAddDayOpen(true);
  };

  const handleSwitchToGallery = () => {
    setAddMode('gallery');
    loadGallery();
  };

  const handleCreateNewDay = async () => {
    if (!newDayTitle.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await api.addNewDayToProgram(program.id, {
        title: newDayTitle.trim(),
        description: newDayDesc.trim() || undefined,
      });
      setIsAddDayOpen(false);
      await loadProgramDays(true);
      setActiveTabIdx(programDays.length);
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFromGallery = async (galleryDayId: number) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.addGalleryDayToProgram(program.id, galleryDayId);
      setIsAddDayOpen(false);
      await loadProgramDays(true);
      setActiveTabIdx(programDays.length);
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Видалення дня через X на вкладці
  const handleTabXClick = async (pdId: number) => {
    if (confirmRemoveTabId !== pdId) {
      if (confirmTabTimer.current) clearTimeout(confirmTabTimer.current);
      setConfirmRemoveTabId(pdId);
      confirmTabTimer.current = setTimeout(() => setConfirmRemoveTabId(null), 3000);
      return;
    }
    if (confirmTabTimer.current) clearTimeout(confirmTabTimer.current);
    setConfirmRemoveTabId(null);
    try {
      await api.removeDayFromProgram(program.id, pdId);
      await loadProgramDays(true);
      setActiveTabIdx(0);
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  // ==========================================
  // УПРАВЛІННЯ ВПРАВАМИ В ТРЕНУВАННІ
  // ==========================================

  const activeDay = programDays[activeTabIdx];
  const activeDayId = activeDay?.workout_day?.id;
  const exercises: any[] = activeDay?.workout_day?.exercises || [];

  const handleAddExercises = async (exerciseIds: number[]) => {
    if (!activeDayId) return;
    for (const exId of exerciseIds) {
      await api.addExerciseToDay(activeDayId, { exercise_id: exId });
    }
    await loadProgramDays(true);
    onUpdate?.();
  };

  const handleRemoveExercise = async (weId: number) => {
    if (!activeDayId) return;
    await api.removeExerciseFromDay(activeDayId, weId);
    await loadProgramDays(true);
    onUpdate?.();
  };

  // Drag-to-reorder вправ
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
    if (!dragSource.current || !activeDayId) return;
    if (dragSource.current.id === targetWe.id) return;

    const exList = [...exercises];
    const srcIdx = exList.findIndex((e: any) => e.id === dragSource.current.id);
    const tgtIdx = exList.findIndex((e: any) => e.id === targetWe.id);
    if (srcIdx === -1 || tgtIdx === -1) return;

    const [moved] = exList.splice(srcIdx, 1);
    exList.splice(tgtIdx, 0, moved);

    const order = exList.map((e: any, pos: number) => ({ we_id: e.id, position: pos + 1 }));
    dragSource.current = null;

    // Оновити локально
    const updatedProgramDays = programDays.map((pd, i) => {
      if (i !== activeTabIdx) return pd;
      return {
        ...pd,
        workout_day: { ...pd.workout_day, exercises: exList },
      };
    });
    setProgramDays(updatedProgramDays);

    try {
      await api.reorderExercisesInDay(activeDayId, order);
      onUpdate?.();
    } catch (err) {
      console.error(err);
      await loadProgramDays(true);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <FullscreenModal
        isOpen={isOpen}
        onClose={onClose}
        title={program?.title || 'Програма'}
        zIndex={zIndex}
      >
        {/* ===== ВКЛАДКИ ТРЕНУВАНЬ ===== */}
        <div className="border-b border-slate-800 bg-slate-950">
          <div
            ref={tabScrollRef}
            className="flex overflow-x-auto scrollbar-none px-4 pt-2 pb-0 gap-1"
          >
            {programDays.map((pd, idx) => {
              const isActive = activeTabIdx === idx;
              const isConfirm = confirmRemoveTabId === pd.id;

              return (
                <div
                  key={pd.id}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-t-xl text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                    isActive
                      ? isConfirm
                        ? 'bg-red-900/30 border-red-500 text-red-400'
                        : 'bg-slate-800 border-blue-500 text-white'
                      : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <button onClick={() => setActiveTabIdx(idx)}>
                    {pd.workout_day?.title || `День ${idx + 1}`}
                  </button>
                  {/* X з'являється тільки на активній вкладці */}
                  {isActive && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTabXClick(pd.id); }}
                      className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] transition ${
                        isConfirm
                          ? 'bg-red-500 text-white'
                          : 'text-gray-500 hover:text-red-400 hover:bg-red-900/20'
                      }`}
                      title={isConfirm ? 'Ще раз — видалити' : 'Видалити тренування'}
                    >
                      {isConfirm ? '!' : '×'}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Кнопка додавання */}
            <button
              onClick={openAddDay}
              className="flex-shrink-0 px-3 py-2 rounded-t-xl text-xs font-bold whitespace-nowrap border-b-2 border-transparent text-emerald-400 hover:bg-slate-800 transition"
            >
              + Тренування
            </button>
          </div>
        </div>

        {/* ===== КОНТЕНТ АКТИВНОГО ДНЯ ===== */}
        <div className="p-4 space-y-3 pb-4">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && programDays.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-400 font-semibold mb-1">Тренувань ще немає</p>
              <button
                onClick={openAddDay}
                className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-sm font-bold transition"
              >
                + Додати тренування
              </button>
            </div>
          )}

          {!loading && activeDay && (
            <>
              {/* Опис дня */}
              {activeDay.workout_day?.description && (
                <p className="text-sm text-gray-400 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  {activeDay.workout_day.description}
                </p>
              )}

              {/* Підказка підтвердження видалення вкладки */}
              {confirmRemoveTabId === activeDay.id && (
                <div className="bg-red-900/20 border border-red-800 rounded-2xl p-3 text-center text-xs text-red-400">
                  ⚠️ Натисніть × ще раз щоб видалити тренування
                </div>
              )}

              {/* Вправи */}
              {exercises.length === 0 ? (
                <div className="border border-dashed border-slate-700 rounded-2xl p-6 text-center">
                  <p className="text-gray-600 text-sm">Вправ немає в цьому тренуванні</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exercises.map((we: any) => (
                    <div key={we.id}>
                      <InlineSetsEditor
                        workoutExercise={we}
                        dayId={activeDayId}
                        onUpdate={() => loadProgramDays(true)}
                        readOnly={false}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDraggingOver={draggingOverId === we.id}
                      />
                      {/* Видалити вправу */}
                      <div className="flex justify-end mt-1">
                        <RemoveExerciseButton onRemove={() => handleRemoveExercise(we.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Кнопка "Додати вправу" */}
              <button
                onClick={() => setIsExerciseSelectorOpen(true)}
                className="w-full py-3 rounded-2xl text-sm font-bold text-emerald-400 border border-dashed border-emerald-800 hover:bg-emerald-900/20 transition flex items-center justify-center gap-2"
              >
                <span className="text-lg">+</span>
                Додати вправу
              </button>
            </>
          )}
        </div>
      </FullscreenModal>

      {/* ===== Popup: додавання тренування ===== */}
      <PopupModal
        isOpen={isAddDayOpen}
        onClose={() => setIsAddDayOpen(false)}
        title="Додати тренування"
        zIndex={zIndex + 50}
      >
        <div className="space-y-4">
          <div className="flex bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setAddMode('new')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                addMode === 'new' ? 'bg-slate-700 text-white' : 'text-gray-500'
              }`}
            >
              ✨ Нове
            </button>
            <button
              onClick={handleSwitchToGallery}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                addMode === 'gallery' ? 'bg-slate-700 text-white' : 'text-gray-500'
              }`}
            >
              📚 З галереї
            </button>
          </div>

          {addMode === 'new' && (
            <>
              <input
                type="text"
                value={newDayTitle}
                onChange={(e) => setNewDayTitle(e.target.value)}
                placeholder="Назва тренування..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
              <textarea
                value={newDayDesc}
                onChange={(e) => setNewDayDesc(e.target.value)}
                placeholder="Опис (необов'язково)..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
              />
              <button
                onClick={handleCreateNewDay}
                disabled={!newDayTitle.trim() || isSaving}
                className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-gray-500 transition"
              >
                {isSaving ? '⏳ Створення...' : '+ Створити тренування'}
              </button>
            </>
          )}

          {addMode === 'gallery' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {loadingGallery && (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loadingGallery && galleryDays.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">У галереї немає тренувань</p>
              )}
              {!loadingGallery && galleryDays.map((day: any) => (
                <button
                  key={day.id}
                  onClick={() => handleAddFromGallery(day.id)}
                  disabled={isSaving}
                  className="w-full flex items-center p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-left transition disabled:opacity-50"
                >
                  <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center text-base mr-3">📋</div>
                  <div>
                    <p className="text-sm font-semibold text-white">{day.title}</p>
                    {day.description && (
                      <p className="text-xs text-gray-500 truncate">{day.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopupModal>

      {/* ===== Вибір вправ для додавання ===== */}
      <ExerciseSelectorModal
        isOpen={isExerciseSelectorOpen}
        onClose={() => setIsExerciseSelectorOpen(false)}
        onAddExercises={handleAddExercises}
        zIndex={zIndex + 60}
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
