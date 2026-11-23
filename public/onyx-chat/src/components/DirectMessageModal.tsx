import React, { useState } from 'react';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDM: (targetUsername: string) => void;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  onStartDM,
}) => {
  const [target, setTarget] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = target.trim().toLowerCase();
    if (clean) {
      onStartDM(clean);
      setTarget('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141418] border border-[#27272a] p-8 rounded-[20px] w-full max-w-[380px] text-center shadow-2xl">
        <h2 className="text-2xl font-extrabold tracking-tight mb-1 text-white lowercase">
          direct message
        </h2>
        <p className="text-xs text-[#71717a] mb-5">
          enter recipient's username
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="username..."
            maxLength={15}
            required
            autoFocus
            className="w-full px-4 py-3 bg-[#0b0b0e] border border-[#27272a] focus:border-[#52525b] rounded-xl text-white text-sm outline-none transition-colors"
          />

          <button
            type="submit"
            className="w-full py-3 bg-[#1f1f24] hover:bg-[#27272a] border border-[#27272a] hover:border-[#3f3f46] text-white rounded-xl font-semibold text-sm transition-all mt-1 cursor-pointer"
          >
            start chat
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-transparent text-[#71717a] hover:text-[#a1a1aa] text-xs transition-colors cursor-pointer"
          >
            cancel
          </button>
        </form>
      </div>
    </div>
  );
};
