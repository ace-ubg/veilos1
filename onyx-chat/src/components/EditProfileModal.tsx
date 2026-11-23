import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { CurrentUser } from '../types';
import { compressImage } from '../lib/imageUtils';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onAlert: (msg: string, title?: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAlert,
}) => {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [fileName, setFileName] = useState('upload new picture...');
  const [imageData, setImageData] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username);
      setImageData(currentUser.photoURL);
      setBio(currentUser.bio || '');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  async function isUsernameTaken(uname: string, excludeUid: string) {
    const q = query(collection(db, 'users'), where('username', '==', uname.toLowerCase()));
    const snap = await getDocs(q);
    return snap.docs.some((docSnap) => (docSnap.data().uid || docSnap.id) !== excludeUid);
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      try {
        const compressed = await compressImage(file);
        setImageData(compressed);
      } catch (err) {
        console.error('Image compress error:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) return;

    setSaving(true);
    try {
      const taken = await isUsernameTaken(cleanUsername, currentUser.uid);
      if (taken) {
        onAlert('That username is already taken! Please choose a different one.', 'username taken');
        setSaving(false);
        return;
      }

      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          username: cleanUsername,
          photoURL: imageData,
          bio: bio.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: cleanUsername });
      }

      onClose();
    } catch (err: any) {
      onAlert('Error updating profile: ' + err.message, 'profile error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141418] border border-[#27272a] p-8 rounded-[20px] w-full max-w-[380px] text-center shadow-2xl">
        <h2 className="text-2xl font-extrabold tracking-tight mb-1 text-white lowercase">
          edit profile
        </h2>
        <p className="text-xs text-[#71717a] mb-5">
          update your username or profile image
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="new username..."
            maxLength={15}
            required
            className="w-full px-4 py-3 bg-[#0b0b0e] border border-[#27272a] focus:border-[#52525b] rounded-xl text-white text-sm outline-none transition-colors"
          />

          <div>
            <span className="block text-[0.75rem] text-[#71717a] font-semibold uppercase tracking-wider mb-1.5">
              bio
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="write something about yourself..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-2.5 bg-[#0b0b0e] border border-[#27272a] focus:border-[#52525b] rounded-xl text-white text-xs outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <span className="block text-[0.75rem] text-[#71717a] font-semibold uppercase tracking-wider mb-1.5">
              profile picture
            </span>
            <label className="block w-full py-3 px-4 bg-[#0b0b0e] border border-dashed border-[#3f3f46] hover:border-[#71717a] hover:text-white rounded-xl text-[#a1a1aa] text-xs text-center cursor-pointer transition-all">
              {fileName}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-center my-1">
            <img
              src={imageData || currentUser.photoURL}
              alt="preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#3f3f46]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#1f1f24] hover:bg-[#27272a] border border-[#27272a] hover:border-[#3f3f46] text-white rounded-xl font-semibold text-sm transition-all mt-1 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'saving...' : 'save changes'}
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
