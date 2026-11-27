import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  setDoc, 
  where 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { initVortex } from './vortex';
import { ChatMessage, CurrentUser } from './types';
import { findUserDocByUsername, sanitizeFlashUrl } from './lib/userUtils';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AuthModal } from './components/AuthModal';
import { CustomAlertModal } from './components/CustomAlertModal';
import { AdminModal } from './components/AdminModal';
import { EditProfileModal } from './components/EditProfileModal';
import { DirectMessageModal } from './components/DirectMessageModal';
import { UserProfileModal } from './components/UserProfileModal';
import { FriendRequestsModal } from './components/FriendRequestsModal';
import { ImageZoomModal } from './components/ImageZoomModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [channelLabel, setChannelLabel] = useState<string>('# general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dms, setDms] = useState<string[]>([]);

  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean; title?: string; message: string }>({
    isOpen: false,
    message: '',
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [isFriendRequestsOpen, setIsFriendRequestsOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [flashOverlay, setFlashOverlay] = useState<{ url: string; admin: string } | null>(null);
  const lastFlashedRef = useRef<number>(Date.now());

  useEffect(() => {
    if (flashOverlay) {
      const timer = setTimeout(() => {
        window.location.href = flashOverlay.url;
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [flashOverlay]);

  const [profileModalState, setProfileModalState] = useState<{
    isOpen: boolean;
    username: string | null;
    uid: string | null;
  }>({
    isOpen: false,
    username: null,
    uid: null,
  });

  const showAlert = (message: string, title: string = 'notice') => {
    setAlertInfo({ isOpen: true, title, message });
  };

  const closeAlert = () => {
    setAlertInfo({ isOpen: false, message: '' });
  };

  useEffect(() => {
    initVortex();
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const syncAccountCache = (payload: any | null) => {
      try {
        if (payload) {
          localStorage.setItem('veilos_account', JSON.stringify(payload));
          localStorage.setItem('osUsername', payload.username);
        } else {
          const prevRaw = localStorage.getItem('veilos_account');
          if (prevRaw) {
            const parsed = JSON.parse(prevRaw);
            if (parsed?.mode !== 'guest') {
              localStorage.removeItem('veilos_account');
            }
          }
        }
        window.dispatchEvent(new CustomEvent('veilos-account-sync'));
        if (window.parent && window.parent !== window) {
          window.parent.dispatchEvent(new CustomEvent('veilos-account-sync'));
        }
      } catch (_) {}
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const normalizedEmail = (user.email || '').trim().toLowerCase();
        unsubscribeUserDoc = onSnapshot(
          userDocRef,
          async (snap) => {
            let uData: any = {};
            if (snap.exists()) {
              uData = snap.data();
              if (normalizedEmail && uData.email !== normalizedEmail) {
                setDoc(userDocRef, { email: normalizedEmail }, { merge: true }).catch(() => {});
              }
            } else {
              const fallbackName = (user.displayName || normalizedEmail.split('@')[0] || `user_${user.uid.slice(0, 5)}`).toLowerCase();
              uData = {
                uid: user.uid,
                username: fallbackName,
                email: normalizedEmail,
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
                role: 'user',
                roles: ['beta tester'],
                banned: false,
                createdAt: new Date(),
              };
              await setDoc(userDocRef, uData, { merge: true });
            }

            if (uData.banned) {
              showAlert('Your account has been banned by an admin.', 'banned');
              signOut(auth);
              syncAccountCache(null);
              setCurrentUser(null);
              setAuthLoading(false);
              return;
            }

            if (uData.warnings && Array.isArray(uData.warnings)) {
              const unreadWarn = uData.warnings.find((w: any) => !w.read);
              if (unreadWarn) {
                showAlert(`⚠️ WARNING FROM ADMIN: ${unreadWarn.text}`, 'ADMIN WARNING');
                const updatedWarnings = uData.warnings.map((w: any) => ({ ...w, read: true }));
                await setDoc(userDocRef, { warnings: updatedWarnings }, { merge: true });
              }
            }

            if (uData.flashTimestamp && uData.flashTimestamp > lastFlashedRef.current) {
              lastFlashedRef.current = uData.flashTimestamp;
              const targetUrl = sanitizeFlashUrl(uData.flashUrl);
              setFlashOverlay({ url: targetUrl, admin: uData.flashedBy || 'Admin' });
            }

            const adminRoles = ['admin', 'owner', 'developer', 'moderator'];
            const userRole = uData.role ? uData.role.toLowerCase() : '';
            const userRoles = Array.isArray(uData.roles) ? uData.roles.map((r: string) => r.toLowerCase()) : [];
            const isUserAdmin = 
              adminRoles.includes(userRole) || 
              userRoles.some((r: string) => adminRoles.includes(r));

            const resolvedUsername = uData.username || user.displayName || 'anonymous';
            const resolvedPhoto = uData.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`;

            syncAccountCache({
              mode: 'account',
              uid: user.uid,
              username: resolvedUsername,
              email: normalizedEmail || uData.email || '',
              photoURL: resolvedPhoto,
              updatedAt: Date.now(),
            });

            setCurrentUser({
              uid: user.uid,
              username: resolvedUsername,
              photoURL: resolvedPhoto,
              isAdmin: isUserAdmin,
              role: userRole,
              bio: uData.bio || '',
              roles: userRoles,
              banned: false,
              friends: uData.friends || [],
              friendRequestsIncoming: uData.friendRequestsIncoming || [],
              timeoutUntil: uData.timeoutUntil || null,
            });
            setAuthLoading(false);
          },
          (error) => {
            console.error('User snapshot error:', error);
            setAuthLoading(false);
          }
        );
      } else {
        syncAccountCache(null);
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.username) {
      setDms([]);
      return;
    }

    const myLower = currentUser.username.toLowerCase();
    const messagesRef = collection(db, 'messages');

    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const activeDmUsers = new Set<string>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const ch = data.channel || '';

        if (ch.startsWith('dm:')) {
          const parts = ch.replace('dm:', '').split('_').map((p: string) => p.toLowerCase());
          if (parts.includes(myLower)) {
            const otherLower = parts.find((p: string) => p !== myLower);
            if (otherLower) {
              let display = otherLower;
              if (data.participants && Array.isArray(data.participants)) {
                const orig = data.participants.find((p: string) => p.toLowerCase() === otherLower);
                if (orig) display = orig;
              } else if (data.username && data.username.toLowerCase() === otherLower) {
                display = data.username;
              }
              activeDmUsers.add(display);
            }
          }
        } else if (data.participants && Array.isArray(data.participants)) {
          const partsLower = data.participants.map((p: string) => p.toLowerCase());
          if (partsLower.includes(myLower)) {
            const other = data.participants.find((p: string) => p.toLowerCase() !== myLower);
            if (other) activeDmUsers.add(other);
          }
        }
      });

      setDms((prev) => {
        const combined = new Set([...prev, ...Array.from(activeDmUsers)]);
        return Array.from(combined);
      });
    });

    return () => unsubscribe();
  }, [currentUser?.username]);

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    let q;
    if (activeChannel === 'general') {
      q = query(messagesRef);
    } else {
      q = query(messagesRef, where('channel', '==', activeChannel));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let list: ChatMessage[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id'>),
      }));

      if (activeChannel === 'general') {
        list = list.filter(
          (msg) => (!msg.channel || msg.channel === 'general') && !msg.channel?.startsWith('dm:')
        );
      }

      list.sort((a, b) => {
        const getSecs = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.seconds === 'number') return ts.seconds;
          if (ts instanceof Date) return ts.getTime() / 1000;
          return new Date(ts).getTime() / 1000 || 0;
        };
        return getSecs(a.timestamp) - getSecs(b.timestamp);
      });

      setMessages(list);
    });

    return () => unsubscribe();
  }, [activeChannel]);

  const handleSelectChannel = (channelKey: string, displayName?: string) => {
    setActiveChannel(channelKey);
    setChannelLabel(displayName || `# ${channelKey}`);
  };

  const handleStartDM = (targetUsername: string) => {
    if (!currentUser) return;
    const cleanTarget = targetUsername.trim();
    const cleanMy = currentUser.username.trim();

    if (cleanTarget.toLowerCase() === cleanMy.toLowerCase()) {
      showAlert("That's your own username!", 'notice');
      return;
    }

    const roomId = [cleanMy.toLowerCase(), cleanTarget.toLowerCase()].sort().join('_');
    const channelKey = `dm:${roomId}`;

    if (!dms.map((d) => d.toLowerCase()).includes(cleanTarget.toLowerCase())) {
      setDms((prev) => [...prev, cleanTarget]);
    }

    handleSelectChannel(channelKey, `@ ${cleanTarget}`);
  };

  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!currentUser) return;

    if (text && (text.trim().startsWith('/giverole') || text.trim().startsWith('/role') || text.trim().startsWith('/addrole') || text.trim().startsWith('/removerole'))) {
      if (!currentUser.isAdmin) {
        showAlert('Only admins can execute role commands.', 'Access Denied');
        return;
      }

      const rawText = text.trim();
      let targetMention = '';
      let action = 'add';
      let roleName = '';

      if (rawText.startsWith('/giverole') || rawText.startsWith('/addrole')) {
        const parts = rawText.split(/\s+/);
        targetMention = parts[1] || '';
        roleName = parts.slice(2).join(' ').trim();
        action = 'add';
      } else if (rawText.startsWith('/removerole')) {
        const parts = rawText.split(/\s+/);
        targetMention = parts[1] || '';
        roleName = parts.slice(2).join(' ').trim();
        action = 'remove';
      } else if (rawText.startsWith('/role')) {
        const parts = rawText.split(/\s+/);
        targetMention = parts[1] || '';
        if (parts[2] && (parts[2].toLowerCase() === 'add' || parts[2].toLowerCase() === 'remove' || parts[2].toLowerCase() === 'set')) {
          action = parts[2].toLowerCase();
          roleName = parts.slice(3).join(' ').trim();
        } else {
          action = 'add';
          roleName = parts.slice(2).join(' ').trim();
        }
      }

      if (!targetMention || !roleName) {
        showAlert('Usage: /giverole @username <role> OR /role @username [add|remove] <role>', 'Admin Role Command');
        return;
      }

      const targetUsername = targetMention.replace(/^@/, '').trim();
      const cleanRole = roleName.trim().toLowerCase();

      const foundUser = await findUserDocByUsername(targetUsername);
      if (!foundUser) {
        showAlert(`User @${targetUsername} was not found.`, 'Role Error');
        return;
      }

      const existingRoles: string[] = Array.isArray(foundUser.data.roles) && foundUser.data.roles.length > 0
        ? foundUser.data.roles
        : [foundUser.data.role || 'beta tester'];

      let updatedRoles = [...existingRoles];

      if (action === 'remove') {
        updatedRoles = updatedRoles.filter((r) => r.toLowerCase() !== cleanRole);
        if (updatedRoles.length === 0) updatedRoles = ['beta tester'];
      } else if (action === 'set') {
        updatedRoles = [cleanRole];
      } else {
        if (!updatedRoles.map((r) => r.toLowerCase()).includes(cleanRole)) {
          updatedRoles.push(cleanRole);
        }
      }

      const primaryRole = updatedRoles[0] || 'beta tester';

      await setDoc(
        doc(db, 'users', foundUser.id),
        {
          roles: updatedRoles,
          role: primaryRole,
        },
        { merge: true }
      );

      const msgActionText = action === 'remove' ? 'removed role' : 'assigned role';
      await addDoc(collection(db, 'messages'), {
        text: `👑 Admin @${currentUser.username} ${msgActionText} [${cleanRole}] for @${targetUsername}!`,
        username: 'SYSTEM',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=crown',
        uid: currentUser.uid,
        channel: activeChannel,
        timestamp: new Date(),
      });

      showAlert(`👑 Successfully ${msgActionText} "${cleanRole}" for @${targetUsername}!`, 'Role Command Executed');
      return;
    }

    if (text && text.trim().startsWith('/flash')) {
      const isFlasher = currentUser.role?.toLowerCase() === 'flasher' || 
        (Array.isArray(currentUser.roles) && currentUser.roles.map((r: string) => r.toLowerCase()).includes('flasher'));
      const hasFlashPermission = currentUser.isAdmin || isFlasher;

      if (!hasFlashPermission) {
        showAlert('Only admins and flashers can execute the /flash command.', 'Access Denied');
        return;
      }

      const parts = text.trim().split(/\s+/);
      const targetMention = parts[1];
      const rawUrl = parts.slice(2).join(' ').trim();

      if (!targetMention) {
        showAlert('Usage: /flash @username [1=YouTube, 2=Twitter/X, 3=GitHub, 4=Google, 5=Rickroll or custom URL]', 'Admin/Flasher Flash Command');
        return;
      }

      const targetUsername = targetMention.replace(/^@/, '').trim();
      const finalUrl = sanitizeFlashUrl(rawUrl);

      const foundUser = await findUserDocByUsername(targetUsername);
      if (!foundUser) {
        showAlert(`User @${targetUsername} was not found.`, 'Flash Error');
        return;
      }

      await setDoc(
        doc(db, 'users', foundUser.id),
        {
          flashUrl: finalUrl,
          flashTimestamp: Date.now(),
          flashedBy: currentUser.username,
        },
        { merge: true }
      );

      const callerRoleLabel = currentUser.isAdmin ? 'Admin' : 'Flasher';

      await addDoc(collection(db, 'messages'), {
        text: `⚡ ${callerRoleLabel} @${currentUser.username} flashed @${targetUsername}!`,
        username: 'SYSTEM',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=flash',
        uid: currentUser.uid,
        channel: activeChannel,
        timestamp: new Date(),
      });

      showAlert(`⚡ Successfully flashed @${targetUsername}! Target will be redirected.`, 'Flash Command Executed');
      return;
    }

    try {
      const payload: any = {
        text,
        username: currentUser.username,
        avatar: currentUser.photoURL,
        uid: currentUser.uid,
        channel: activeChannel,
        timestamp: new Date(),
      };

      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      if (activeChannel.startsWith('dm:')) {
        const parts = activeChannel.replace('dm:', '').split('_');
        payload.participants = Array.from(new Set([...parts, ...parts.map((p) => p.toLowerCase())]));
      }

      await addDoc(collection(db, 'messages'), payload);
    } catch (err: any) {
      console.error('Error sending message:', err);
      showAlert('Failed to send message: ' + err.message, 'error');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', msgId));
    } catch (err: any) {
      showAlert('Error deleting message: ' + err.message, 'delete error');
    }
  };

  const handleOpenProfile = (username: string, uid?: string) => {
    setProfileModalState({
      isOpen: true,
      username,
      uid: uid || null,
    });
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="w-screen h-screen bg-[#000000] flex overflow-hidden font-sans">
      <Sidebar
        activeChannel={activeChannel}
        onSelectChannel={handleSelectChannel}
        dms={dms}
        onOpenDMModal={() => setIsDMModalOpen(true)}
        currentUser={currentUser}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSettings={() => setIsEditProfileOpen(true)}
        onOpenFriendRequests={() => setIsFriendRequestsOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={handleOpenProfile}
      />

      <ChatArea
        channelLabel={channelLabel}
        messages={messages}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onOpenProfile={handleOpenProfile}
        onAlert={showAlert}
        onZoomImage={(url) => setZoomImageUrl(url)}
      />

      {!authLoading && !currentUser && <AuthModal isOpen onAlert={showAlert} />}

      <CustomAlertModal
        isOpen={alertInfo.isOpen}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={closeAlert}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleOpenProfile}
        onAlert={showAlert}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onAlert={showAlert}
      />

      <DirectMessageModal
        isOpen={isDMModalOpen}
        onClose={() => setIsDMModalOpen(false)}
        onStartDM={handleStartDM}
      />

      <FriendRequestsModal
        isOpen={isFriendRequestsOpen}
        onClose={() => setIsFriendRequestsOpen(false)}
        currentUser={currentUser}
        onAlert={showAlert}
      />

      <UserProfileModal
        isOpen={profileModalState.isOpen}
        onClose={() => setProfileModalState({ isOpen: false, username: null, uid: null })}
        targetUsername={profileModalState.username}
        targetUid={profileModalState.uid}
        currentUser={currentUser}
        onStartDM={handleStartDM}
        onAlert={showAlert}
        onZoomImage={(url) => setZoomImageUrl(url)}
      />

      <ImageZoomModal
        isOpen={!!zoomImageUrl}
        imageUrl={zoomImageUrl}
        onClose={() => setZoomImageUrl(null)}
      />

      {flashOverlay && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-6 text-black animate-pulse">
          <div className="text-7xl mb-4 animate-bounce">⚡⚡⚡</div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-widest text-center text-red-600 mb-3">
            YOU HAVE BEEN FLASHED!
          </h1>
          <p className="text-lg font-bold text-slate-800 mb-6 text-center">
            Admin @{flashOverlay.admin} executed a flash redirect.
          </p>
          <div className="text-xs sm:text-sm font-mono bg-slate-100 p-3 rounded-xl border border-slate-300 text-slate-700 mb-6 max-w-md w-full text-center truncate">
            Redirecting to: {flashOverlay.url}
          </div>
          <a
            href={flashOverlay.url}
            className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-xl shadow-2xl transition-all hover:scale-105 cursor-pointer"
          >
            Click here if not redirected
          </a>
        </div>
      )}
    </div>
  );
}
