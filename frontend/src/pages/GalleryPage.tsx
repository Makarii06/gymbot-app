import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { PopupModal } from '../components/modals/PopupModal';
import { ExerciseFormModal } from '../components/modals/ExerciseFormModal';
import { WorkoutDetailModal } from '../components/modals/WorkoutDetailModal';
import { ProgramDetailModal } from '../components/modals/ProgramDetailModal';
import { TagPickerModal } from '../components/modals/TagPickerModal';

type SubTab = 'exercises' | 'workouts' | 'programs';

export const GalleryPage: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('exercises');

  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutDays, setWorkoutDays] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Пошук + фільтр
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<any | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Вправи
  const [isExerciseFormOpen, setIsExerciseFormOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<any | null>(null);

  // Тренування
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState(false);
  const [newWorkoutTitle, setNewWorkoutTitle] = useState('');
  const [newWorkoutDesc, setNewWorkoutDesc] = useState('');
  const [activeWorkoutDay, setActiveWorkoutDay] = useState<any | null>(null);

  // Програми
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [activeProgram, setActiveProgram] = useState<any | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'exercises') {
        const data = await api.getExercises();
        setExercises(data);
      } else if (subTab === 'workouts') {
        const data = await api.getWorkoutDays();
        setWorkoutDays(data);
      } else if (subTab === 'programs') {
        const data = await api.getPrograms();
        setPrograms(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSearch('');
    setFilterTag(null);
  }, [subTab]);

  // ============ Фільтрація вправ ============
  const filteredExercises = exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || (ex.tags || []).some((t: any) => t.id === filterTag.id);
    return matchSearch && matchTag;
  });

  const filteredWorkouts = workoutDays.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPrograms = programs.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  // ============ Дії ============

  // FAB
  const handleFab = () => {
    if (subTab === 'exercises') {
      setExerciseToEdit(null);
      setIsExerciseFormOpen(true);
    } else if (subTab === 'workouts') {
      setIsCreateWorkoutOpen(true);
    } else {
      setIsCreateProgramOpen(true);
    }
  };

  const handleDeleteWorkout = async (id: number) => {
    try {
      await api.deleteWorkoutDay(id);
      loadData();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const handleDeleteProgram = async (id: number) => {
    try {
      await api.deleteProgram(id);
      loadData();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const handleCreateWorkout = async () => {
    if (!newWorkoutTitle.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await api.createWorkoutDay({
        title: newWorkoutTitle.trim(),
        description: newWorkoutDesc.trim() || null,
        is_public: false,
        is_template: true,
      });
      setNewWorkoutTitle('');
      setNewWorkoutDesc('');
      setIsCreateWorkoutOpen(false);
      loadData();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!newProgramTitle.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await api.createProgram({
        title: newProgramTitle.trim(),
        description: newProgramDesc.trim() || null,
        visibility: 'PRIVATE',
      });
      setNewProgramTitle('');
      setNewProgramDesc('');
      setIsCreateProgramOpen(false);
      loadData();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ============ Render ============
  const tabConfig = [
    { key: 'exercises', label: '🏋️ Вправи' },
    { key: 'workouts', label: '📋 Тренування' },
    { key: 'programs', label: '📅 Програми' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-28">
      {/* Вкладки */}
      <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 px-4 pt-3 pb-0">
        <div className="flex gap-1">
          {tabConfig.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`flex-1 py-2.5 px-2 rounded-t-xl text-[11px] font-bold tracking-wide transition border-b-2 ${
                subTab === key
                  ? 'text-white border-blue-500 bg-slate-900'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Пошук + фільтр тегів (тільки для вправ) */}
      <div className="px-4 pt-3 pb-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder={`Пошук ${subTab === 'exercises' ? 'вправ' : subTab === 'workouts' ? 'тренувань' : 'програм'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-slate-700 transition"
            />
          </div>
          {subTab === 'exercises' && (
            <button
              onClick={() => setIsFilterOpen(true)}
              className={`px-3 py-2.5 rounded-2xl border text-sm transition ${
                filterTag
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-gray-500 hover:text-gray-300'
              }`}
              title="Фільтр за тегом"
            >
              🏷
              {filterTag && <span className="ml-1 text-xs">{filterTag.name}</span>}
            </button>
          )}
        </div>
        {filterTag && (
          <button
            onClick={() => setFilterTag(null)}
            className="text-xs text-gray-500 mt-1.5 hover:text-gray-300 flex items-center gap-1"
          >
            ✕ Скинути фільтр: {filterTag.name}
          </button>
        )}
      </div>

      {/* Контент */}
      <div className="px-4 pt-3 space-y-2">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ======= ВПРАВИ ======= */}
        {!loading && subTab === 'exercises' && (
          <>
            {filteredExercises.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-5xl mb-4">💪</div>
                <p className="text-gray-400 font-semibold">
                  {search || filterTag ? 'Нічого не знайдено' : 'Вправ ще немає'}
                </p>
              </div>
            )}
            {filteredExercises.map((ex) => {
              const firstImg = (ex.media || []).find((m: any) => m.media_type === 'image');
              return (
                <div
                  key={ex.id}
                  className="flex items-center p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition cursor-pointer active:bg-slate-800"
                  onClick={() => { setExerciseToEdit(ex); setIsExerciseFormOpen(true); }}
                >
                  {/* Фото або емодзі */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 mr-3 bg-slate-800 flex items-center justify-center">
                    {firstImg ? (
                      <img src={firstImg.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">💪</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{ex.name}</p>
                    {ex.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{ex.description}</p>
                    )}
                    {/* Теги */}
                    {ex.tags && ex.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {ex.tags.slice(0, 4).map((tag: any) => (
                          <span
                            key={tag.id}
                            className="text-[10px] px-2 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {ex.tags.length > 4 && (
                          <span className="text-[10px] px-2 py-0.5 text-gray-500">
                            +{ex.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                    {/* М'язи */}
                    {ex.muscles && ex.muscles.length > 0 && (
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {ex.muscles.slice(0, 3).map((m: any) => (
                          <span
                            key={m.id}
                            className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full"
                          >
                            {m.muscle_group?.name || '—'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-gray-600 text-sm ml-2 flex-shrink-0">›</span>
                </div>
              );
            })}
          </>
        )}

        {/* ======= ТРЕНУВАННЯ ======= */}
        {!loading && subTab === 'workouts' && (
          <>
            {filteredWorkouts.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-400 font-semibold">
                  {search ? 'Нічого не знайдено' : 'Тренувань ще немає'}
                </p>
              </div>
            )}
            {filteredWorkouts.map((day) => (
              <div
                key={day.id}
                className="flex items-center p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition cursor-pointer"
                onClick={() => setActiveWorkoutDay(day)}
              >
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 mr-3">
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-400 truncate">{day.title}</p>
                  {day.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{day.description}</p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {new Date(day.created_at).toLocaleDateString('uk-UA')}
                  </p>
                </div>
                <div className="flex gap-1.5 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DeleteButton onDelete={() => handleDeleteWorkout(day.id)} />
                </div>
                <span className="text-gray-600 text-sm ml-2">›</span>
              </div>
            ))}
          </>
        )}

        {/* ======= ПРОГРАМИ ======= */}
        {!loading && subTab === 'programs' && (
          <>
            {filteredPrograms.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-400 font-semibold">
                  {search ? 'Нічого не знайдено' : 'Програм ще немає'}
                </p>
              </div>
            )}
            {filteredPrograms.map((prog) => (
              <div
                key={prog.id}
                className="flex items-center p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition cursor-pointer"
                onClick={() => setActiveProgram(prog)}
              >
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 mr-3">
                  📅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-purple-400 truncate">{prog.title}</p>
                  {prog.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{prog.description}</p>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    prog.visibility === 'PRIVATE'
                      ? 'text-gray-500'
                      : 'text-emerald-400'
                  }`}>
                    {prog.visibility === 'PRIVATE' ? '🔒 Приватна' : '🌐 Публічна'}
                  </span>
                </div>
                <div className="flex gap-1.5 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DeleteButton onDelete={() => handleDeleteProgram(prog.id)} />
                </div>
                <span className="text-gray-600 text-sm ml-2">›</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ======= FAB Кнопка ======= */}
      <button
        onClick={handleFab}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 flex items-center justify-center text-2xl font-light transition"
        aria-label="Додати"
      >
        +
      </button>

      {/* ======= МОДАЛКИ ======= */}

      {/* Форма вправи — відкривається при кліку на вправу або FAB */}
      <ExerciseFormModal
        isOpen={isExerciseFormOpen}
        onClose={() => setIsExerciseFormOpen(false)}
        exerciseToEdit={exerciseToEdit}
        onSave={() => { loadData(); setIsExerciseFormOpen(false); }}
        onDelete={() => { loadData(); setIsExerciseFormOpen(false); }}
      />

      {/* Фільтр тегів */}
      <TagPickerModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedTagIds={filterTag ? [filterTag.id] : []}
        onConfirm={(tags) => setFilterTag(tags[0] || null)}
        zIndex={200}
      />

      {/* Popup створення тренування */}
      <PopupModal
        isOpen={isCreateWorkoutOpen}
        onClose={() => setIsCreateWorkoutOpen(false)}
        title="📋 Нове тренування"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={newWorkoutTitle}
            onChange={(e) => setNewWorkoutTitle(e.target.value)}
            placeholder="Назва тренування..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
          <textarea
            value={newWorkoutDesc}
            onChange={(e) => setNewWorkoutDesc(e.target.value)}
            placeholder="Опис (необов'язково)..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
          />
          <button
            onClick={handleCreateWorkout}
            disabled={!newWorkoutTitle.trim() || isSaving}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-gray-500 transition"
          >
            {isSaving ? '⏳ Створення...' : '✓ Створити тренування'}
          </button>
        </div>
      </PopupModal>

      {/* Popup створення програми */}
      <PopupModal
        isOpen={isCreateProgramOpen}
        onClose={() => setIsCreateProgramOpen(false)}
        title="📅 Нова програма"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={newProgramTitle}
            onChange={(e) => setNewProgramTitle(e.target.value)}
            placeholder="Назва програми..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
          <textarea
            value={newProgramDesc}
            onChange={(e) => setNewProgramDesc(e.target.value)}
            placeholder="Опис (необов'язково)..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
          />
          <button
            onClick={handleCreateProgram}
            disabled={!newProgramTitle.trim() || isSaving}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-gray-500 transition"
          >
            {isSaving ? '⏳ Створення...' : '✓ Створити програму'}
          </button>
        </div>
      </PopupModal>

      {/* Деталі тренування */}
      <WorkoutDetailModal
        isOpen={!!activeWorkoutDay}
        onClose={() => setActiveWorkoutDay(null)}
        workoutDay={activeWorkoutDay}
        onUpdate={loadData}
        zIndex={150}
      />

      {/* Деталі програми */}
      <ProgramDetailModal
        isOpen={!!activeProgram}
        onClose={() => setActiveProgram(null)}
        program={activeProgram}
        onUpdate={loadData}
        zIndex={120}
      />
    </div>
  );
};

// Inline підтвердження видалення для списку
const DeleteButton: React.FC<{ onDelete: () => void }> = ({ onDelete }) => {
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handle = () => {
    if (!confirm) {
      setConfirm(true);
      timer.current = setTimeout(() => setConfirm(false), 3000);
    } else {
      if (timer.current) clearTimeout(timer.current);
      onDelete();
    }
  };

  return (
    <button
      onClick={handle}
      className={`w-8 h-8 flex items-center justify-center rounded-xl transition text-sm ${
        confirm
          ? 'bg-red-600/30 text-red-400'
          : 'bg-slate-800 text-gray-500 hover:text-red-400'
      }`}
    >
      {confirm ? '✓' : '🗑'}
    </button>
  );
};