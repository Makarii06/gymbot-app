import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { PopupModal } from '../modals/PopupModal';
import { TemplateSelectorModal } from '../modals/TemplateSelectorModal';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (session: any) => void;
  defaultDate?: string; // YYYY-MM-DD
  zIndex?: number;
}

const toLocalDateString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTodayStr = () => toLocalDateString(new Date());

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultDate,
  zIndex = 300,
}) => {
  const [title, setTitle] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [description, setDescription] = useState('');
  const [restDuration, setRestDuration] = useState(90);
  const [isSaving, setIsSaving] = useState(false);

  // Вибір шаблону
  const [isSelectingTemplate, setIsSelectingTemplate] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      const d = defaultDate || getTodayStr();
      setPlannedDate(d);
      setTitle('');
      setDescription('');
      setRestDuration(90);
      setSelectedDay(null);
      setIsSelectingTemplate(false);
    }
  }, [isOpen, defaultDate]);

  const handleSelectDay = (day: any) => {
    setSelectedDay(day);
    if (!title) setTitle(day.title);
    if (!description && day.description) setDescription(day.description);
    setIsSelectingTemplate(false);
  };

  const handleClearTemplate = () => {
    setSelectedDay(null);
  };

  const handleSubmit = async () => {
    if (!plannedDate || isSaving) return;
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const sessionTitle = title.trim();

      const created = await api.createSession({
        title: sessionTitle,
        planned_date: plannedDate,
        description: description.trim() || undefined,
        rest_duration_seconds: restDuration,
        from_workout_day_id: selectedDay?.id || undefined,
        start_immediately: false,
      });
      onCreated(created);
      onClose();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = !!plannedDate && !!title.trim() && !isSaving;

  // Мітка кнопки залежно від дати
  const todayStr = getTodayStr();
  const isPast = plannedDate < todayStr;
  const isFuture = plannedDate > todayStr;
  const submitLabel = isSaving
    ? '⏳ Створення...'
    : isPast
      ? '📝 Записати виконане'
      : isFuture
        ? '📅 Запланувати'
        : '📅 Запланувати на сьогодні';

  return (
    <>
    <PopupModal
      isOpen={isOpen}
      onClose={onClose}
      title="🏋️ Нове тренування"
      zIndex={zIndex}
    >
      <div className="space-y-4">
        {/* Вибір шаблону */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
            Шаблон вправ
          </label>
          {selectedDay ? (
            <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500/40 rounded-2xl">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{selectedDay.is_template ? '📋' : '📅'}</span>
                <span className="text-sm text-blue-300 font-semibold truncate">
                  {selectedDay.title}
                </span>
              </div>
              <button 
                onClick={handleClearTemplate}
                className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-900/40 rounded-lg transition"
              >
                Змінити
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSelectingTemplate(true)}
              className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 border border-slate-700 border-dashed rounded-2xl text-sm text-gray-400 hover:text-white hover:border-blue-500 hover:bg-slate-700 transition"
            >
              <span className="text-base">📋</span>
              <span>Використати з галереї чи програми...</span>
            </button>
          )}
        </div>

            {/* Назва */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Назва *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="напр: Груди та трицепс"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Опис */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Опис
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Нотатки, цілі, особливості..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
              />
            </div>

            {/* Час відпочинку */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Час відпочинку між підходами
              </label>
              <div className="flex gap-2 flex-wrap">
                {[30, 60, 90, 180].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRestDuration(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${restDuration === s
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600'
                      }`}
                  >
                    {s < 60 ? `0:${s}` : s === 60 ? '1:00' : s === 90 ? '1:30' : '3:00'}
                  </button>
                ))}
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={restDuration}
                  onChange={(e) => setRestDuration(Number(e.target.value))}
                  className="w-16 text-center px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
                <span className="self-center text-xs text-gray-500">с</span>
              </div>
            </div>

            {/* Дата */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Дата
              </label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
              {isPast && (
                <p className="text-xs text-amber-500 mt-1.5 ml-1">
                  ⚠️ Минула дата — тренування буде одразу позначено як виконане
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500"
            >
              {submitLabel}
            </button>
      </div>
      <TemplateSelectorModal
        isOpen={isSelectingTemplate}
        onClose={() => setIsSelectingTemplate(false)}
        onSelect={handleSelectDay}
        zIndex={zIndex + 10}
      />
    </PopupModal>
    </>
  );
};

