import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FullscreenModal, PopupModal, ExerciseSelectorModal, ExerciseFormModal } from '../components/Modals';

export const GalleryPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'exercises' | 'workouts' | 'programs'>('exercises');
  
  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutDays, setWorkoutDays] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  // Створення програм/тренувань
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDesc, setQuickDesc] = useState('');

  // Перегляд (Картки)
  const [activeDay, setActiveDay] = useState<any | null>(null);
  const [activeProgram, setActiveProgram] = useState<any | null>(null);
  const [activeProgramTabIdx, setActiveProgramTabIdx] = useState<number>(0);

  // Стани для Вправ (Сендвічі)
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const [isExerciseFormOpen, setIsExerciseFormOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<any | null>(null);

  const refreshAll = async () => {
    try {
      const ex = await api.getExercises(); setExercises(ex);
      const days = await api.getWorkoutDays(); setWorkoutDays(days);
      const progs = await api.getPrograms(); setPrograms(progs);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { refreshAll(); }, [subTab]);

  // ВИПРАВЛЕНО: Створення програми з усіма потрібними параметрами
  const handleSaveQuick = async () => {
    if (!quickTitle.trim()) return;
    try {
      if (subTab === 'workouts') {
        await api.createWorkoutDay({ title: quickTitle, description: quickDesc, is_template: true, exercises: [] });
      } else if (subTab === 'programs') {
        // Обов'язково передаємо visibility щоб бекенд пропустив валідацію!
        await api.createProgram({ title: quickTitle, description: quickDesc, visibility: 'PRIVATE', day_ids: [] });
      }
      setQuickTitle(''); setQuickDesc(''); setIsQuickCreateOpen(false);
      refreshAll();
    } catch (e) { 
      alert("Помилка при створенні об'єкта. Перевірте з'єднання з бекендом."); 
    }
  };

  // РОБОЧЕ ЗБЕРЕЖЕННЯ: Додавання вправ до тренувального дня
  const handleAddExercisesToDay = async (selectedIds: number[]) => {
    if (!activeDay) return;
    try {
      // Формуємо масив вправ для WorkoutDayCreate/Update конструктора
      const mappedExercises = selectedIds.map((id, index) => ({
        exercise_id: id,
        position: index + 1,
        note: "Додано з галереї",
        sets: [{ position: 1, target_reps: 10, target_weight: 0, is_warmup: false }] // Дефолтний підхід
      }));

      // Зберігаємо оновлений день на сервері
      const updatedDay = await api.createWorkoutDay({
        title: activeDay.title,
        description: activeDay.description,
        is_template: true,
        exercises: mappedExercises
      });

      alert("Вправи успішно додані та збережені в базі даних!");
      setActiveDay(updatedDay); // Оновлюємо інтерфейс модалки новими даними
      refreshAll();
    } catch (e) {
      alert("Не вдалося зберегти зміни в тренуванні.");
    }
  };

  return (
    <div className="p-4 space-y-4 text-white">
      {/* Навігація */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 text-xs font-semibold">
        {['exercises', 'workouts', 'programs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab as any)}
            className={`flex-1 py-2 text-center rounded-lg uppercase tracking-wider transition text-[10px] ${
              subTab === tab ? 'bg-slate-900 text-blue-400 border border-slate-800/50' : 'text-gray-500'
            }`}
          >
            {tab === 'exercises' ? '🏋️‍♂️ Вправи' : tab === 'workouts' ? '📋 Тренування' : '📅 Програми'}
          </button>
        ))}
      </div>

      <button 
        onClick={() => {
          if (subTab === 'exercises') { setExerciseToEdit(null); setIsExerciseFormOpen(true); }
          else setIsQuickCreateOpen(true);
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl text-xs font-bold tracking-wide transition"
      >
        + {subTab === 'exercises' ? 'Створити повну вправу' : subTab === 'workouts' ? 'Створити шаблон дня' : 'Створити програму'}
      </button>

      {/* Список */}
      <div className="space-y-2">
        {subTab === 'exercises' && exercises.map(ex => (
          <div key={ex.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-900 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-lg">
                {ex.media_url ? "📹" : "💪"}
              </div>
              <div>
                <h4 className="font-bold text-xs">{ex.name}</h4>
                <p className="text-[10px] text-gray-400 line-clamp-1">{ex.description}</p>
              </div>
            </div>
            <button 
              onClick={() => { setExerciseToEdit(ex); setIsExerciseFormOpen(true); }}
              className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg text-amber-400"
            >
              Редагувати
            </button>
          </div>
        ))}

        {subTab === 'workouts' && workoutDays.map(day => (
          <div key={day.id} onClick={() => setActiveDay(day)} className="p-3 bg-slate-950 border border-slate-900 rounded-xl hover:border-slate-800 cursor-pointer">
            <h4 className="font-bold text-xs text-emerald-400">{day.title}</h4>
            <p className="text-[10px] text-gray-500 truncate">{day.description}</p>
          </div>
        ))}

        {subTab === 'programs' && programs.map(prog => (
          <div key={prog.id} onClick={() => { setActiveProgram(prog); setActiveProgramTabIdx(0); }} className="p-3 bg-slate-950 border border-slate-900 rounded-xl hover:border-slate-800 cursor-pointer">
            <h4 className="font-bold text-xs text-purple-400">{prog.title}</h4>
            <p className="text-[10px] text-gray-500 truncate">{prog.description}</p>
          </div>
        ))}
      </div>

      {/* ПОПАП ШВИДКОГО СТВОРЕННЯ (ДНІ/ПРОГРАМИ) */}
      <PopupModal isOpen={isQuickCreateOpen} onClose={() => setIsQuickCreateOpen(false)} title={subTab === 'workouts' ? "Новий шаблон дня" : "Нова програма"}>
        <div className="space-y-3">
          <input type="text" placeholder="Назва..." value={quickTitle} onChange={e => setQuickTitle(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-white"/>
          <textarea placeholder="Опис..." value={quickDesc} onChange={e => setQuickDesc(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 h-20 resize-none text-white"/>
          <button onClick={handleSaveQuick} className="w-full bg-blue-600 py-2.5 rounded-xl text-xs font-bold">Зберегти</button>
        </div>
      </PopupModal>

      {/* МОДАЛКА: ДЕТАЛІ ШАБЛОНУ ТРЕНУВАННЯ */}
      <FullscreenModal isOpen={activeDay !== null} onClose={() => setActiveDay(null)} title={activeDay?.title || ''}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400 bg-slate-950 p-3 rounded-xl border border-slate-900">{activeDay?.description || 'Опис відсутній'}</p>
          <h4 className="text-xs font-bold text-gray-400 uppercase">Вправи в тренуванні:</h4>
          
          {activeDay?.exercises && activeDay.exercises.length > 0 ? (
            <div className="space-y-2">
              {activeDay.exercises.map((ex: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-xs flex justify-between">
                  <span>{idx + 1}. Вправа ID {ex.exercise_id}</span>
                  <span className="text-gray-500">{ex.note}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-gray-600">Вправи ще не додані.</div>
          )}

          <button onClick={() => setIsExerciseSelectorOpen(true)} className="w-full bg-emerald-600 py-3 rounded-xl text-xs font-bold mt-4">+ Додати вправу з Галереї</button>
        </div>
      </FullscreenModal>

      {/* МОДАЛКА: ДЕТАЛІ ПРОГРАМИ */}
      <FullscreenModal isOpen={activeProgram !== null} onClose={() => setActiveProgram(null)} title={`Програма: ${activeProgram?.title}`}>
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
            {['День 1', 'День 2'].map((dayTitle, idx) => (
              <button key={idx} onClick={() => setActiveProgramTabIdx(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition ${activeProgramTabIdx === idx ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-slate-950 border-slate-900 text-gray-400'}`}>{dayTitle}</button>
            ))}
            <button onClick={() => alert("Додавання дня...")} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white border border-slate-700">+</button>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 min-h-40 text-xs text-gray-400">Вміст дня програми...</div>
        </div>
      </FullscreenModal>

      {/* СЕНДВІЧ-МОДАЛКА: СЕЛЕКТОР ВПРАВ */}
      <ExerciseSelectorModal 
        isOpen={isExerciseSelectorOpen} onClose={() => setIsExerciseSelectorOpen(false)}
        onAddExercises={handleAddExercisesToDay}
        onCreateNew={() => { setExerciseToEdit(null); setIsExerciseFormOpen(true); }}
        onEditExercise={(ex) => { setExerciseToEdit(ex); setIsExerciseFormOpen(true); }}
      />

      {/* СЕНДВІЧ-МОДАЛКА: ФОРМА ВПРАВИ (СТВОРЕННЯ/РЕДАГУВАННЯ) */}
      <ExerciseFormModal 
        isOpen={isExerciseFormOpen} onClose={() => setIsExerciseFormOpen(false)}
        exerciseToEdit={exerciseToEdit} onSave={refreshAll}
      />
    </div>
  );
};