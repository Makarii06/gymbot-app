import React from 'react';

interface PopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  zIndex?: number;
}

export const PopupModal: React.FC<PopupModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  zIndex = 150,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end justify-center p-0 backdrop-blur-sm"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/50 rounded-t-3xl w-full max-w-md p-6 text-white space-y-4 shadow-2xl"
        style={{ animation: 'slideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-base text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
