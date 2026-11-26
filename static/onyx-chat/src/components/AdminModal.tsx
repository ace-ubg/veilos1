import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, CurrentUser } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onSelectUser: (username: string, uid: string) => void;
  onAlert: (msg: string, title?: string) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onAlert,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'commands'>('users');

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    onConfirm: () => {},
  });
  const [promptValue, setPromptValue] = useState('');

  const openPromptModal = (config: {
    title: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    onConfirm: (val: string) => void;
  }) => {
    setPromptValue(config.defaultValue || '');
    setPromptState({
      isOpen: true,
      title: config.title,
      description: config.description,
      defaultValue: config.defaultValue,
      placeholder: config.placeholder,
      confirmText: config.confirmText || 'Assign Role',
      onConfirm: config.onConfirm,
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setActiveTab('users');
    }
  }, [isOpen]);

  async function loadUsers() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        list.push({
          ...data,
          uid: data.uid || docSnap.id,
        });
      });
      setUsers(list);
    } catch (err: any) {
      onAlert('Error loading users: ' + err.message, 'admin error');
    } finally {
      setLoading(false);
    }
  }

  async function giveRoleToUser(targetUser: UserProfile) {
    openPromptModal({
      title: '👑 assign user role',
      description: `Enter role to grant to @${targetUser.username}\n(e.g. admin, moderator, owner, developer, plus, vip, trusted, beta tester)`,
      defaultValue: 'admin',
      placeholder: 'Role name...',
      confirmText: 'Assign Role',
      onConfirm: async (inputRole) => {
        if (!inputRole || !inputRole.trim()) return;
        const cleanRole = inputRole.trim().toLowerCase();
        const currentRoles = Array.isArray(targetUser.roles) && targetUser.roles.length > 0
          ? [...targetUser.roles]
          : [targetUser.role || 'beta tester'];

        if (!currentRoles.map((r) => r.toLowerCase()).includes(cleanRole)) {
          currentRoles.push(cleanRole);
        }
        const primaryRole = currentRoles[0] || cleanRole;

        try {
          await setDoc(doc(db, 'users', targetUser.uid), { roles: currentRoles, role: primaryRole }, { merge: true });
          onAlert(`👑 Role "${cleanRole}" granted to @${targetUser.username}!`, 'role assigned');
          loadUsers();
        } catch (err: any) {
          onAlert('Error assigning role: ' + err.message, 'admin error');
        }
      },
    });
  }

  async function toggleBan(targetUid: string, currentBanned: boolean) {
    try {
      await setDoc(doc(db, 'users', targetUid), { banned: !currentBanned }, { merge: true });
      loadUsers();
    } catch (err: any) {
      onAlert('Error updating ban status: ' + err.message, 'admin error');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141418] border border-[#27272a] p-6 sm:p-8 rounded-[20px] w-full max-w-[480px] text-center shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-white lowercase">
            admin panel
          </h2>
          <div className="flex gap-1.5 bg-[#0b0b0e] p-1 rounded-xl border border-[#27272a]">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[#27272a] text-white'
                  : 'text-[#a1a1aa] hover:text-white'
              }`}
            >
              👥 Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('commands')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'commands'
                  ? 'bg-[#854d0e] text-[#fef08a]'
                  : 'text-[#facc15] hover:bg-[#2a1b08]'
              }`}
            >
              ⚡ Commands
            </button>
          </div>
        </div>
        <p className="text-xs text-[#71717a] mb-5 text-left">
          {activeTab === 'users'
            ? 'manage users, permissions, and roles'
            : 'valid admin chat slash commands and shortcuts'}
        </p>

        {activeTab === 'users' ? (
          <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto mb-5 text-left pr-1">
            {loading ? (
              <p className="text-xs text-[#71717a]">loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-[#71717a]">no registered users found</p>
            ) : (
              users.map((u) => {
                const adminRoles = ['admin', 'owner', 'developer', 'moderator'];
                const uRole = u.role ? u.role.toLowerCase() : '';
                const uRoles = Array.isArray(u.roles) ? u.roles.map((r: string) => r.toLowerCase()) : [];
                const isAdmin = adminRoles.includes(uRole) || uRoles.some((r: string) => adminRoles.includes(r));
                const isBanned = u.banned === true;
                const isMe = currentUser && u.uid === currentUser.uid;

                return (
                  <div
                    key={u.uid}
                    className="flex items-center justify-between bg-[#0b0b0e] p-2.5 px-3.5 rounded-xl border border-[#27272a]"
                  >
                    <div
                      onClick={() => {
                        onClose();
                        onSelectUser(u.username, u.uid);
                      }}
                      className="flex items-center gap-2.5 overflow-hidden cursor-pointer flex-1"
                    >
                      <img
                        src={u.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover bg-[#27272a] border border-[#3f3f46] shrink-0"
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-semibold text-white truncate">
                          @{u.username}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(u.roles || [u.role || 'beta tester']).slice(0, 3).map((r, idx) => (
                            <span key={idx} className="text-[0.62rem] bg-[#18181c] border border-[#27272a] text-[#a1a1aa] px-1.5 py-0.2 rounded font-mono">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => giveRoleToUser(u)}
                        className="px-2 py-1 rounded-lg text-[0.72rem] font-bold cursor-pointer border transition-all bg-[#1e1b2e] border-[#4c1d95] text-[#a78bfa] hover:bg-[#4c1d95] hover:text-white"
                        title="Give or assign role"
                      >
                        + Role
                      </button>

                      {!isMe && !isAdmin && (
                        <button
                          type="button"
                          onClick={() => toggleBan(u.uid, isBanned)}
                          className={`px-2.5 py-1 rounded-lg text-[0.72rem] font-semibold cursor-pointer border transition-all ${
                            isBanned
                              ? 'bg-[#122017] border-[#1d3f27] text-[#22c55e] hover:bg-[#22c55e] hover:text-white'
                              : 'bg-[#201216] border-[#3f1d24] text-[#f43f5e] hover:bg-[#f43f5e] hover:text-white'
                          }`}
                        >
                          {isBanned ? 'unban' : 'ban'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto mb-5 text-left pr-1">
            <div className="bg-[#0b0b0e] border border-[#27272a] p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#facc15] font-mono">⚡ /flash @username [target]</span>
                <span className="text-[0.65rem] bg-[#2a1b08] text-[#fef08a] px-2 py-0.5 rounded font-semibold">Redirect</span>
              </div>
              <p className="text-[0.72rem] text-[#a1a1aa] mb-2">
                Forces a real-time fullscreen redirect overlay on the targeted user.
              </p>
              <div className="text-[0.68rem] bg-[#141418] border border-[#27272a] p-2 rounded-lg font-mono text-[#e4e4e7] space-y-1">
                <div><span className="text-[#facc15]">Shortcuts:</span> 1=ph, 2=xv, 3=r34, 4=tssf, 5=yp</div>
                <div className="text-[#a1a1aa]">Example: <code className="text-white">/flash @john 1</code></div>
                <div className="text-[#a1a1aa]">Example: <code className="text-white">/flash @john https://youtube.com</code></div>
              </div>
            </div>

            <div className="bg-[#0b0b0e] border border-[#27272a] p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#a78bfa] font-mono">👑 /giverole @username &lt;role&gt;</span>
                <span className="text-[0.65rem] bg-[#1e1b2e] text-[#c4b5fd] px-2 py-0.5 rounded font-semibold">Grant Role</span>
              </div>
              <p className="text-[0.72rem] text-[#a1a1aa] mb-2">
                Appends a new role tag to the target user (e.g. admin, moderator, owner, developer, vip).
              </p>
              <div className="text-[0.68rem] bg-[#141418] border border-[#27272a] p-2 rounded-lg font-mono text-[#e4e4e7]">
                <div className="text-[#a1a1aa]">Example: <code className="text-white">/giverole @alex admin</code></div>
                <div className="text-[#a1a1aa]">Alias: <code className="text-white">/addrole @alex moderator</code></div>
              </div>
            </div>

            <div className="bg-[#0b0b0e] border border-[#27272a] p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#f43f5e] font-mono">❌ /removerole @username &lt;role&gt;</span>
                <span className="text-[0.65rem] bg-[#3f1d24] text-[#fca5a5] px-2 py-0.5 rounded font-semibold">Strip Role</span>
              </div>
              <p className="text-[0.72rem] text-[#a1a1aa] mb-2">
                Removes a specific role tag from the specified user.
              </p>
              <div className="text-[0.68rem] bg-[#141418] border border-[#27272a] p-2 rounded-lg font-mono text-[#e4e4e7]">
                <div className="text-[#a1a1aa]">Example: <code className="text-white">/removerole @alex moderator</code></div>
              </div>
            </div>

            <div className="bg-[#0b0b0e] border border-[#27272a] p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#38bdf8] font-mono">🛠️ /role @username [add|remove|set] &lt;role&gt;</span>
                <span className="text-[0.65rem] bg-[#0c4a6e] text-[#bae6fd] px-2 py-0.5 rounded font-semibold">Role Manager</span>
              </div>
              <p className="text-[0.72rem] text-[#a1a1aa] mb-2">
                Full control role command. Use <code className="text-white">set</code> to replace all roles.
              </p>
              <div className="text-[0.68rem] bg-[#141418] border border-[#27272a] p-2 rounded-lg font-mono text-[#e4e4e7]">
                <div className="text-[#a1a1aa]">Example: <code className="text-white">/role @alex set developer</code></div>
              </div>
            </div>

            <div className="bg-[#0b0b0e] border border-[#27272a] p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#34d399] font-mono">⚙️ Profile UI Actions</span>
                <span className="text-[0.65rem] bg-[#064e3b] text-[#a7f3d0] px-2 py-0.5 rounded font-semibold">User Modal</span>
              </div>
              <p className="text-[0.72rem] text-[#a1a1aa]">
                Clicking any user profile opens direct button actions:
                <br />
                <span className="text-white font-semibold">• 👑 Give / Assign Role</span>
                <br />
                <span className="text-white font-semibold">• ⚡ Flash User (Redirect)</span>
                <br />
                <span className="text-white font-semibold">• 🚫 Ban / Unban User</span>
                <br />
                <span className="text-white font-semibold">• 💀 Terminate Account</span>
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-transparent text-[#71717a] hover:text-[#a1a1aa] font-semibold text-xs transition-colors cursor-pointer"
        >
          close panel
        </button>
      </div>

      {promptState.isOpen && (
        <div className="fixed inset-0 z-[2500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-[#27272a] rounded-[20px] p-6 w-full max-w-[360px] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold tracking-tight mb-1 text-white lowercase">
              {promptState.title}
            </h3>
            {promptState.description && (
              <p className="text-xs text-[#a1a1aa] mb-4 whitespace-pre-line leading-relaxed">
                {promptState.description}
              </p>
            )}
            <input
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const fn = promptState.onConfirm;
                  setPromptState((prev) => ({ ...prev, isOpen: false }));
                  fn(promptValue);
                }
              }}
              placeholder={promptState.placeholder || ''}
              autoFocus
              className="w-full bg-[#0b0b0e] border border-[#27272a] text-white px-3.5 py-2.5 rounded-xl text-sm mb-4 font-mono focus:outline-none focus:border-[#52525b]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPromptState((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = promptState.onConfirm;
                  setPromptState((prev) => ({ ...prev, isOpen: false }));
                  fn(promptValue);
                }}
                className="flex-1 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {promptState.confirmText || 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
