import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { CreateSessionModal } from '../components/sessions/CreateSessionModal';
import { SessionDetailModal } from '../components/sessions/SessionDetailModal';

// ─── Date helpers ─────────────────────────────────────────

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfWeek = (base: Date, offset = 0): Date => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun…6=Sat
  const diff = dow === 0 ? -6 : 1 - dow; // Monday-based
  d.setDate(d.getDate() + diff + offset * 7);
  return d;
};

const getWeekDays = (base: Date, weekOffset: number): Date[] => {
  const mon = startOfWeek(base, weekOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
};

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS_UA = [
  'Січень','Лютий','Березень','Квітень','Травень','Червень',
  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
];
const MONTHS_SHORT = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];

const statusColor = (status: string) => {
  if (status === 'IN_PROGRESS') return 'text-amber-400';
  if (status === 'DONE') return 'text-emerald-400';
  return 'text-blue-400';
};

const statusBg = (status: string) => {
  if (status === 'IN_PROGRESS') return 'bg-amber-900/20 border-amber-800/50';
  if (status === 'DONE') return 'bg-emerald-900/10 border-emerald-800/30';
  return 'bg-slate-900 border-slate-800';
};

const statusIcon = (status: string) => {
  if (status === 'IN_PROGRESS') return '▶';
  if (status === 'DONE') return '✓';
  return '📅';
};

const statusLabel = (status: string) => {
  if (status === 'IN_PROGRESS') return 'Активне';
  if (status === 'DONE') return 'Завершено';
  return 'Заплановано';
};

// ─── MonthPickerModal ─────────────────────────────────────

interface MonthPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selected: Date;
  onSelect: (d: Date) => void;
}

const MonthPickerModal: React.FC<MonthPickerModalProps> = ({ isOpen, onClose, selected, onSelect }) => {
  const [viewDate, setViewDate] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    if (isOpen) setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [isOpen, selected]);

  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const prefixDays = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateStr(new Date());
  const selectedStr = toDateStr(selected);

  const cells: (number | null)[] = [
    ...Array(prefixDays).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-9 h-9 rounded-xl bg-slate-800 text-gray-400 hover:text-white transition flex items-center justify-center"
          >
            ‹
          </button>
          <span className="font-bold text-sm text-white">
            {MONTHS_UA[month]} {year}
          </span>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-9 h-9 rounded-xl bg-slate-800 text-gray-400 hover:text-white transition flex items-center justify-center"
          >
            ›
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 text-center text-[10px] text-gray-600 font-bold pt-3 px-3">
          {DAYS_SHORT.map((d) => <div key={d}>{d}</div>)}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 p-3">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isSel = dateStr === selectedStr;
            return (
              <button
                key={i}
                onClick={() => {
                  onSelect(new Date(year, month, day));
                  onClose();
                }}
                className={`h-9 rounded-xl text-sm font-semibold transition ${
                  isSel
                    ? 'bg-blue-600 text-white'
                    : isToday
                    ? 'bg-amber-900/40 text-amber-400'
                    : 'text-gray-300 hover:bg-slate-800'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── TrainingPage ─────────────────────────────────────────

export const TrainingPage: React.FC = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date(today));
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessionsMap, setSessionsMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  // Modals
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<number | null>(null);

  // Week days for current offset
  const weekDays = getWeekDays(today, weekOffset);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);

  // Load sessions for visible week
  const loadWeekSessions = useCallback(async () => {
    setLoading(true);
    try {
      const sessions: any[] = await api.getSessions({ date_from: weekStart, date_to: weekEnd });
      const map: Record<string, any[]> = {};
      for (const s of sessions) {
        const key = s.planned_date;
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
      setSessionsMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadWeekSessions();
  }, [loadWeekSessions]);

  // Якщо вибрана дата поза поточним тижнем (після навігації місяця) — зсуваємо тиждень
  useEffect(() => {
    const selStr = toDateStr(selectedDate);
    const inWeek = weekDays.some((d) => toDateStr(d) === selStr);
    if (!inWeek) {
      // Обчислюємо новий weekOffset
      const base = startOfWeek(today, 0);
      const selMon = startOfWeek(selectedDate, 0);
      const diff = Math.round((selMon.getTime() - base.getTime()) / (7 * 24 * 3600 * 1000));
      setWeekOffset(diff);
    }
  }, [selectedDate]);

  const selectedSessions = sessionsMap[toDateStr(selectedDate)] || [];
  const activeSession = Object.values(sessionsMap)
    .flat()
    .find((s) => s.status === 'IN_PROGRESS');

  // Week label for header
  const isSameMonth = weekDays[0].getMonth() === weekDays[6].getMonth();
  const weekLabel = isSameMonth
    ? `${weekDays[0].getDate()}–${weekDays[6].getDate()} ${MONTHS_SHORT[weekDays[0].getMonth()]}`
    : `${weekDays[0].getDate()} ${MONTHS_SHORT[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS_SHORT[weekDays[6].getMonth()]}`;

  return (
    <div className="min-h-screen text-white">
      {/* ─── Sticky header: тиждень ─── */}
      <div className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 pb-2">
        {/* Верхній рядок: < тиждень | 📅 | > */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-gray-400 hover:text-white transition text-lg"
          >
            ‹
          </button>

          <button
            onClick={() => setIsMonthPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-sm font-semibold text-gray-300 hover:text-white hover:bg-slate-700 transition"
          >
            <span className="text-base">📅</span>
            <span>{weekLabel}</span>
          </button>

          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-gray-400 hover:text-white transition text-lg"
          >
            ›
          </button>
        </div>

        {/* Дні тижня */}
        <div className="grid grid-cols-7 gap-1 px-3">
          {weekDays.map((d, i) => {
            const dateStr = toDateStr(d);
            const isSelected = dateStr === toDateStr(selectedDate);
            const isToday = dateStr === toDateStr(today);
            const hasSessions = (sessionsMap[dateStr] || []).length > 0;
            const hasActive = (sessionsMap[dateStr] || []).some((s) => s.status === 'IN_PROGRESS');

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(new Date(d))}
                className={`flex flex-col items-center py-1.5 rounded-xl transition ${
                  isSelected
                    ? 'bg-blue-600'
                    : isToday
                    ? 'bg-slate-800 border border-blue-500/30'
                    : 'hover:bg-slate-800'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                  {DAYS_SHORT[i]}
                </span>
                <span className={`text-sm font-bold ${isSelected ? 'text-white' : isToday ? 'text-blue-400' : 'text-gray-300'}`}>
                  {d.getDate()}
                </span>
                {/* Dot indicator */}
                <div className="h-1 flex gap-0.5 mt-0.5">
                  {hasSessions && (
                    <div className={`w-1 h-1 rounded-full ${hasActive ? 'bg-amber-400' : isSelected ? 'bg-white/60' : 'bg-blue-400'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Контент ─── */}
      <div className="p-4 space-y-3 pb-28">
        {/* Баннер активного тренування на ІНШОМУ дні */}
        {activeSession &&
          toDateStr(new Date(activeSession.planned_date + 'T00:00:00')) !== toDateStr(selectedDate) && (
            <button
              onClick={() => setOpenSessionId(activeSession.id)}
              className="w-full flex items-center gap-3 p-3.5 bg-amber-900/20 border border-amber-700/50 rounded-2xl text-left hover:bg-amber-900/30 transition"
            >
              <span className="text-xl animate-pulse">▶</span>
              <div>
                <p className="text-sm font-bold text-amber-400">Активне тренування</p>
                <p className="text-xs text-amber-500/80">{activeSession.title}</p>
              </div>
              <span className="ml-auto text-amber-400 text-sm">Відкрити →</span>
            </button>
          )}

        {/* Заголовок дня */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {toDateStr(selectedDate) === toDateStr(today)
              ? 'Сьогодні'
              : selectedDate.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Сесії дня */}
        {selectedSessions.length === 0 && !loading && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="text-5xl mb-4 opacity-20">🏋️</div>
            <p className="text-gray-600 text-sm">Тренувань немає на цей день</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-2xl text-sm font-bold transition"
            >
              + Додати тренування
            </button>
          </div>
        )}

        {selectedSessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setOpenSessionId(session.id)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition hover:brightness-110 ${statusBg(session.status)}`}
          >
            {/* Status icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                session.status === 'IN_PROGRESS'
                  ? 'bg-amber-900/30'
                  : session.status === 'DONE'
                  ? 'bg-emerald-900/20'
                  : 'bg-slate-800'
              }`}
            >
              {session.status === 'IN_PROGRESS' ? (
                <span className="animate-pulse">▶</span>
              ) : (
                statusIcon(session.status)
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{session.title}</p>
              <p className={`text-xs mt-0.5 ${statusColor(session.status)}`}>
                {statusLabel(session.status)}
                {session.status === 'DONE' && session.started_at && session.finished_at && (
                  <span className="text-gray-500 ml-1.5">
                    ·{' '}
                    {Math.round(
                      (new Date(
                        session.finished_at.endsWith('Z') ? session.finished_at : session.finished_at + 'Z'
                      ).getTime() -
                        new Date(
                          session.started_at.endsWith('Z') ? session.started_at : session.started_at + 'Z'
                        ).getTime()) /
                        60000
                    )}{' '}
                    хв
                  </span>
                )}
              </p>
            </div>

            {session.status === 'IN_PROGRESS' ? (
              <span className="text-amber-400 text-sm font-bold flex-shrink-0 animate-pulse">
                Продовжити →
              </span>
            ) : (
              <span className="text-gray-600 text-sm flex-shrink-0">›</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── FAB ─── */}
      <button
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-900/40 flex items-center justify-center text-2xl font-light transition z-30"
        aria-label="Нове тренування"
      >
        +
      </button>

      {/* ─── Modals ─── */}
      <MonthPickerModal
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        selected={selectedDate}
        onSelect={(d) => setSelectedDate(d)}
      />

      <CreateSessionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultDate={toDateStr(selectedDate)}
        onCreated={(session) => {
          loadWeekSessions();
          setOpenSessionId(session.id);
        }}
      />

      <SessionDetailModal
        isOpen={!!openSessionId}
        onClose={() => setOpenSessionId(null)}
        sessionId={openSessionId}
        onUpdate={loadWeekSessions}
      />
    </div>
  );
};
