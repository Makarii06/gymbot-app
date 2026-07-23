import React, { useState, useRef } from 'react';

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: any[];           // [{id, url, media_type}]
  initialIdx?: number;
  zIndex?: number;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  media,
  initialIdx = 0,
  zIndex = 1000,
}) => {
  const [idx, setIdx] = useState(initialIdx);
  const touchStartX = useRef<number | null>(null);

  if (!isOpen || media.length === 0) return null;

  const current = media[Math.min(idx, media.length - 1)];

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(media.length - 1, i + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3">
        <span className="text-sm text-gray-400">
          {idx + 1} / {media.length}
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-lg hover:bg-white/20 transition"
        >
          ✕
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {current.media_type === 'image' ? (
          <img
            src={current.url}
            alt=""
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        ) : (
          <video
            src={current.url}
            controls
            autoPlay
            className="max-w-full max-h-full"
          />
        )}

        {/* Left / Right arrows (for non-touch) */}
        {idx > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
          >
            ‹
          </button>
        )}
        {idx < media.length - 1 && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
          >
            ›
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {media.length > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-1.5 py-3">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition ${
                i === idx ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
