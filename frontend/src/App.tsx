import { useEffect, useState } from 'react'
import { GalleryPage } from './pages/GalleryPage'
import { TrainingSessionPage, CoachPanelPage, StatisticsPage, ProfilePage } from './pages/OtherPages'

function App() {
  const [activeTab, setActiveTab] = useState<'gallery' | 'training' | 'coach' | 'stats' | 'profile'>('gallery');

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'gallery': return <GalleryPage />;
      case 'training': return <TrainingSessionPage />;
      case 'coach': return <CoachPanelPage />;
      case 'stats': return <StatisticsPage />;
      case 'profile': return <ProfilePage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24 text-slate-100 select-none antialiased">
      <div className="max-w-md mx-auto">
        {renderTabContent()}
      </div>

      {/* Головна Нижня Навігація — 5 вкладок за вимогами ТЗ */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-900 shadow-2xl z-[90]">
        <div className="max-w-md mx-auto flex justify-around py-3 text-[10px] font-bold tracking-wide uppercase">
          
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'gallery' ? 'text-blue-400' : 'text-gray-500'}`}
          >
            <span className="text-base">📖</span>
            <span>Галерея</span>
          </button>

          <button 
            onClick={() => setActiveTab('training')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'training' ? 'text-amber-400' : 'text-gray-500'}`}
          >
            <span className="text-base">🏋️‍♂️</span>
            <span>Тренування</span>
          </button>

          <button 
            onClick={() => setActiveTab('coach')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'coach' ? 'text-fuchsia-400' : 'text-gray-500'}`}
          >
            <span className="text-base">🤝</span>
            <span>Тренер</span>
          </button>

          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'stats' ? 'text-teal-400' : 'text-gray-500'}`}
          >
            <span className="text-base">📊</span>
            <span>Статистика</span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'profile' ? 'text-rose-400' : 'text-gray-500'}`}
          >
            <span className="text-base">👤</span>
            <span>Профіль</span>
          </button>

        </div>
      </div>
    </div>
  )
}

export default App