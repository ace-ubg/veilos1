import React from 'react';
import { CurrentUser } from '../types';

interface SidebarProps {
  activeChannel: string;
  onSelectChannel: (channelKey: string, displayName?: string) => void;
  dms: string[];
  onOpenDMModal: () => void;
  currentUser: CurrentUser | null;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
  onOpenFriendRequests?: () => void;
  onLogout: () => void;
  onOpenProfile: (username: string, uid?: string) => void;
}

const PUBLIC_CHANNELS = [
  { id: 'general', label: '# general' },
  { id: 'lounge', label: '# lounge' },
  { id: 'tech', label: '# tech' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeChannel,
  onSelectChannel,
  dms,
  onOpenDMModal,
  currentUser,
  onOpenAdmin,
  onOpenSettings,
  onOpenFriendRequests,
  onLogout,
  onOpenProfile,
}) => {
  const pendingCount = currentUser?.friendRequestsIncoming?.length || 0;

  return (
    <div className="w-60 bg-[#000000] border-r border-[#1c1c21] flex flex-col p-5 pr-4 shrink-0 h-full">
      <div className="font-extrabold text-xl tracking-tight text-white lowercase mb-6 pl-2">
        onyx
      </div>

      <div className="text-[0.7rem] font-bold text-[#52525b] uppercase tracking-wider mb-2 pl-2">
        channels
      </div>
      <div className="flex flex-col gap-1 mb-5">
        {PUBLIC_CHANNELS.map((ch) => {
          const isActive = activeChannel === ch.id;
          return (
            <div
              key={ch.id}
              onClick={() => onSelectChannel(ch.id, ch.label)}
              className={`p-2.5 px-3 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between ${
                isActive
                  ? 'bg-[#1f1f24] text-white font-semibold'
                  : 'text-[#71717a] hover:bg-[#18181c] hover:text-[#d4d4d8]'
              }`}
            >
              {ch.label}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-2 pl-2">
        <span className="text-[0.7rem] font-bold text-[#52525b] uppercase tracking-wider">
          direct messages
        </span>
        <button
          type="button"
          onClick={onOpenDMModal}
          className="text-sm text-[#71717a] hover:text-white cursor-pointer transition-colors bg-transparent border-0 p-0"
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-1 mb-5 max-h-[160px] overflow-y-auto pr-1">
        {dms.length === 0 ? (
          <div className="text-[0.75rem] text-[#52525b] pl-2 py-1">no active dms</div>
        ) : (
          dms.map((targetUser) => {
            const roomId = currentUser
              ? [currentUser.username.toLowerCase(), targetUser.toLowerCase()].sort().join('_')
              : targetUser;
            const channelKey = `dm:${roomId}`;
            const isActive = activeChannel === channelKey;

            return (
              <div
                key={targetUser}
                onClick={() => onSelectChannel(channelKey, `@ ${targetUser}`)}
                className={`p-2.5 px-3 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between truncate ${
                  isActive
                    ? 'bg-[#1f1f24] text-white font-semibold'
                    : 'text-[#71717a] hover:bg-[#18181c] hover:text-[#d4d4d8]'
                }`}
              >
                @ {targetUser}
              </div>
            );
          })
        )}
      </div>

      {currentUser && (
        <div className="mt-auto pt-4 border-t border-[#1c1c21] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div
              onClick={() => onOpenProfile(currentUser.username, currentUser.uid)}
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
            >
              <img
                src={currentUser.photoURL}
                alt="pfp"
                className="w-8 h-8 rounded-full object-cover bg-[#27272a] border border-[#3f3f46] shrink-0"
              />
              <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                {currentUser.username}
              </span>
              {currentUser.isAdmin && (
                <span className="bg-[#3b82f6] text-white text-[0.6rem] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                  admin
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {currentUser.isAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="flex-1 bg-[#172554] border border-[#1e3a8a] text-[#60a5fa] hover:bg-[#1e40af] hover:text-white text-[0.72rem] font-semibold py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap"
              >
                admin panel
              </button>
            )}
            <button
              type="button"
              onClick={onOpenFriendRequests}
              className={`flex-1 border text-[0.72rem] font-semibold py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap flex items-center justify-center gap-1 ${
                pendingCount > 0
                  ? 'bg-[#064e3b] border-[#059669] text-[#34d399] hover:bg-[#047857] hover:text-white font-bold'
                  : 'bg-[#18181c] border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
              }`}
            >
              requests {pendingCount > 0 && <span className="bg-[#10b981] text-black rounded-full px-1.5 py-0.2 text-[0.65rem] font-extrabold">{pendingCount}</span>}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex-1 bg-[#18181c] border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] text-[0.72rem] font-semibold py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap"
            >
              edit profile
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="bg-[#18181c] border border-[#27272a] text-[#a1a1aa] hover:text-[#f43f5e] hover:bg-[#201216] hover:border-[#3f1d24] text-[0.72rem] font-semibold py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap"
            >
              logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
