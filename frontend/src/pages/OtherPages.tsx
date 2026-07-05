import React from 'react';

export const TrainingSessionPage: React.FC = () => (
  <div className="p-4 text-white space-y-4">
    <h1 className="text-xl font-bold text-amber-400">🏋️‍♂️ Живі тренувания</h1>
    <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-center">
      <p className="text-xs text-gray-400">Тут відображатиметься календар тижня, плановані сесії та кнопка запуску тренування.</p>
    </div>
  </div>
);

export const CoachPanelPage: React.FC = () => (
  <div className="p-4 text-white space-y-4">
    <h1 className="text-xl font-bold text-fuchsia-400">🤝 Тренерство</h1>
    <div className="flex bg-slate-950 p-1 rounded-lg text-xs font-semibold">
      <div className="flex-1 py-1.5 text-center bg-slate-800 text-white rounded-md">Учні</div>
      <div className="flex-1 py-1.5 text-center text-gray-500">Тренери</div>
    </div>
  </div>
);

export const StatisticsPage: React.FC = () => (
  <div className="p-4 text-white space-y-4">
    <h1 className="text-xl font-bold text-teal-400">📊 Статистика</h1>
    <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-xs text-gray-500">
      [ Графік навантаження м'язів за 7/14/30 днів ]
    </div>
  </div>
);

export const ProfilePage: React.FC = () => (
  <div className="p-4 text-white space-y-4">
    <h1 className="text-xl font-bold text-rose-400">👤 Профіль</h1>
    <div className="p-4 bg-slate-800 rounded-xl space-y-2 text-sm">
      <div className="flex justify-between border-b border-slate-700 pb-2"><span>Telegram ID</span><span className="text-gray-400">@username</span></div>
      <div className="flex justify-between"><span>Статус</span><span className="text-amber-400">Атлет</span></div>
    </div>
  </div>
);