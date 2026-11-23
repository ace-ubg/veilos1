import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CurrentUser } from '../types';
import { findUserDocByUsername } from '../lib/userUtils';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onAlert: (msg: string, title?: string) => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAlert,
}) => {
  const [requests, setRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setRequests(currentUser.friendRequestsIncoming || []);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleAccept = async (senderUsername: string) => {
    setLoading(true);
    try {
      const senderNameLower = senderUsername.toLowerCase();
      const myNameLower = currentUser.username.toLowerCase();

      const myRef = doc(db, 'users', currentUser.uid);
      const mySnap = await getDoc(myRef);
      const myData = mySnap.exists() ? mySnap.data() : {};
      const myIncoming: string[] = myData.friendRequestsIncoming || currentUser.friendRequestsIncoming || [];
      const myFriends: string[] = myData.friends || currentUser.friends || [];

      const updatedMyIncoming = myIncoming.filter((r) => r.toLowerCase() !== senderNameLower);
      const updatedMyFriends = Array.from(
        new Set([...myFriends.filter((f) => f.toLowerCase() !== senderNameLower), senderUsername])
      );

      await setDoc(
        myRef,
        {
          friendRequestsIncoming: updatedMyIncoming,
          friends: updatedMyFriends,
        },
        { merge: true }
      );

      currentUser.friends = updatedMyFriends;
      currentUser.friendRequestsIncoming = updatedMyIncoming;

      const senderFound = await findUserDocByUsername(senderUsername);
      if (senderFound) {
        const senderFriends: string[] = senderFound.data.friends || [];
        const updatedSenderFriends = Array.from(
          new Set([...senderFriends.filter((f) => f.toLowerCase() !== myNameLower), currentUser.username])
        );
        await setDoc(
          doc(db, 'users', senderFound.id),
          { friends: updatedSenderFriends },
          { merge: true }
        );
      }

      setRequests(updatedMyIncoming);
      onAlert(`You accepted @${senderUsername}'s friend request!`, 'friend request accepted');
    } catch (err: any) {
      console.error('Error accepting friend request:', err);
      onAlert('Failed to accept request: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (senderUsername: string) => {
    setLoading(true);
    try {
      const senderNameLower = senderUsername.toLowerCase();
      const myRef = doc(db, 'users', currentUser.uid);
      const mySnap = await getDoc(myRef);
      const myData = mySnap.exists() ? mySnap.data() : {};
      const myIncoming: string[] = myData.friendRequestsIncoming || currentUser.friendRequestsIncoming || [];

      const updatedMyIncoming = myIncoming.filter((r) => r.toLowerCase() !== senderNameLower);

      await setDoc(
        myRef,
        {
          friendRequestsIncoming: updatedMyIncoming,
        },
        { merge: true }
      );

      currentUser.friendRequestsIncoming = updatedMyIncoming;
      setRequests(updatedMyIncoming);
      onAlert(`Declined friend request from @${senderUsername}.`, 'friend request declined');
    } catch (err: any) {
      console.error('Error declining friend request:', err);
      onAlert('Failed to decline request: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141418] border border-[#27272a] p-6 rounded-[20px] w-full max-w-[400px] shadow-2xl relative text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#71717a] hover:text-white transition-colors cursor-pointer text-sm font-bold"
        >
          ✕
        </button>

        <h3 className="text-xl font-extrabold text-white mb-1 lowercase">
          friend requests
        </h3>
        <p className="text-xs text-[#71717a] mb-4">
          review pending friend requests
        </p>

        {requests.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#71717a] bg-[#0b0b0e] border border-[#27272a] rounded-xl">
            no pending friend requests
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
            {requests.map((uname) => (
              <div
                key={uname}
                className="flex items-center justify-between p-3 bg-[#0b0b0e] border border-[#27272a] rounded-xl"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${uname}`}
                    alt="avatar"
                    className="w-8 h-8 rounded-full bg-[#18181c]"
                  />
                  <span className="text-xs font-semibold text-white">
                    @{uname}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleAccept(uname)}
                    className="px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDecline(uname)}
                    className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
