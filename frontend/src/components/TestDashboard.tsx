import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const TestDashboard: React.FC = () => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutDays, setWorkoutDays] = useState<any[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  const loadData = async () => {
    try {
      const ex = await api.getExercises();
      setExercises(ex);
      const days = await api.getWorkoutDays();
      setWorkoutDays(days);
      addLog("Дані успішно завантажено з бекенду!");
    } catch (err: any) {
      addLog(`Помилка завантаження даних: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExercise = async () => {
    try {
      const newEx = await api.createExercise({
        name: `Присідання ${Math.floor(Math.random() * 100)}`,
        description: "Базова вправа для ніг",
        is_public: false,
        muscles: [],
        tag_names: ["Ноги", "Квадрицепс"]
      });
      addLog(`Створено вправу: ID ${newEx.id} - ${newEx.name}`);
      loadData();
    } catch (err: any) {
      addLog(`Помилка створення вправи: ${err.message}`);
    }
  };

  const handleCreateWorkoutDay = async () => {
    if (exercises.length === 0) {
      addLog("Спочатку створіть хоча б одну вправу, щоб додати її в день!");
      return;
    }

    try {
      // Беремо ID першої ліпшої вправи для тесту
      const exerciseId = exercises[0].id;

      const newDay = await api.createWorkoutDay({
        title: "День Ніг (Тест)",
        description: "Інтенсивне тренування ніг",
        is_public: false,
        exercises: [
          {
            exercise_id: exerciseId,
            position: 1,
            note: "Робити чітко до паралелі",
            sets: [
              { position: 1, target_reps: 12, target_weight: 60.0, is_warmup: true },
              { position: 2, target_reps: 10, target_weight: 100.0, is_warmup: false },
              { position: 3, target_reps: 10, target_weight: 100.0, is_warmup: false }
            ]
          }
        ]
      });

      addLog(`Успіх! Створено WorkoutDay ID: ${newDay.id} з 1 вправою та 3 підходами.`);
      loadData();
    } catch (err: any) {
      addLog(`Помилка створення дня тренувань: ${err.message}`);
    }
  };

  return (
    <div className="p-4 bg-slate-900 text-white min-h-screen space-y-6 pb-20">
      <h1 className="text-xl font-bold text-emerald-400">GymBot Вайб-Тестер 🚀</h1>
      
      <div className="flex gap-2">
        <button 
          onClick={handleCreateExercise}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold transition"
        >
          + Створити вправу
        </button>
        <button 
          onClick={handleCreateWorkoutDay}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm font-semibold transition"
        >
          + Створити День (з підходами)
        </button>
        <button 
          onClick={loadData}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm transition"
        >
          Оновити
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-3 rounded border border-slate-700">
          <h2 className="font-semibold text-blue-400 mb-2">Вправи в базі ({exercises.length})</h2>
          <div className="max-h-40 overflow-y-auto text-xs space-y-1">
            {exercises.map(e => <div key={e.id} className="bg-slate-705 p-1 rounded">ID {e.id}: {e.name}</div>)}
          </div>
        </div>

        <div className="bg-slate-800 p-3 rounded border border-slate-700">
          <h2 className="font-semibold text-emerald-400 mb-2">Дні тренувань ({workoutDays.length})</h2>
          <div className="max-h-40 overflow-y-auto text-xs space-y-1">
            {workoutDays.map(d => <div key={d.id} className="bg-slate-705 p-1 rounded">ID {d.id}: {d.title}</div>)}
          </div>
        </div>
      </div>

      <div className="bg-black p-3 rounded border border-slate-800 font-mono text-xs">
        <h3 className="text-gray-400 mb-1 font-sans font-bold">Логи запитів:</h3>
        <div className="max-h-48 overflow-y-auto space-y-1 flex flex-col">
          {log.map((l, idx) => <span key={idx} className="text-gray-300">{l}</span>)}
        </div>
      </div>
    </div>
  );
};