import React from 'react';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  zIndex?: number;
  headerCenter?: React.ReactNode;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  zIndex = 100,
  headerCenter,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950 flex flex-col text-white"
      style={{ zIndex }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800 flex items-center bg-slate-950">
        <h2 className="font-bold text-base tracking-wide truncate flex-1">{title}</h2>
        {headerCenter && <div className="flex-shrink-0 mx-2">{headerCenter}</div>}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 transition flex-shrink-0 ml-2"
          aria-label="Закрити"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-950 pb-24">
        {children}
      </div>
    </div>
  );
};
