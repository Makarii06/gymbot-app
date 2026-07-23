import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { FullscreenModal } from './FullscreenModal';
import { ExerciseFormModal } from './ExerciseFormModal';
import { ExerciseInfoModal } from './ExerciseInfoModal';
import { TagPickerModal } from './TagPickerModal';

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercises: (exerciseIds: number[]) => Promise<void>;
  zIndex?: number;
}

export const ExerciseSelectorModal: React.FC<ExerciseSelectorModalProps> = ({
  isOpen,
  onClose,
  onAddExercises,
  zIndex = 200,
}) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Форма вправи (редагування)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<any | null>(null);

  // Info modal (перегляд вправи)
  const [infoExercise, setInfoExercise] = useState<any | null>(null);

  // Tag filter picker
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);

  const loadExercises = async () => {
    try {
      const data = await api.getExercises();
      setExercises(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExercises();
      setSelectedIds([]);
      setSearch('');
      setFilterTag(null);
    }
  }, [isOpen]);

  const filtered = exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || (ex.tags || []).some((t: any) => t.id === filterTag.id);
    return matchSearch && matchTag;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0 || isAdding) return;
    setIsAdding(true);
    try {
      await onAddExercises(selectedIds);
      onClose();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <FullscreenModal
        isOpen={isOpen}
        onClose={onClose}
        title="🎯 Виберіть вправи"
        zIndex={zIndex}
      >
        <div className="p-4 space-y-3 pb-32">
          {/* Пошук + фільтр */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Пошук вправи..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-slate-700 transition"
              />
            </div>
            <button
              onClick={() => setIsTagFilterOpen(true)}
              className={`px-3 py-2.5 rounded-2xl border text-sm transition ${
                filterTag
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              🏷
            </button>
          </div>

          {/* Скидання фільтру */}
          {filterTag && (
            <button
              onClick={() => setFilterTag(null)}
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              ✕ Фільтр: {filterTag.name}
            </button>
          )}

          {/* Список вправ */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="text-5xl mb-4">💪</div>
              <p className="text-gray-400 font-semibold">
                {search || filterTag ? 'Нічого не знайдено' : 'Вправ ще немає'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((ex) => {
                const isChecked = selectedIds.includes(ex.id);
                const firstImg = (ex.media || []).find((m: any) => m.media_type === 'image');

                return (
                  <div
                    key={ex.id}
                    className={`flex items-center p-3 rounded-2xl border transition ${
                      isChecked
                        ? 'bg-blue-500/8 border-blue-500/40'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Фото / Емодзі — клік відкриває Info */}
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 mr-3 bg-slate-800 flex items-center justify-center cursor-pointer"
                      onClick={() => setInfoExercise(ex)}
                    >
                      {firstImg ? (
                        <img src={firstImg.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">💪</span>
                      )}
                    </div>

                    {/* Текст — клік відкриває Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setInfoExercise(ex)}
                    >
                      <p className="text-sm font-bold text-white truncate">{ex.name}</p>
                      {ex.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{ex.description}</p>
                      )}
                      {ex.tags && ex.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {ex.tags.slice(0, 3).map((tag: any) => (
                            <span
                              key={tag.id}
                              className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded-full"
                            >
                              {tag.name}
                            </span>
                          ))}
                          {ex.tags.length > 3 && (
                            <span className="text-[10px] text-gray-500">+{ex.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Правий блок: кнопки */}
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {/* Редагування */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExerciseToEdit(ex); setIsFormOpen(true); }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-amber-500/20 text-gray-500 hover:text-amber-400 transition text-sm"
                      >
                        ✏️
                      </button>

                      {/* Чекбокс */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(ex.id); }}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition flex-shrink-0 ${
                          isChecked
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-slate-600 hover:border-blue-400'
                        }`}
                      >
                        {isChecked && <span className="text-xs font-bold">✓</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FullscreenModal>

      {/* FAB: Нова вправа */}
      {isOpen && (
        <button
          onClick={() => { setExerciseToEdit(null); setIsFormOpen(true); }}
          className="fixed z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 flex items-center justify-center text-xl font-light transition"
          style={{ bottom: selectedIds.length > 0 ? '88px' : '24px', right: '16px', zIndex: zIndex + 2 }}
          aria-label="Нова вправа"
        >
          +
        </button>
      )}

      {/* Кнопка "Додати виділені" */}
      {isOpen && selectedIds.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800"
          style={{ zIndex: zIndex + 1 }}
        >
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-gray-500 transition"
          >
            {isAdding ? '⏳ Додавання...' : `✓ Додати виділені (${selectedIds.length})`}
          </button>
        </div>
      )}

      {/* Тег-фільтр */}
      <TagPickerModal
        isOpen={isTagFilterOpen}
        onClose={() => setIsTagFilterOpen(false)}
        selectedTagIds={filterTag ? [filterTag.id] : []}
        onConfirm={(tags) => setFilterTag(tags[0] || null)}
        zIndex={zIndex + 10}
      />

      {/* Перегляд вправи з кнопкою "Виділити" */}
      <ExerciseInfoModal
        isOpen={!!infoExercise}
        onClose={() => setInfoExercise(null)}
        exercise={infoExercise}
        zIndex={zIndex + 20}
        onToggleSelect={infoExercise ? () => {
          toggleSelect(infoExercise.id);
        } : undefined}
        isSelected={infoExercise ? selectedIds.includes(infoExercise.id) : false}
      />

      {/* Форма вправи */}
      <ExerciseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        exerciseToEdit={exerciseToEdit}
        onSave={() => { loadExercises(); setIsFormOpen(false); }}
        zIndex={zIndex + 50}
      />
    </>
  );
};
