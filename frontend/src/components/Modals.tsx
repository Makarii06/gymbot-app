import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const FullscreenModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col text-white animate-in fade-in slide-in-from-bottom duration-200">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h2 className="text-base font-bold tracking-wide truncate pr-4">{title}</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white text-xl">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-slate-900 pb-20">{children}</div>
    </div>
  );
};

export const PopupModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 text-white space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-gray-200">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// МЕДІА + ТЕГИ + ОПИС: Модалка створення/редагування вправи
interface ExerciseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  exerciseToEdit?: any | null; // Якщо передано – режим редагування, якщо ні – створення
}

export const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({ isOpen, onClose, onSave, exerciseToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [tagsString, setTagsString] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (exerciseToEdit) {
        setName(exerciseToEdit.name || '');
        setDescription(exerciseToEdit.description || '');
        setTagsString(exerciseToEdit.tag_names?.join(', ') || '');
      } else {
        setName('');
        setDescription('');
        setTagsString('');
      }
      setMediaFile(null);
    }
  }, [isOpen, exerciseToEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    // Перетворюємо рядок "Ноги, Сила" в масив ["Ноги", "Сила"]
    const tag_names = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    // Логіка завантаження файлу локально (поки що імітуємо media_url для бази)
    let media_url = exerciseToEdit?.media_url || "";
    if (mediaFile) {
      media_url = `/uploads/${mediaFile.name}`; // На початковому етапі медіа зберігається локально
    }

    const payload = { name, description, media_url, is_public: false, muscles: [], tag_names };

    try {
      if (exerciseToEdit) {
        await api.updateExercise(exerciseToEdit.id, payload);
      } else {
        await api.createExercise(payload);
      }
      onSave();
      onClose();
    } catch (e) {
      alert("Помилка збереження вправи");
    }
  };

  if (!isOpen) return null;

  return (
    <PopupModal isOpen={isOpen} onClose={onClose} title={exerciseToEdit ? "✏️ Редагування вправи" : "✨ Нова вправа в базу"}>
      <div className="space-y-3 text-xs">
        <div>
          <label className="text-gray-400 font-bold block mb-1">Назва вправи</label>
          <input 
            type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 font-bold block mb-1">Опис</label>
          <textarea 
            value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 h-16 resize-none"
          />
        </div>
        <div>
          <label className="text-gray-400 font-bold block mb-1">Медіа файл (відео/фото)</label>
          <input 
            type="file" onChange={e => setMediaFile(e.target.files?.[0] || null)}
            className="w-full text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
          />
        </div>
        <div>
          <label className="text-gray-400 font-bold block mb-1">Теги (через кому)</label>
          <input 
            type="text" value={tagsString} onChange={e => setTagsString(e.target.value)}
            placeholder="напр: Ноги, Квадрицепс, Сила"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <button onClick={handleSubmit} className="w-full bg-blue-600 py-2.5 rounded-xl font-bold mt-2 text-sm">
          {exerciseToEdit ? "Оновити вправу" : "Зберегти вправу"}
        </button>
      </div>
    </PopupModal>
  );
};

// Оновлений селектор вправ із кнопкою редагування
export const ExerciseSelectorModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onAddExercises: (exerciseIds: number[]) => void;
  onCreateNew: () => void;
  onEditExercise: (exercise: any) => void;
}> = ({ isOpen, onClose, onAddExercises, onCreateNew, onEditExercise }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');

  const loadData = () => {
    api.getExercises().then(setExercises).catch(console.error);
  };

  useEffect(() => {
    if (isOpen) { loadData(); setSelectedIds([]); }
  }, [isOpen]);

  const filtered = exercises.filter(ex => ex.name.toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="🎯 Виберіть вправи">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input 
            type="text" placeholder="Пошук..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button onClick={onCreateNew} className="bg-blue-600 px-3 py-2 rounded-lg text-[11px] font-bold">+ Нова</button>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {filtered.map(ex => {
            const isChecked = selectedIds.includes(ex.id);
            return (
              <div 
                key={ex.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  isChecked ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-950 border-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setSelectedIds(prev => prev.includes(ex.id) ? prev.filter(x => x !== ex.id) : [...prev, ex.id])}>
                  <span className="text-lg">🏋️‍♂️</span>
                  <span className="text-xs font-semibold">{ex.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditExercise(ex); }}
                    className="p-1.5 text-gray-500 hover:text-amber-400 transition text-sm"
                  >
                    ✏️
                  </button>
                  <input 
                    type="checkbox" checked={isChecked} onChange={() => {}}
                    className="rounded text-blue-600 bg-slate-900 border-slate-700 w-4 h-4"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => { onAddExercises(selectedIds); onClose(); }}
          disabled={selectedIds.length === 0}
          className="w-full bg-blue-600 disabled:bg-gray-800 disabled:text-gray-500 py-3 rounded-xl font-bold text-xs uppercase"
        >
          Додати виділені ({selectedIds.length})
        </button>
      </div>
    </FullscreenModal>
  );
};