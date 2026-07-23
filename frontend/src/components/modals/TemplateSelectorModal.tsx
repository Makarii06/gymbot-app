import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { PopupModal } from './PopupModal';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (day: any) => void;
  zIndex?: number;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  zIndex = 310,
}) => {
  const [tab, setTab] = useState<'templates' | 'programs'>('templates');
  
  // Templates Data
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [search, setSearch] = useState('');

  // Programs Data
  const [programs, setPrograms] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [programDaysCache, setProgramDaysCache] = useState<Record<number, any[]>>({});
  const [loadingProgramDays, setLoadingProgramDays] = useState<Record<number, boolean>>({});

  // Preview Data
  const [expandedDayId, setExpandedDayId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab('templates');
      setSearch('');
      setExpandedProgramId(null);
      setExpandedDayId(null);

      // Load templates
      setLoadingTemplates(true);
      api.getWorkoutDays(false) // only is_template=True
        .then(setTemplates)
        .catch(console.error)
        .finally(() => setLoadingTemplates(false));

      // Load programs
      setLoadingPrograms(true);
      api.getPrograms()
        .then(setPrograms)
        .catch(console.error)
        .finally(() => setLoadingPrograms(false));
    }
  }, [isOpen]);

  const toggleProgram = async (programId: number) => {
    if (expandedProgramId === programId) {
      setExpandedProgramId(null);
      return;
    }
    setExpandedProgramId(programId);

    // Fetch days if not cached
    if (!programDaysCache[programId]) {
      setLoadingProgramDays((prev) => ({ ...prev, [programId]: true }));
      try {
        const days = await api.getProgramDays(programId);
        // Map program days to workout days so they have the same shape
        const mappedDays = days.map((pd: any) => ({
          ...pd.workout_day,
          id: pd.workout_day.id, // Ensure ID is the workout_day_id
        }));
        setProgramDaysCache((prev) => ({ ...prev, [programId]: mappedDays }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProgramDays((prev) => ({ ...prev, [programId]: false }));
      }
    }
  };

  const toggleDayPreview = (dayId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDayId((prev) => (prev === dayId ? null : dayId));
  };

  const filteredTemplates = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderDayItem = (day: any, isTemplate: boolean) => {
    const isPreviewOpen = expandedDayId === day.id;

    return (
      <div key={day.id} className="border border-slate-700 bg-slate-800 rounded-xl overflow-hidden mb-2">
        <div 
          className="p-3 flex items-center cursor-pointer hover:bg-slate-700 transition"
          onClick={() => onSelect(day)}
        >
          <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-sm mr-3 flex-shrink-0">
            {isTemplate ? '📋' : '📅'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{day.title}</p>
            {day.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{day.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <button
              onClick={(e) => toggleDayPreview(day.id, e)}
              className="px-2 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-600 transition text-xs"
              title="Переглянути вправи"
            >
              {isPreviewOpen ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {isPreviewOpen && (
          <div className="border-t border-slate-700 bg-slate-900/50 p-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Вправи:
            </h4>
            {(!day.exercises || day.exercises.length === 0) ? (
              <p className="text-xs text-gray-500">Немає вправ</p>
            ) : (
              <ul className="space-y-1.5">
                {day.exercises.map((ex: any, idx: number) => (
                  <li key={idx} className="flex items-center text-sm text-gray-300">
                    <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px] mr-2 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{ex.exercise?.name || 'Невідома вправа'}</span>
                    <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
                      {ex.sets?.length || 0} підх.
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button 
              onClick={() => onSelect(day)}
              className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
            >
              Вибрати цей шаблон
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <PopupModal
      isOpen={isOpen}
      onClose={onClose}
      title="Виберіть шаблон"
      zIndex={zIndex}
    >
      <div className="flex bg-slate-800 p-1 rounded-xl mb-4">
        <button
          onClick={() => setTab('templates')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            tab === 'templates' ? 'bg-slate-700 text-white' : 'text-gray-500'
          }`}
        >
          📋 Шаблони
        </button>
        <button
          onClick={() => setTab('programs')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            tab === 'programs' ? 'bg-slate-700 text-white' : 'text-gray-500'
          }`}
        >
          📂 Програми
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {tab === 'templates' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Пошук..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
            
            {loadingTemplates ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Шаблонів не знайдено</p>
            ) : (
              <div>
                {filteredTemplates.map(day => renderDayItem(day, true))}
              </div>
            )}
          </div>
        )}

        {tab === 'programs' && (
          <div className="space-y-3">
            {loadingPrograms ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : programs.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">У вас ще немає створених програм</p>
            ) : (
              programs.map((prog) => (
                <div key={prog.id} className="border border-slate-700 bg-slate-800 rounded-xl overflow-hidden mb-2">
                  <div 
                    className="p-3 flex items-center cursor-pointer hover:bg-slate-700 transition"
                    onClick={() => toggleProgram(prog.id)}
                  >
                    <div className="w-8 h-8 bg-blue-900/30 text-blue-400 rounded-lg flex items-center justify-center text-sm mr-3 flex-shrink-0">
                      📂
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{prog.title}</p>
                    </div>
                    <div className="ml-2 text-gray-400 flex-shrink-0">
                      {expandedProgramId === prog.id ? '▲' : '▼'}
                    </div>
                  </div>

                  {expandedProgramId === prog.id && (
                    <div className="border-t border-slate-700 bg-slate-900/30 p-2">
                      {loadingProgramDays[prog.id] ? (
                        <div className="flex justify-center py-4">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (programDaysCache[prog.id] || []).length === 0 ? (
                        <p className="text-center text-gray-500 text-sm py-3">Немає тренувань у цій програмі</p>
                      ) : (
                        <div className="pl-2 border-l border-slate-700 ml-2 mt-1 mb-1">
                          {(programDaysCache[prog.id] || []).map((day) => renderDayItem(day, false))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PopupModal>
  );
};
