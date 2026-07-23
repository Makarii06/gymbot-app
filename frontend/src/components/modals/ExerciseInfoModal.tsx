import React, { useState, useRef } from 'react';
import { FullscreenModal } from './FullscreenModal';
import { MediaLightboxModal } from './MediaLightboxModal';

interface ExerciseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: any | null;
  zIndex?: number;
  // Для режиму "вибір вправи" — кнопка Toggle Select внизу
  onToggleSelect?: () => void;
  isSelected?: boolean;
  // Для публічних чужих вправ — кнопка збереження
  allowSave?: boolean;
  onSaveToMyList?: (exercise: any) => void;
}

export const ExerciseInfoModal: React.FC<ExerciseInfoModalProps> = ({
  isOpen,
  onClose,
  exercise,
  zIndex = 400,
  onToggleSelect,
  isSelected = false,
  allowSave = false,
  onSaveToMyList,
}) => {
  const [mediaIdx, setMediaIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  if (!exercise) return null;

  const media: any[] = exercise.media || [];
  const tags: any[] = exercise.tags || [];
  const muscles: any[] = exercise.muscles || [];

  const safeIdx = Math.min(mediaIdx, Math.max(0, media.length - 1));
  const currentMedia = media[safeIdx] || null;

  const prev = () => setMediaIdx((i) => Math.max(0, i - 1));
  const next = () => setMediaIdx((i) => Math.min(media.length - 1, i + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    // Ігноруємо якщо більше вертикальний скрол
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      dx > 0 ? next() : prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <>
      <FullscreenModal
        isOpen={isOpen}
        onClose={onClose}
        title={exercise.name}
        zIndex={zIndex}
      >
        <div className="pb-8">
          {/* ===== МЕДІА КАРУСЕЛЬ ===== */}
          <div className="bg-slate-950 relative overflow-hidden">
            {media.length > 0 ? (
              <>
                {/* Основний контейнер зображення */}
                <div
                  className="relative w-full"
                  style={{ aspectRatio: '4/3' }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Слайди */}
                  <div
                    className="flex h-full transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${safeIdx * 100}%)` }}
                  >
                    {media.map((m: any, i: number) => (
                      <div
                        key={m.id}
                        className="flex-shrink-0 w-full h-full bg-slate-950 flex items-center justify-center cursor-pointer"
                        onClick={() => { setMediaIdx(i); setLightboxOpen(true); }}
                      >
                        {m.media_type === 'image' ? (
                          <img
                            src={m.url}
                            alt={exercise.name}
                            className="w-full h-full object-contain select-none"
                            draggable={false}
                          />
                        ) : (
                          <video
                            src={m.url}
                            className="w-full h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                            controls
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Стрілки навігації */}
                  {safeIdx > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); prev(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-lg hover:bg-black/70 transition"
                    >
                      ‹
                    </button>
                  )}
                  {safeIdx < media.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); next(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-lg hover:bg-black/70 transition"
                    >
                      ›
                    </button>
                  )}

                  {/* Кількість медіа */}
                  {media.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {safeIdx + 1}/{media.length}
                    </div>
                  )}
                </div>

                {/* Мініатюри (якщо більше 1) */}
                {media.length > 1 && (
                  <div className="flex gap-1.5 justify-center py-2 px-3 bg-slate-950">
                    {media.map((m: any, i: number) => (
                      <button
                        key={m.id}
                        onClick={() => setMediaIdx(i)}
                        className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 transition ${
                          i === safeIdx ? 'ring-2 ring-blue-500 opacity-100' : 'opacity-40 hover:opacity-60'
                        }`}
                      >
                        {m.media_type === 'image' ? (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-700 flex items-center justify-center text-xs">🎥</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Заглушка якщо немає медіа */
              <div
                className="w-full bg-slate-950 flex items-center justify-center"
                style={{ aspectRatio: '4/3' }}
              >
                <span className="text-7xl opacity-20">💪</span>
              </div>
            )}
          </div>

          {/* ===== ТЕКСТОВИЙ КОНТЕНТ ===== */}
          <div className="p-4 space-y-4">
            {/* Опис */}
            {exercise.description && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Опис
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {exercise.description}
                </p>
              </div>
            )}

            {/* Теги */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Теги
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="px-2.5 py-1 bg-blue-500/15 text-blue-400 text-xs rounded-full border border-blue-500/20"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Групи м'язів */}
            {muscles.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Групи м'язів
                </h3>
                <div className="flex flex-wrap gap-2">
                  {muscles.map((m: any) => (
                    <span
                      key={m.id}
                      className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20"
                    >
                      {m.muscle_group?.name || '—'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Публічна/приватна */}
            <div className="flex items-center gap-2">
              <span className={`text-[11px] px-2.5 py-1 rounded-full border ${
                exercise.is_public
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-800 text-gray-500 border-slate-700'
              }`}>
                {exercise.is_public ? '🌐 Публічна' : '🔒 Приватна'}
              </span>
            </div>

            {/* ===== КНОПКИ ДІЙ ===== */}

            {/* Виділити/Зняти виділення (у режимі вибору) */}
            {onToggleSelect && (
              <button
                onClick={onToggleSelect}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition ${
                  isSelected
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                {isSelected ? '✓ Вибрано — зняти виділення' : 'Виділити вправу'}
              </button>
            )}

            {/* Зберегти собі (для публічних чужих вправ) */}
            {allowSave && onSaveToMyList && (
              <button
                onClick={() => onSaveToMyList(exercise)}
                className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-700 hover:bg-emerald-600 transition"
              >
                ⬇️ Зберегти до свого каталогу
              </button>
            )}
          </div>
        </div>
      </FullscreenModal>

      {/* Lightbox */}
      {lightboxOpen && (
        <MediaLightboxModal
          isOpen={true}
          onClose={() => setLightboxOpen(false)}
          media={media}
          initialIdx={safeIdx}
          zIndex={zIndex + 50}
        />
      )}
    </>
  );
};
