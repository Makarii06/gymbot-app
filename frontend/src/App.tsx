import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

// Інтерфейс для збереження даних профілю користувача з бекенду
interface UserProfile {
  id: number;
  tg_id: number;
  username: string | null;
  full_name: string | null;
  is_trainer: boolean;
  created_at: string;
}

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { path: '/gallery', label: 'Галерея', icon: '🖼️' },
    { path: '/workouts', label: 'Тренування', icon: '🏋️' },
    { path: '/coaching', label: 'Тренерство', icon: '👥' },
    { path: '/statistics', label: 'Статистика', icon: '📊' },
    { path: '/profile', label: 'Профіль', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-5 shadow-xl z-50">
      <ul className="flex justify-around items-center h-16 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path} className="flex-1">
              <Link 
                to={item.path} 
                className={`flex flex-col items-center justify-center p-2 transition-all ${
                  isActive ? 'text-blue-600 scale-105 font-medium' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-[11px] tracking-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const App = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Ініціалізація Telegram Web App
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand(); // Розгортаємо додаток на весь екран телефону
    }

    // 2. Отримуємо унікальні дані авторизації Telegram
    const initData = tg?.initData || "";
    
    // Отримуємо адресу бекенду з налаштувань Vite (через Nginx це наш поточний домен Ngrok + /api)
    const apiUrl = import.meta.env.VITE_API_URL || "/api";

    // 3. Робимо асинхронний запит на бекенд для авторизації/отримання профілю
    fetch(`${apiUrl}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${initData}`, // Передаємо initData у заголовку безпеки
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Помилка авторизації: STATUS ${res.status}`);
        return res.json();
      })
      .then((data: UserProfile) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 antialiased pb-28">
        {/* Шапка застосунку */}
        <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-40 shadow-sm">
          <h1 className="text-lg font-black text-center tracking-wide text-blue-600 uppercase">GymBot 💪</h1>
        </header>

        {/* Контент сторінок */}
        <main className="max-w-md mx-auto p-4">
          <Routes>
            <Route path="/gallery" element={<div className="bg-white p-6 rounded-2xl shadow-sm font-semibold text-center text-gray-700">🖼️ Екран: Галерея вправ та програм</div>} />
            <Route path="/workouts" element={<div className="bg-white p-6 rounded-2xl shadow-sm font-semibold text-center text-gray-700">🏋️ Екран: Планування тренувань</div>} />
            <Route path="/coaching" element={<div className="bg-white p-6 rounded-2xl shadow-sm font-semibold text-center text-gray-700">👥 Екран: Тренерська панель</div>} />
            <Route path="/statistics" element={<div className="bg-white p-6 rounded-2xl shadow-sm font-semibold text-center text-gray-700">📊 Екран: Статистика навантажень</div>} />
            
            {/* Оновлений екран Профілю з реальними даними з бази */}
            <Route path="/profile" element={
              <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl shadow-inner">👤</div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{loading ? "Завантаження..." : profile?.full_name || "Гість GymBot"}</h2>
                    <p className="text-xs text-gray-400">@{profile?.username || "немає_юзернейму"}</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-100 text-center">
                    ⚠️ Помилка з'єднання: {error}. Перевірте Ngrok та Докер.
                  </div>
                )}

                <div className="space-y-3 text-sm border-t border-gray-50 pt-4">
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400">Мій Telegram ID:</span>
                    <span className="font-mono font-medium text-gray-700">{profile?.tg_id || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400">Внутрішній ID системи:</span>
                    <span className="font-medium text-gray-700">#{profile?.id || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400">Роль користувача:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      profile?.is_trainer ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {profile?.is_trainer ? "👟 Тренер" : "💪 Атлет"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Реєстрація:</span>
                    <span className="text-gray-500 text-xs">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('uk-UA') : "—"}
                    </span>
                  </div>
                </div>
              </div>
            } />

            <Route path="*" element={
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-center shadow-sm">
                <p className="text-blue-800 font-semibold mb-2">Вітаємо у GymBot Mini App! 🚀</p>
                <p className="text-xs text-blue-600 leading-relaxed">Оберіть потрібний розділ у меню знизу, щоб розпочати тренування.</p>
              </div>
            } />
          </Routes>
        </main>

        {/* Стильна нижня навігація на 5 вкладок */}
        <BottomNav />
      </div>
    </Router>
  );
};

export default App;