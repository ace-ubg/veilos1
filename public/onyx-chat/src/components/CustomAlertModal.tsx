import React from 'react';

interface CustomAlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  isOpen,
  title = 'notice',
  message,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141418] border border-[#27272a] rounded-[20px] p-8 w-full max-w-[340px] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-extrabold tracking-tight mb-1.5 text-white lowercase">
          {title}
        </h2>
        <p className="text-sm text-slate-300 mb-5 leading-relaxed break-words">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-[#1f1f24] hover:bg-[#27272a] border border-[#27272a] hover:border-[#3f3f46] text-white rounded-xl font-semibold text-sm transition-all cursor-pointer"
        >
          ok
        </button>
      </div>
    </div>
  );
};
