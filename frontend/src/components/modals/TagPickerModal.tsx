import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { PopupModal } from './PopupModal';

interface TagPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTagIds: number[];
  onConfirm: (tags: any[]) => void;
  zIndex?: number;
}

export const TagPickerModal: React.FC<TagPickerModalProps> = ({
  isOpen,
  onClose,
  selectedTagIds,
  onConfirm,
  zIndex = 350,
}) => {
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTags();
      setAllTags(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTags();
      setSelected(new Set(selectedTagIds));
      setSearch('');
      setNewTagName('');
    }
  }, [isOpen]);

  const filtered = allTags.filter((t) =>
    t.name.includes(search.toLowerCase())
  );

  const toggle = (tagId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim().toLowerCase();
    if (!name || isCreating) return;

    // Перевіримо чи вже є такий тег
    const existing = allTags.find((t) => t.name === name);
    if (existing) {
      setSelected((prev) => new Set([...prev, existing.id]));
      setNewTagName('');
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await api.createTag(name);
      setAllTags((prev) => [...prev, newTag]);
      setSelected((prev) => new Set([...prev, newTag.id]));
      setNewTagName('');
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = () => {
    const selectedTags = allTags.filter((t) => selected.has(t.id));
    onConfirm(selectedTags);
    onClose();
  };

  return (
    <PopupModal
      isOpen={isOpen}
      onClose={onClose}
      title="🏷 Вибір тегів"
      zIndex={zIndex}
    >
      <div className="space-y-3">
        {/* Пошук */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Пошук тегу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Список тегів */}
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!isLoading && filtered.map((tag) => (
            <label
              key={tag.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${
                selected.has(tag.id)
                  ? 'bg-blue-500/15 border border-blue-500/30'
                  : 'bg-slate-800 border border-transparent hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(tag.id)}
                onChange={() => toggle(tag.id)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                  selected.has(tag.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                }`}
              >
                {selected.has(tag.id) && <span className="text-[10px] text-white font-bold">✓</span>}
              </div>
              <span className="text-sm text-white flex-1">{tag.name}</span>
              {tag.is_system && (
                <span className="text-[10px] text-gray-500 bg-slate-700 px-1.5 py-0.5 rounded-full">
                  система
                </span>
              )}
            </label>
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-3">
              {search ? `Тег "${search}" не знайдено` : 'Тегів ще немає'}
            </p>
          )}
        </div>

        {/* Створити новий тег */}
        <div className="border-t border-slate-700 pt-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Новий тег
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              placeholder="напр: кардіо"
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreating}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 rounded-xl text-sm font-bold transition"
            >
              {isCreating ? '...' : '+ Додати'}
            </button>
          </div>
          {newTagName && (
            <p className="text-[11px] text-gray-500 mt-1 ml-1">
              Буде збережено як: <span className="text-blue-400">"{newTagName.trim().toLowerCase()}"</span>
            </p>
          )}
        </div>

        {/* Підтвердження */}
        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-500 transition"
        >
          ✓ Застосувати {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
      </div>
    </PopupModal>
  );
};
