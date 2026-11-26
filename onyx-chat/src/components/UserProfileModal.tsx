import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { CurrentUser, UserProfile } from '../types';
import { findUserDocByUsername, sanitizeFlashUrl } from '../lib/userUtils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUsername: string | null;
  targetUid: string | null;
  currentUser: CurrentUser | null;
  onStartDM: (username: string) => void;
  onAlert: (msg: string, title?: string) => void;
  onZoomImage?: (url: string) => void;
}

const ALL_ROLES = ['owner', 'developer', 'admin', 'moderator', 'flasher', 'plus', 'beta tester'];

function parseSafeDate(raw: any): Date {
  if (!raw) return new Date(0);
  try {
    if (typeof raw.toDate === 'function') {
      return raw.toDate();
    }
    if (raw.seconds !== undefined) {
      return new Date(raw.seconds * 1000);
    }
    if (raw instanceof Date) {
      return raw;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date(0) : d;
  } catch {
    return new Date(0);
  }
}

function formatJoinedDate(rawCreatedAt: any, fallbackJoined: string = 'Jul 26, 2026'): string {
  if (!rawCreatedAt) return fallbackJoined;
  try {
    const d = parseSafeDate(rawCreatedAt);
    if (d.getTime() === 0) return fallbackJoined;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return fallbackJoined;
  }
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUsername,
  targetUid,
  currentUser,
  onStartDM,
  onAlert,
  onZoomImage,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const isFlasher = currentUser?.role?.toLowerCase() === 'flasher' || 
    (Array.isArray(currentUser?.roles) && currentUser.roles.map(r => r.toLowerCase()).includes('flasher'));
  const hasFlashPermission = !!(currentUser?.isAdmin || isFlasher);

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    isConfirmOnly?: boolean;
    isDanger?: boolean;
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
    isConfirmOnly?: boolean;
    isDanger?: boolean;
    onConfirm: (val: string) => void;
  }) => {
    setPromptValue(config.defaultValue || '');
    setPromptState({
      isOpen: true,
      title: config.title,
      description: config.description,
      defaultValue: config.defaultValue,
      placeholder: config.placeholder,
      confirmText: config.confirmText || 'Confirm',
      isConfirmOnly: config.isConfirmOnly || false,
      isDanger: config.isDanger || false,
      onConfirm: config.onConfirm,
    });
  };

  useEffect(() => {
    if (isOpen && (targetUsername || targetUid)) {
      fetchUserProfile();
    }
  }, [isOpen, targetUsername, targetUid]);

  async function fetchUserProfile() {
    setLoading(true);
    let targetData: UserProfile | null = null;
    let resolvedDocId: string | null = null;

    try {
      if (targetUid && !targetUid.startsWith('id_')) {
        const snap = await getDoc(doc(db, 'users', targetUid));
        if (snap.exists()) {
          targetData = snap.data() as UserProfile;
          resolvedDocId = snap.id;
          if (!targetData.uid) targetData.uid = snap.id;
        }
      }

      if (!targetData && targetUsername) {
        const found = await findUserDocByUsername(targetUsername);
        if (found) {
          targetData = found.data as UserProfile;
          resolvedDocId = found.id;
          targetData.uid = found.id;
        }
      }
    } catch (e) {
      console.error('Error fetching user profile:', e);
    }

    const fallbackUsername = targetUsername ? targetUsername.toLowerCase() : 'user';

    if (!targetData) {
      targetData = {
        uid: resolvedDocId || targetUid || `id_${fallbackUsername}`,
        username: fallbackUsername,
        photoURL: `https://api.dicebear.com/7.x/identicon/svg?seed=${fallbackUsername}`,
        accountNumber: 11,
        joinedDate: 'Jul 26, 2026',
        views: 0,
        role: 'beta tester',
        roles: ['beta tester'],
        status: 'On a profile',
        bio: 'No bio set yet.',
        tags: ['beta tester'],
        banned: false,
        ipBanned: false,
        hardwareBanned: false,
        friends: [],
        friendRequestsIncoming: [],
      };
    } else {
      if (!targetData.accountNumber) targetData.accountNumber = Math.floor(Math.random() * 89) + 10;
      targetData.joinedDate = formatJoinedDate(targetData.createdAt, targetData.joinedDate || 'Jul 26, 2026');
      if (typeof targetData.views !== 'number') targetData.views = 0;
      if (!targetData.roles || !Array.isArray(targetData.roles) || targetData.roles.length === 0) {
        targetData.roles = targetData.role ? [targetData.role] : ['beta tester'];
      }
      if (!targetData.bio) {
        targetData.bio = 'No bio set yet.';
      }
      if (!targetData.tags || !Array.isArray(targetData.tags)) {
        targetData.tags = ['beta tester'];
      }
      if (!targetData.status) targetData.status = 'On a profile';
      if (!targetData.friendRequestsIncoming || !Array.isArray(targetData.friendRequestsIncoming)) {
        targetData.friendRequestsIncoming = [];
      }
      if (!targetData.friends || !Array.isArray(targetData.friends)) {
        targetData.friends = [];
      }
    }

    targetData.views = (targetData.views || 0) + 1;
    if (targetData.uid) {
      try {
        await setDoc(doc(db, 'users', targetData.uid), { views: targetData.views }, { merge: true });
      } catch (e) {}
    }

    if (targetData && targetData.uid && !targetData.uid.startsWith('id_') && targetData.uid !== 'fallback_uid' && targetData.joinNumber === undefined) {
      try {
        const { getDocs, collection } = await import('firebase/firestore');
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            createdAt: parseSafeDate(d.createdAt),
            joinedDate: d.joinedDate || '',
            username: d.username || ''
          };
        });

        usersList.sort((a, b) => {
          const diff = a.createdAt.getTime() - b.createdAt.getTime();
          if (diff !== 0) return diff;
          return a.username.localeCompare(b.username);
        });

        const index = usersList.findIndex(u => u.id === targetData!.uid);
        if (index !== -1) {
          targetData.joinNumber = index + 1;
          await setDoc(doc(db, 'users', targetData.uid), { joinNumber: targetData.joinNumber }, { merge: true });
        }
      } catch (e) {
        console.error('Error auto-calculating join number:', e);
      }
    }

    setUserProfile(targetData);
    setLoading(false);
  }

  if (!isOpen) return null;

  const handleAddCustomRole = () => {
    if (!userProfile) return;
    openPromptModal({
      title: '👑 assign role',
      description: `Enter custom role name to assign to @${userProfile.username}`,
      defaultValue: 'vip',
      placeholder: 'e.g. vip, moderator, founder',
      confirmText: 'Assign Role',
      onConfirm: async (inputRole) => {
        if (!inputRole || !inputRole.trim()) return;
        const cleanRole = inputRole.trim().toLowerCase();
        let currentRoles = [...(userProfile.roles || [])];
        if (!currentRoles.map((r) => r.toLowerCase()).includes(cleanRole)) {
          currentRoles.push(cleanRole);
        }
        const primaryRole = currentRoles[0] || cleanRole;
        const updated = {
          ...userProfile,
          roles: currentRoles,
          role: primaryRole,
        };
        setUserProfile(updated);

        let targetDocId = userProfile.uid;
        if (!targetDocId || targetDocId.startsWith('id_')) {
          const found = await findUserDocByUsername(userProfile.username);
          if (found) targetDocId = found.id;
        }

        if (targetDocId) {
          try {
            await setDoc(doc(db, 'users', targetDocId), { roles: currentRoles, role: primaryRole }, { merge: true });
            onAlert(`👑 Assigned role "${cleanRole}" to @${userProfile.username}`, 'role updated');
          } catch (e) {
            console.error('Error adding role:', e);
          }
        }
      },
    });
  };

  const handleRoleToggle = async (roleKey: string) => {
    if (!userProfile) return;
    let currentRoles = [...(userProfile.roles || [])];

    if (currentRoles.includes(roleKey)) {
      currentRoles = currentRoles.filter((r) => r !== roleKey);
    } else {
      currentRoles.push(roleKey);
    }

    if (currentRoles.length === 0) {
      currentRoles = ['user'];
    }

    const primaryRole = currentRoles[0];

    const updated = {
      ...userProfile,
      roles: currentRoles,
      role: primaryRole,
    };

    setUserProfile(updated);

    if (userProfile.uid) {
      try {
        await setDoc(doc(db, 'users', userProfile.uid), { roles: currentRoles, role: primaryRole }, { merge: true });
      } catch (e) {
        console.error('Error updating roles:', e);
      }
    }
  };

  const handleToggleFriend = async () => {
    if (!userProfile || !currentUser) return;
    const targetName = userProfile.username;
    const targetNameLower = targetName.toLowerCase();
    const myNameLower = currentUser.username.toLowerCase();

    const myRef = doc(db, 'users', currentUser.uid);
    const mySnap = await getDoc(myRef);
    const myData = mySnap.exists() ? mySnap.data() : {};
    const myFriends: string[] = myData.friends || currentUser.friends || [];
    const myIncoming: string[] = myData.friendRequestsIncoming || currentUser.friendRequestsIncoming || [];

    let targetDocId = userProfile.uid;
    let targetData: any = {};

    if (!targetDocId || targetDocId.startsWith('id_')) {
      const found = await findUserDocByUsername(targetName);
      if (found) {
        targetDocId = found.id;
        targetData = found.data;
      }
    } else {
      const targetSnap = await getDoc(doc(db, 'users', targetDocId));
      if (targetSnap.exists()) {
        targetData = targetSnap.data();
      } else {
        const found = await findUserDocByUsername(targetName);
        if (found) {
          targetDocId = found.id;
          targetData = found.data;
        }
      }
    }

    const targetIncoming: string[] = targetData.friendRequestsIncoming || userProfile.friendRequestsIncoming || [];
    const targetFriends: string[] = targetData.friends || userProfile.friends || [];

    const isFriend = myFriends.some((f) => f.toLowerCase() === targetNameLower);
    const isPendingIn = myIncoming.some((r) => r.toLowerCase() === targetNameLower);
    const isPendingOut = targetIncoming.some((r) => r.toLowerCase() === myNameLower);

    try {
      if (isFriend) {
        const newMyFriends = myFriends.filter((f) => f.toLowerCase() !== targetNameLower);
        const newTargetFriends = targetFriends.filter((f) => f.toLowerCase() !== myNameLower);

        await setDoc(myRef, { friends: newMyFriends }, { merge: true });
        if (targetDocId) {
          await setDoc(doc(db, 'users', targetDocId), { friends: newTargetFriends }, { merge: true });
        }

        currentUser.friends = newMyFriends;
        setUserProfile({ ...userProfile, friends: newTargetFriends });
        onAlert(`Removed @${targetName} from friends.`, 'friend removed');
      } else if (isPendingIn) {
        const newMyIncoming = myIncoming.filter((r) => r.toLowerCase() !== targetNameLower);
        const newMyFriends = Array.from(new Set([...myFriends.filter((f) => f.toLowerCase() !== targetNameLower), targetName]));
        const newTargetFriends = Array.from(new Set([...targetFriends.filter((f) => f.toLowerCase() !== myNameLower), currentUser.username]));

        await setDoc(myRef, { friendRequestsIncoming: newMyIncoming, friends: newMyFriends }, { merge: true });
        if (targetDocId) {
          await setDoc(doc(db, 'users', targetDocId), { friends: newTargetFriends }, { merge: true });
        }

        currentUser.friends = newMyFriends;
        currentUser.friendRequestsIncoming = newMyIncoming;
        setUserProfile({ ...userProfile, friends: newTargetFriends });
        onAlert(`Accepted friend request from @${targetName}!`, 'friend request accepted');
      } else if (isPendingOut) {
        const newTargetIncoming = targetIncoming.filter((r) => r.toLowerCase() !== myNameLower);
        if (targetDocId) {
          await setDoc(doc(db, 'users', targetDocId), { friendRequestsIncoming: newTargetIncoming }, { merge: true });
        }

        setUserProfile({ ...userProfile, friendRequestsIncoming: newTargetIncoming });
        onAlert(`Cancelled friend request to @${targetName}.`, 'request cancelled');
      } else {
        const newTargetIncoming = Array.from(new Set([...targetIncoming.filter((r) => r.toLowerCase() !== myNameLower), currentUser.username]));
        
        if (!targetDocId || targetDocId.startsWith('id_')) {
          targetDocId = targetNameLower;
        }

        await setDoc(
          doc(db, 'users', targetDocId),
          {
            username: targetNameLower,
            friendRequestsIncoming: newTargetIncoming,
          },
          { merge: true }
        );

        setUserProfile({ ...userProfile, uid: targetDocId, friendRequestsIncoming: newTargetIncoming });
        onAlert(`Friend request sent to @${targetName}!`, 'friend request sent');
      }
    } catch (e: any) {
      console.error('Error in friend action:', e);
      onAlert('Error updating friend status: ' + (e.message || e), 'friend error');
    }
  };

  const handleTimeout = async (timeStr: string, ms: number) => {
    if (!userProfile) return;
    const timeoutUntil = new Date(Date.now() + ms);
    setUserProfile({ ...userProfile, timeoutUntil });

    if (userProfile.uid) {
      await setDoc(doc(db, 'users', userProfile.uid), { timeoutUntil }, { merge: true });
    }

    onAlert(`User @${userProfile.username} put on timeout for ${timeStr}.`, 'timeout applied');
  };

  const handleKick = async () => {
    if (!userProfile) return;
    const timeout15 = new Date(Date.now() + 15 * 60 * 1000);
    if (userProfile.uid) {
      await setDoc(doc(db, 'users', userProfile.uid), { timeoutUntil: timeout15 }, { merge: true });
    }
    onAlert(`Kicked @${userProfile.username} from chat session.`, 'user kicked');
  };

  const handleWarn = () => {
    if (!userProfile) return;
    openPromptModal({
      title: '⚠️ issue warning',
      description: `Enter warning note for @${userProfile.username}:`,
      defaultValue: 'Please follow chat rules!',
      placeholder: 'Warning reason...',
      confirmText: 'Send Warning',
      isDanger: true,
      onConfirm: async (warnReason) => {
        if (!warnReason || !warnReason.trim()) return;
        const currentWarnings = [...(userProfile.warnings || [])];
        currentWarnings.push({ text: warnReason.trim(), date: new Date().toISOString(), read: false });
        setUserProfile({ ...userProfile, warnings: currentWarnings });

        if (userProfile.uid) {
          await setDoc(doc(db, 'users', userProfile.uid), { warnings: currentWarnings }, { merge: true });
        }
        onAlert(`Warning issued to @${userProfile.username}: "${warnReason.trim()}"`, 'warning sent');
      },
    });
  };

  const handleBanToggle = async () => {
    if (!userProfile) return;
    const newBanned = !userProfile.banned;
    setUserProfile({ ...userProfile, banned: newBanned });

    if (userProfile.uid) {
      await setDoc(doc(db, 'users', userProfile.uid), { banned: newBanned }, { merge: true });
    }

    onAlert(
      newBanned ? `@${userProfile.username} has been banned from chat.` : `@${userProfile.username} has been unbanned.`,
      'chat ban status'
    );
  };

  const handleIpBanToggle = async () => {
    if (!userProfile) return;
    const newIpBan = !userProfile.ipBanned;
    setUserProfile({ ...userProfile, ipBanned: newIpBan });

    if (userProfile.uid) {
      await setDoc(doc(db, 'users', userProfile.uid), { ipBanned: newIpBan }, { merge: true });
    }

    onAlert(
      newIpBan ? `IP ban enforced on @${userProfile.username}` : `IP ban removed for @${userProfile.username}`,
      'ip ban'
    );
  };

  const handleHwBanToggle = async () => {
    if (!userProfile) return;
    const newHwBan = !userProfile.hardwareBanned;
    setUserProfile({ ...userProfile, hardwareBanned: newHwBan });

    if (userProfile.uid) {
      await setDoc(doc(db, 'users', userProfile.uid), { hardwareBanned: newHwBan }, { merge: true });
    }

    onAlert(
      newHwBan ? `Hardware ban enforced on @${userProfile.username}` : `Hardware ban removed for @${userProfile.username}`,
      'hardware ban'
    );
  };

  const handleFlash = () => {
    if (!userProfile) return;
    openPromptModal({
      title: '⚡ flash redirect',
      description: `Enter destination preset or URL for @${userProfile.username}\nShortcuts: 1=ph, 2=xv, 3=r34, 4=tssf, 5=yp`,
      defaultValue: '1',
      placeholder: 'Preset 1-5 or URL...',
      confirmText: '⚡ Flash Redirect',
      isDanger: true,
      onConfirm: async (rawUrl) => {
        if (!rawUrl) return;
        const finalUrl = sanitizeFlashUrl(rawUrl);
        let targetDocId = userProfile.uid;
        if (!targetDocId || targetDocId.startsWith('id_')) {
          const found = await findUserDocByUsername(userProfile.username);
          if (found) targetDocId = found.id;
        }
        if (targetDocId) {
          await setDoc(
            doc(db, 'users', targetDocId),
            {
              flashUrl: finalUrl,
              flashTimestamp: Date.now(),
              flashedBy: currentUser?.username || 'Admin',
            },
            { merge: true }
          );
          onAlert(`⚡ Flashed @${userProfile.username}! Target will be redirected to: ${finalUrl}`, 'flash triggered');
        } else {
          onAlert(`Could not resolve user document for @${userProfile.username}`, 'flash error');
        }
      },
    });
  };

  const handleAddTag = () => {
    if (!userProfile) return;
    openPromptModal({
      title: '🏷️ add profile tag',
      description: `Enter tag name for @${userProfile.username}:`,
      placeholder: 'e.g. vip, trusted, beta',
      confirmText: 'Add Tag',
      onConfirm: async (newTag) => {
        if (!newTag || !newTag.trim()) return;
        const currentTags = [...(userProfile.tags || [])];
        currentTags.push(newTag.trim());
        setUserProfile({ ...userProfile, tags: currentTags });

        if (userProfile.uid) {
          await setDoc(doc(db, 'users', userProfile.uid), { tags: currentTags }, { merge: true });
        }
      },
    });
  };

  const handleRemoveTag = async (index: number) => {
    if (!userProfile) return;
    const currentTags = [...(userProfile.tags || [])];
    currentTags.splice(index, 1);
    setUserProfile({ ...userProfile, tags: currentTags });

    if (userProfile.uid) {
      await setDoc(doc(db, 'users', userProfile.uid), { tags: currentTags }, { merge: true });
    }
  };

  const handleResetUsername = () => {
    if (!userProfile) return;
    openPromptModal({
      title: '✏️ reset username',
      description: `Enter new username for @${userProfile.username}:`,
      defaultValue: userProfile.username,
      placeholder: 'New username...',
      confirmText: 'Update Username',
      onConfirm: async (newUname) => {
        if (!newUname || !newUname.trim() || newUname.trim().toLowerCase() === userProfile.username) return;
        const cleanName = newUname.trim().toLowerCase();
        const q = query(collection(db, 'users'), where('username', '==', cleanName));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].id !== userProfile.uid) {
          onAlert(`The username @${cleanName} is already taken.`, 'username taken');
          return;
        }
        setUserProfile({ ...userProfile, username: cleanName });

        if (userProfile.uid) {
          await setDoc(doc(db, 'users', userProfile.uid), { username: cleanName }, { merge: true });
        }
        onAlert(`Username updated to @${cleanName}`, 'username reset');
      },
    });
  };

  const handleResetPfp = async () => {
    if (!userProfile) return;
    const defaultPfp = `https://api.dicebear.com/7.x/identicon/svg?seed=${userProfile.username}`;
    setUserProfile({ ...userProfile, photoURL: defaultPfp });

    if (userProfile.uid) {
      await setDoc(doc(db, 'users', userProfile.uid), { photoURL: defaultPfp }, { merge: true });
    }
    onAlert(`Profile picture reset for @${userProfile.username}`, 'pfp reset');
  };

  const handleTerminate = () => {
    if (!userProfile) return;
    openPromptModal({
      title: '💀 terminate account',
      description: `Are you sure you want to terminate account @${userProfile.username}? This action is permanent and irreversible!`,
      isConfirmOnly: true,
      isDanger: true,
      confirmText: 'Terminate Account',
      onConfirm: async () => {
        if (userProfile.uid) {
          await deleteDoc(doc(db, 'users', userProfile.uid));
        }
        onClose();
        onAlert(`Account @${userProfile.username} terminated completely.`, 'account terminated');
      },
    });
  };

  const displayName = userProfile
    ? userProfile.username.toUpperCase().charAt(0) + userProfile.username.slice(1)
    : 'User';

  const primaryRole = userProfile?.roles?.[0] || userProfile?.role || 'beta tester';
  const dotClass = primaryRole.includes('beta') ? 'dot-beta' : `dot-${primaryRole.toLowerCase()}`;
  const targetUnameLower = userProfile?.username.toLowerCase() || '';
  const myUnameLower = currentUser?.username.toLowerCase() || '';

  const isFriend = currentUser?.friends?.some((f) => f.toLowerCase() === targetUnameLower);
  const isPendingOut = userProfile?.friendRequestsIncoming?.some((r) => r.toLowerCase() === myUnameLower);
  const isPendingIn = currentUser?.friendRequestsIncoming?.some((r) => r.toLowerCase() === targetUnameLower);

  let friendButtonLabel = '+ Add Friend';
  if (isFriend) friendButtonLabel = '✓ Friends';
  else if (isPendingIn) friendButtonLabel = '✓ Accept Request';
  else if (isPendingOut) friendButtonLabel = '⌛ Request Sent';

  return (
    <div className="fixed inset-0 z-[1500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`relative flex flex-col md:flex-row bg-[#000000] rounded-[20px] overflow-hidden ${hasFlashPermission ? 'max-w-[780px]' : 'max-w-[420px]'} w-full max-h-[90vh] shadow-2xl border border-white/10 text-left`}>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors z-10 cursor-pointer"
        >
          ✕
        </button>

        {loading || !userProfile ? (
          <div className="p-10 text-center w-full text-slate-400 text-sm">
            loading profile details...
          </div>
        ) : (
          <>
            <div className={`flex-1 bg-[#0f0f13] p-6 flex flex-col gap-4 ${hasFlashPermission ? 'border-r border-[#1c1c24]' : ''} overflow-y-auto`}>
              <div className="flex flex-col items-start">
                <div className="relative group/pfp mb-3">
                  <img
                    src={userProfile.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${userProfile.username}`}
                    alt="avatar"
                    onClick={() => onZoomImage && onZoomImage(userProfile.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${userProfile.username}`)}
                    title="Click to zoom profile picture"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#27272a] hover:border-[#3f3f46] bg-[#18181c] cursor-pointer transition-all hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => onZoomImage && onZoomImage(userProfile.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${userProfile.username}`)}
                    className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/pfp:opacity-100 flex items-center justify-center text-white text-xs font-semibold backdrop-blur-[1px] transition-opacity cursor-pointer"
                  >
                    🔍 Zoom
                  </button>
                </div>
                <div className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                  {displayName}
                </div>
                <div className="text-sm text-[#71717a] mt-0.5 mb-2.5">
                  @{userProfile.username}
                </div>

                <div className="flex items-center gap-3 text-xs text-[#a1a1aa] mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 fill-current opacity-70" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                    user #{userProfile.joinNumber !== undefined ? userProfile.joinNumber : userProfile.accountNumber}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 fill-current opacity-70" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    joined {formatJoinedDate(userProfile.createdAt, userProfile.joinedDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 fill-current opacity-70" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    {userProfile.views} views
                  </span>
                  {userProfile.joinNumber !== undefined && (
                    <span className="flex items-center gap-1 text-[#34d399] font-medium">
                      <svg className="w-3.5 h-3.5 fill-current opacity-90 text-[#34d399]" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                      user #{userProfile.joinNumber}
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#082f2c] border border-[#115e59] text-[#2dd4bf] mb-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full bg-current ${dotClass}`} />
                  <span>{primaryRole}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[0.78rem] text-[#a1a1aa]">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-[#71717a] inline-block" />
                  <span>{userProfile.status}</span>
                </div>
              </div>

              {currentUser?.isAdmin && (
                <div className="bg-[#111115] border border-[#27272a] p-3 rounded-xl">
                  <div className="text-[0.68rem] font-bold text-[#f59e0b] uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>👑 ASSIGN ROLES</span>
                    <button
                      type="button"
                      onClick={handleAddCustomRole}
                      className="px-2 py-0.5 bg-[#27272a] hover:bg-[#3f3f46] text-white text-[0.68rem] font-bold rounded-md cursor-pointer transition-colors"
                    >
                      + Custom Role
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...ALL_ROLES, ...(userProfile.roles || [])])).map((rKey) => {
                      const isActive = userProfile.roles?.some((r) => r.toLowerCase() === rKey.toLowerCase());
                      const rDot = rKey.includes('beta') ? 'dot-beta' : `dot-${rKey.toLowerCase()}`;

                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => handleRoleToggle(rKey)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.25 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-[#272730] border-[#52525b] text-white font-semibold'
                              : 'bg-[#18181c] border-[#27272a] hover:bg-[#232329] text-[#a1a1aa]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full bg-current ${rDot}`} />
                          {rKey}
                          {isActive && <span className="ml-0.5 text-[0.7rem] text-[#10b981]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-[#09090d] border border-[#1c1c24] rounded-xl p-3 text-xs text-[#d4d4d8] leading-relaxed whitespace-pre-wrap break-words min-h-[60px]">
                {userProfile.bio}
              </div>

              <div className="flex gap-2.5 mt-auto pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDM(userProfile.username);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3.5 bg-[#18181c] hover:bg-[#232329] border border-[#27272a] hover:border-[#3f3f46] rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                  Message
                </button>
                <button
                  type="button"
                  onClick={handleToggleFriend}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3.5 bg-[#18181c] hover:bg-[#232329] border border-[#27272a] hover:border-[#3f3f46] rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span>{friendButtonLabel}</span>
                </button>
              </div>
            </div>

            {hasFlashPermission && (
              <div className="flex-[0.85] bg-[#0d0d12] border-l border-[#1f131a] p-6 flex flex-col gap-4 overflow-y-auto">
                <div className="flex flex-col gap-2.5">
                  <div className="text-[0.68rem] font-bold text-[#f43f5e] uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                    {currentUser?.isAdmin ? 'MODERATION' : 'FLASH CONTROLS'}
                  </div>

                  {currentUser?.isAdmin && (
                    <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                      <span>Timeout</span>
                      <button
                        type="button"
                        onClick={() => handleTimeout('5m', 5 * 60 * 1000)}
                        className="px-2.5 py-1 bg-[#18181c] border border-[#27272a] hover:bg-[#27272a] hover:border-[#3f3f46] rounded-md text-[#d4d4d8] hover:text-white text-[0.72rem] font-semibold cursor-pointer transition-all"
                      >
                        5m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTimeout('1h', 60 * 60 * 1000)}
                        className="px-2.5 py-1 bg-[#18181c] border border-[#27272a] hover:bg-[#27272a] hover:border-[#3f3f46] rounded-md text-[#d4d4d8] hover:text-white text-[0.72rem] font-semibold cursor-pointer transition-all"
                      >
                        1h
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTimeout('1d', 24 * 60 * 60 * 1000)}
                        className="px-2.5 py-1 bg-[#18181c] border border-[#27272a] hover:bg-[#27272a] hover:border-[#3f3f46] rounded-md text-[#d4d4d8] hover:text-white text-[0.72rem] font-semibold cursor-pointer transition-all"
                      >
                        1d
                      </button>
                    </div>
                  )}

                  {currentUser?.isAdmin && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleKick}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-[#18181c] border border-[#27272a] hover:bg-[#232329] hover:border-[#3f3f46] rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        Kick
                      </button>
                      <button
                        type="button"
                        onClick={handleWarn}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-[#18181c] border border-[#27272a] hover:bg-[#232329] hover:border-[#3f3f46] rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg>
                        Warn
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleFlash}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all bg-[#2a1b08] border-[#854d0e] text-[#facc15] hover:bg-[#3f2a0c] hover:text-white"
                  >
                    <span className="text-sm">⚡</span>
                    <span>Flash User (Redirect)</span>
                  </button>

                  {currentUser?.isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={handleBanToggle}
                        className={`w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                          userProfile.banned
                            ? 'bg-[#3f131a] border-[#f43f5e] text-white'
                            : 'bg-[#2c0d14] border-[#4c151e] text-[#f43f5e] hover:bg-[#3f131a] hover:text-white'
                        }`}
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm5.31-3.1L6.1 5.69C7.45 4.63 9.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
                        <span>{userProfile.banned ? 'Unban from chat' : 'Ban from chat'}</span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleIpBanToggle}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer text-center transition-all ${
                            userProfile.ipBanned
                              ? 'bg-[#3f131a] text-[#f43f5e] border-[#5c1d28]'
                              : 'bg-[#141418] border-[#23232a] text-[#71717a] hover:bg-[#1f1f26] hover:text-[#a1a1aa]'
                          }`}
                        >
                          IP ban
                        </button>
                        <button
                          type="button"
                          onClick={handleHwBanToggle}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer text-center transition-all ${
                            userProfile.hardwareBanned
                              ? 'bg-[#3f131a] text-[#f43f5e] border-[#5c1d28]'
                              : 'bg-[#141418] border-[#23232a] text-[#71717a] hover:bg-[#1f1f26] hover:text-[#a1a1aa]'
                          }`}
                        >
                          Hardware ban
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {currentUser?.isAdmin && (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="text-[0.68rem] font-bold text-[#71717a] uppercase tracking-wider">
                        TAGS
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {userProfile.tags?.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#18181c] border border-[#27272a] rounded-md text-[#a1a1aa] text-[0.72rem]"
                          >
                            {tag}
                            <span
                              onClick={() => handleRemoveTag(idx)}
                              className="cursor-pointer text-[#71717a] hover:text-[#f43f5e] ml-0.5 font-bold"
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="w-full py-2 bg-[#141418] border border-dashed border-[#27272a] hover:border-[#52525b] hover:bg-[#18181c] hover:text-white rounded-lg text-[#a1a1aa] text-[0.78rem] font-semibold cursor-pointer transition-all text-center"
                      >
                        + Add tag
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="text-[0.68rem] font-bold text-[#f43f5e] uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v2h2v-2h2v-2h-8.35zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
                        OWNER ACTIONS
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleResetUsername}
                          className="py-2 px-2 bg-[#18181c] border border-[#27272a] hover:bg-[#232329] hover:border-[#3f3f46] rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                        >
                          Reset username
                        </button>
                        <button
                          type="button"
                          onClick={handleResetPfp}
                          className="py-2 px-2 bg-[#18181c] border border-[#27272a] hover:bg-[#232329] hover:border-[#3f3f46] rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                        >
                          Reset pfp
                        </button>
                        <button
                          type="button"
                          onClick={handleTerminate}
                          className="py-2 px-2 bg-[#2c0d14] border border-[#4c151e] hover:bg-[#f43f5e] hover:border-[#f43f5e] rounded-xl text-[#f43f5e] hover:text-white text-xs font-semibold cursor-pointer transition-all"
                        >
                          Terminate
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
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
            {!promptState.isConfirmOnly && (
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
            )}
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
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  promptState.isDanger
                    ? 'bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#b91c1c] text-white'
                    : 'bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-white'
                }`}
              >
                {promptState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
