import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChatMessage, CurrentUser } from '../types';

interface ChatAreaProps {
  channelLabel: string;
  messages: ChatMessage[];
  currentUser: CurrentUser | null;
  onSendMessage: (text: string, imageUrl?: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onOpenProfile: (username: string, uid?: string) => void;
  onAlert: (msg: string, title?: string) => void;
  onZoomImage: (url: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channelLabel,
  messages,
  currentUser,
  onSendMessage,
  onDeleteMessage,
  onOpenProfile,
  onAlert,
  onZoomImage,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const candidateUsernames = useMemo(() => {
    const list = new Set<string>();
    messages.forEach((m) => {
      if (m.username) list.add(m.username);
    });
    return Array.from(list);
  }, [messages]);

  const lastAtMatch = inputText.match(/@([a-zA-Z0-9_.-]*)$/);
  const mentionSearchTerm = lastAtMatch ? lastAtMatch[1].toLowerCase() : null;

  const matchingUsers = useMemo(() => {
    if (mentionSearchTerm === null) return [];
    return candidateUsernames.filter((u) =>
      u.toLowerCase().startsWith(mentionSearchTerm)
    );
  }, [candidateUsernames, mentionSearchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const match = val.match(/@([a-zA-Z0-9_.-]*)$/);
    if (match) {
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const selectMention = (username: string) => {
    if (lastAtMatch) {
      const prefix = inputText.slice(0, lastAtMatch.index);
      setInputText(`${prefix}@${username} `);
    }
    setShowMentionSuggestions(false);
  };

  const renderTextWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const handle = part.slice(1).toLowerCase();
        const isMe =
          currentUser?.username &&
          handle === currentUser.username.toLowerCase();
        return (
          <span
            key={i}
            className={
              isMe
                ? 'bg-amber-400/40 text-amber-200 font-bold px-1.5 py-0.5 rounded border border-amber-400/60 inline-block my-0.5 shadow-sm'
                : 'bg-yellow-500/20 text-yellow-300 font-semibold px-1.5 py-0.5 rounded border border-yellow-500/30 inline-block my-0.5'
            }
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isTimedOut = () => {
    if (!currentUser?.timeoutUntil) return false;
    try {
      let tDate: Date;
      if (typeof currentUser.timeoutUntil?.toDate === 'function') {
        tDate = currentUser.timeoutUntil.toDate();
      } else {
        tDate = new Date(currentUser.timeoutUntil);
      }
      return tDate.getTime() > Date.now();
    } catch {
      return false;
    }
  };

  const timedOut = isTimedOut();
  const isBanned = !!currentUser?.banned;
  const isBlocked = timedOut || isBanned;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        onAlert('Please select a valid image file.', 'invalid file');
        return;
      }

      setUploadingImage(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setAttachedImage(canvas.toDataURL('image/jpeg', 0.85));
          }
          setUploadingImage(false);
        };
        img.onerror = () => {
          setUploadingImage(false);
          onAlert('Failed to load image', 'error');
        };
      };
      reader.onerror = () => {
        setUploadingImage(false);
        onAlert('Failed to read image file', 'error');
      };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text && !attachedImage) return;

    if (timedOut) {
      onAlert('You are currently on timeout and cannot send messages.', 'timed out');
      return;
    }

    if (isBanned) {
      onAlert('You are banned from sending messages in chat.', 'banned');
      return;
    }

    onSendMessage(text, attachedImage || undefined);
    setInputText('');
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#000000] h-full overflow-hidden">
      <div className="p-5 px-6 border-b border-[#1c1c21] flex items-center justify-between bg-[#000000] shrink-0">
        <span className="font-bold text-lg text-white lowercase tracking-tight">
          {channelLabel}
        </span>
      </div>

      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-[#000000]">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[#52525b]">
            no messages here yet. start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isSentByMe = currentUser && msg.uid === currentUser.uid;
            const avatarUrl =
              msg.avatar ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.username}`;

            const isMentioned =
              !!currentUser?.username &&
              !isSentByMe &&
              !!msg.text &&
              msg.text
                .toLowerCase()
                .includes(`@${currentUser.username.toLowerCase()}`);

            return (
              <div
                key={msg.id}
                className={`group flex gap-2.5 max-w-[80%] relative items-end ${
                  isSentByMe ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                <div className="relative group/avatar">
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    onClick={() => onOpenProfile(msg.username, msg.uid)}
                    title={`View @${msg.username}'s profile`}
                    className="w-8 h-8 rounded-full object-cover bg-[#27272a] border border-[#3f3f46] shrink-0 cursor-pointer hover:border-[#71717a] transition-all"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoomImage(avatarUrl);
                    }}
                    title="Zoom Avatar"
                    className="absolute -top-1 -right-1 opacity-0 group-hover/avatar:opacity-100 bg-[#18181c] text-white text-[9px] p-0.5 px-1 rounded-full border border-[#3f3f46] shadow transition-all cursor-pointer"
                  >
                    🔍
                  </button>
                </div>

                <div
                  className={`flex flex-col ${
                    isSentByMe ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      onClick={() => onOpenProfile(msg.username, msg.uid)}
                      title={`View @${msg.username}'s profile`}
                      className="text-[0.7rem] text-[#52525b] hover:text-[#a1a1aa] font-medium lowercase cursor-pointer"
                    >
                      {isSentByMe ? 'you' : msg.username || 'anonymous'}
                    </span>
                  </div>

                  {isMentioned && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 w-fit mb-1 shadow-sm">
                      <span>🔔</span> You were mentioned
                    </div>
                  )}

                  <div
                    className={`flex flex-col gap-2 p-3.5 px-4 rounded-[20px] text-sm leading-relaxed break-words transition-all ${
                      isMentioned
                        ? 'bg-[#3f3200] text-amber-100 border-2 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] rounded-bl-[4px]'
                        : isSentByMe
                        ? 'bg-[#27272a] text-white border border-[#3f3f46] rounded-br-[4px]'
                        : 'bg-[#18181c] text-[#d4d4d8] border border-[#232328] rounded-bl-[4px]'
                    }`}
                  >
                    {msg.text && (
                      <div>{renderTextWithMentions(msg.text)}</div>
                    )}

                    {msg.imageUrl && (
                      <div className="relative group/img overflow-hidden rounded-xl mt-1 border border-[#3f3f46]/50 max-w-[320px]">
                        <img
                          src={msg.imageUrl}
                          alt="attached"
                          onClick={() => onZoomImage(msg.imageUrl!)}
                          className="w-full max-h-[260px] object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                        />
                        <div
                          onClick={() => onZoomImage(msg.imageUrl!)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[2px] transition-opacity cursor-zoom-in"
                        >
                          <span>🔍 Click to zoom in</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {currentUser?.isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage(msg.id)}
                    title="Delete Message"
                    className="opacity-0 group-hover:opacity-100 transition-all text-[#f43f5e] hover:text-[#fb7185] hover:scale-110 p-1.5 mb-1 cursor-pointer bg-transparent border-0"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-[#1c1c21] flex flex-col gap-2 bg-[#000000] shrink-0 relative"
      >
        {showMentionSuggestions && matchingUsers.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 bg-[#141418] border border-[#27272a] rounded-xl shadow-2xl p-1.5 max-h-48 overflow-y-auto z-50 flex flex-col min-w-[200px]">
            <div className="text-[10px] font-bold text-[#71717a] uppercase px-2.5 py-1 tracking-wider">
              Mention Member
            </div>
            {matchingUsers.map((user) => (
              <button
                key={user}
                type="button"
                onClick={() => selectMention(user)}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#27272a] text-white text-xs rounded-lg transition-colors text-left cursor-pointer"
              >
                <img
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user}`}
                  alt="pfp"
                  className="w-5 h-5 rounded-full object-cover bg-[#27272a]"
                />
                <span className="font-semibold">@{user}</span>
              </button>
            ))}
          </div>
        )}

        {attachedImage && (
          <div className="flex items-center gap-3 bg-[#141418] border border-[#27272a] p-2 px-3 rounded-xl w-fit">
            <div className="relative group/attached">
              <img
                src={attachedImage}
                alt="preview attachment"
                onClick={() => onZoomImage(attachedImage)}
                className="w-12 h-12 object-cover rounded-lg border border-[#3f3f46] cursor-zoom-in"
              />
              <div
                onClick={() => onZoomImage(attachedImage)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover/attached:opacity-100 flex items-center justify-center text-[10px] text-white cursor-zoom-in"
              >
                🔍
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-white">Image attached</span>
              <span className="text-[10px] text-[#71717a]">Click image to preview zoom</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="ml-2 text-xs text-[#f43f5e] hover:text-[#fb7185] font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2.5 items-center">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBlocked || uploadingImage}
            title="Attach Image"
            className="p-3 bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {uploadingImage ? (
              <span className="animate-spin text-xs">⌛</span>
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            )}
          </button>

          <div className="flex-1 flex">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              disabled={isBlocked}
              placeholder={
                timedOut
                  ? 'you are on timeout...'
                  : isBanned
                  ? 'you are banned from typing in chat...'
                  : 'type a message or @mention someone...'
              }
              autoComplete="off"
              className="w-full px-5 py-3.5 bg-[#18181c] border border-[#27272a] focus:border-[#3f3f46] rounded-full text-sm text-white outline-none placeholder-[#52525b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isBlocked || (!inputText.trim() && !attachedImage)}
            className="px-5 bg-[#1f1f24] hover:bg-[#27272a] border border-[#2d2d35] hover:border-[#3f3f46] text-white rounded-full font-semibold text-sm cursor-pointer transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </form>
    </div>
  );
};

