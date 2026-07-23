import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { PopupModal } from './PopupModal';
import { TagPickerModal } from './TagPickerModal';
import { MediaLightboxModal } from './MediaLightboxModal';

interface ExerciseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise?: any) => void;
  onDelete?: () => void;
  exerciseToEdit?: any | null;
  zIndex?: number;
}

export const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  exerciseToEdit,
  zIndex = 250,
}) => {
  // Основні поля
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Медіа
  const [media, setMedia] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  // Set<number> — id медіа в стані підтвердження видалення
  const [confirmDeleteMedia, setConfirmDeleteMedia] = useState<Set<number>>(new Set());
  const confirmTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Після першого збереження нової вправи — залишаємося відкритими (edit mode)
  const [localExercise, setLocalExercise] = useState<any | null>(null);

  // Inline confirm delete exercise
  const [confirmDeleteEx, setConfirmDeleteEx] = useState(false);
  const confirmDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Picker
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);

  const isEdit = !!(exerciseToEdit || localExercise);
  const activeExercise = localExercise || exerciseToEdit;

  useEffect(() => {
    if (isOpen) {
      if (exerciseToEdit) {
        setName(exerciseToEdit.name || '');
        setDescription(exerciseToEdit.description || '');
        setIsPublic(exerciseToEdit.is_public || false);
        setTags(exerciseToEdit.tags || []);
        setMedia(exerciseToEdit.media || []);
        setLocalExercise(null); // не потрібне — є exerciseToEdit
      } else {
        setName('');
        setDescription('');
        setTags([]);
        setMedia([]);
        setIsPublic(false);
        setLocalExercise(null);
      }
      setConfirmDeleteEx(false);
      setConfirmDeleteMedia(new Set());
    }
  }, [isOpen, exerciseToEdit]);

  // ==========================================
  // ЗБЕРЕЖЕННЯ ВПРАВИ
  // ==========================================
  const handleSubmit = async () => {
    if (!name.trim() || isLoading) return;
    setIsLoading(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
      muscles: [],
      tag_names: tags.map((t) => t.name),
    };

    try {
      if (isEdit && activeExercise?.id) {
        // Оновлення існуючої
        const updated = await api.updateExercise(activeExercise.id, payload);
        onSave(updated);
        onClose();
      } else {
        // Створення нової → залишаємося відкритими для фото
        const created = await api.createExercise(payload);
        setLocalExercise(created);
        setMedia(created.media || []);
        // Оновлюємо теги зі створеної (можуть бути id)
        setTags(created.tags || []);
        // НЕ закриваємо — користувач може додати фото
      }
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Кнопка "Готово" — після створення нової вправи
  const handleDone = () => {
    onSave(localExercise);
    onClose();
    setLocalExercise(null);
  };

  // ==========================================
  // МЕДІА
  // ==========================================
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const exId = activeExercise?.id;
    if (!exId) return;

    setUploadingMedia(true);
    try {
      const newMedia = await api.uploadExerciseMedia(exId, file);
      setMedia((prev) => [...prev, newMedia]);
    } catch (ex: any) {
      alert(`Помилка завантаження: ${ex.message}`);
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMediaClick = (mediaId: number) => {
    if (!confirmDeleteMedia.has(mediaId)) {
      // Перший клік — ставимо в режим підтвердження на 3 секунди
      setConfirmDeleteMedia((prev) => new Set([...prev, mediaId]));
      const timer = setTimeout(() => {
        setConfirmDeleteMedia((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
      }, 3000);
      confirmTimers.current.set(mediaId, timer);
    } else {
      // Другий клік — видаляємо
      const timer = confirmTimers.current.get(mediaId);
      if (timer) clearTimeout(timer);
      confirmTimers.current.delete(mediaId);
      setConfirmDeleteMedia((prev) => {
        const next = new Set(prev);
        next.delete(mediaId);
        return next;
      });
      doDeleteMedia(mediaId);
    }
  };

  const doDeleteMedia = async (mediaId: number) => {
    const exId = activeExercise?.id;
    if (!exId) return;
    try {
      await api.deleteExerciseMedia(exId, mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (ex: any) {
      alert(`Помилка: ${ex.message}`);
    }
  };

  // ==========================================
  // ВИДАЛЕННЯ ВПРАВИ
  // ==========================================
  const handleDeleteExercise = async () => {
    if (!confirmDeleteEx) {
      setConfirmDeleteEx(true);
      confirmDeleteTimer.current = setTimeout(() => setConfirmDeleteEx(false), 3500);
      return;
    }
    if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
    try {
      await api.deleteExercise(activeExercise.id);
      onDelete?.();
      onClose();
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
    }
  };

  const removeTag = (tagId: number) => setTags((prev) => prev.filter((t) => t.id !== tagId));

  // Чи є активна вправа (є id для завантаження медіа)
  const hasId = !!activeExercise?.id;
  // Режим після першого збереження нової вправи
  const isPostCreate = !!localExercise && !exerciseToEdit;

  const title = exerciseToEdit
    ? '✏️ Редагування вправи'
    : localExercise
    ? '✨ Вправа збережена!'
    : '✨ Нова вправа';

  return (
    <>
      <PopupModal isOpen={isOpen} onClose={isPostCreate ? handleDone : onClose} title={title} zIndex={zIndex}>
        <div className="space-y-4">

          {/* ===== МЕДІА-СТРІЧКА (завжди зверху) ===== */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
              Фото / Відео
            </label>

            {!hasId ? (
              /* Плейсхолдер до збереження */
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl">
                <span className="text-2xl">📷</span>
                <p className="text-xs text-gray-500">Збережіть вправу, щоб додати фото або відео</p>
              </div>
            ) : (
              /* Стрічка медіа з горизонтальним скролом */
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {media.map((m, i) => {
                  const isConfirm = confirmDeleteMedia.has(m.id);
                  return (
                    <div key={m.id} className="relative flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden group">
                      {m.media_type === 'image' ? (
                        <img
                          src={m.url}
                          alt=""
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setLightboxIdx(i)}
                        />
                      ) : (
                        <div
                          className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-3xl cursor-pointer"
                          onClick={() => setLightboxIdx(i)}
                        >
                          🎥
                          <span className="text-[9px] text-gray-500 mt-1">Відео</span>
                        </div>
                      )}
                      {/* Кнопка видалення — верхній правий кут */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMediaClick(m.id); }}
                        className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          isConfirm
                            ? 'bg-red-600 text-white scale-110'
                            : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
                        }`}
                        title={isConfirm ? 'Ще раз — видалити' : 'Видалити'}
                      >
                        ✕
                      </button>
                      {/* Overlay підтвердження */}
                      {isConfirm && (
                        <div className="absolute inset-0 bg-red-900/30 pointer-events-none" />
                      )}
                    </div>
                  );
                })}

                {/* Кнопка додавання */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="flex-shrink-0 w-28 h-28 rounded-2xl border-2 border-dashed border-slate-600 hover:border-blue-500 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-blue-400 transition"
                >
                  {uploadingMedia ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-2xl">📷</span>
                      <span className="text-[10px]">Додати</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  className="hidden"
                  onChange={handleMediaUpload}
                />
              </div>
            )}
          </div>

          {/* ===== НАЗВА ===== */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Назва вправи <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр: Присідання зі штангою"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* ===== ОПИС ===== */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Опис
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Техніка виконання, нюанси..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* ===== ТЕГИ ===== */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Теги
            </label>
            <div className="flex flex-wrap gap-2 min-h-[36px] items-center">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30"
                >
                  {tag.name}
                  <button
                    onClick={() => removeTag(tag.id)}
                    className="text-blue-400/70 hover:text-red-400 transition ml-0.5 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setIsTagPickerOpen(true)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed border-slate-600 text-gray-500 hover:border-blue-500 hover:text-blue-400 transition text-lg leading-none"
              >
                +
              </button>
            </div>
          </div>

          {/* ===== ПУБЛІЧНА ВПРАВА ===== */}
          <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-2xl cursor-pointer border border-slate-700 hover:border-slate-600 transition">
            <div
              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${isPublic ? 'bg-blue-500' : 'bg-slate-600'}`}
              onClick={() => setIsPublic(!isPublic)}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isPublic ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Публічна вправа</p>
              <p className="text-xs text-gray-500">Інші користувачі зможуть її бачити</p>
            </div>
          </label>

          {/* ===== ГОЛОВНА КНОПКА ===== */}
          {isPostCreate ? (
            /* Після збереження нової вправи — кнопка "Готово" */
            <button
              onClick={handleDone}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 transition"
            >
              ✓ Готово
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isLoading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 transition"
            >
              {isLoading
                ? '⏳ Збереження...'
                : isEdit
                ? '✓ Оновити вправу'
                : '✓ Зберегти вправу'}
            </button>
          )}

          {/* ===== ВИДАЛИТИ ВПРАВУ (тільки при редагуванні) ===== */}
          {isEdit && !isPostCreate && (
            <button
              onClick={handleDeleteExercise}
              className={`w-full py-2.5 rounded-2xl font-bold text-xs transition border ${
                confirmDeleteEx
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-transparent border-slate-700 text-gray-500 hover:border-red-800 hover:text-red-400'
              }`}
            >
              {confirmDeleteEx ? '⚠️ Натисніть ще раз для підтвердження' : '🗑 Видалити вправу'}
            </button>
          )}
        </div>
      </PopupModal>

      {/* Tag Picker */}
      <TagPickerModal
        isOpen={isTagPickerOpen}
        onClose={() => setIsTagPickerOpen(false)}
        selectedTagIds={tags.map((t) => t.id)}
        onConfirm={(newTags) => setTags(newTags)}
        zIndex={zIndex + 50}
      />

      {/* Lightbox для перегляду медіа */}
      {lightboxIdx !== null && (
        <MediaLightboxModal
          isOpen={true}
          onClose={() => setLightboxIdx(null)}
          media={media}
          initialIdx={lightboxIdx}
          zIndex={zIndex + 100}
        />
      )}
    </>
  );
};
