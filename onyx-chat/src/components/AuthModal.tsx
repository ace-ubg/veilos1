import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { compressImage } from '../lib/imageUtils';

interface AuthModalProps {
  isOpen: boolean;
  onAlert: (msg: string, title?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onAlert }) => {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fileName, setFileName] = useState('choose image file...');
  const [uploadedImageData, setUploadedImageData] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function isUsernameTaken(uname: string) {
    const q = query(collection(db, 'users'), where('username', '==', uname.toLowerCase()));
    const querySnap = await getDocs(q);
    return !querySnap.empty;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      try {
        const compressed = await compressImage(file);
        setUploadedImageData(compressed);
      } catch (err) {
        console.error('Image compression error:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRecovering) {
        try {
          await sendPasswordResetEmail(auth, email.trim());
        } catch (error) {
          // Older Firebase projects can report that an address is unregistered.
          if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
        }
        setIsRecovering(false);
        onAlert('If an account uses this email, check your inbox for a password reset link.', 'check your email');
      } else if (isSignUpMode) {
        const cleanUsername = username.trim().toLowerCase();
        if (!cleanUsername) {
          onAlert('Please enter a username', 'validation error');
          setLoading(false);
          return;
        }

        const taken = await isUsernameTaken(cleanUsername);
        if (taken) {
          onAlert('That username is already taken! Please pick another one.', 'username taken');
          setLoading(false);
          return;
        }

        const avatarUrl = uploadedImageData || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`;
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: cleanUsername });

        let nextJoinNumber = 1;
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          nextJoinNumber = usersSnap.size + 1;
        } catch (err) {
          console.error('Error fetching user count during sign-up:', err);
        }

        await setDoc(doc(db, 'users', res.user.uid), {
          uid: res.user.uid,
          username: cleanUsername,
          photoURL: avatarUrl,
          role: 'user',
          roles: ['beta tester'],
          banned: false,
          accountNumber: Math.floor(Math.random() * 89) + 10,
          joinNumber: nextJoinNumber,
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          views: 0,
          createdAt: new Date()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      onAlert(err.message || 'Authentication failed', 'auth error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141418] border border-[#27272a] p-8 rounded-[20px] w-full max-w-[380px] text-center shadow-2xl">
        <h2 className="text-3xl font-extrabold tracking-tight mb-1 text-white lowercase">
          {isRecovering ? 'reset password' : isSignUpMode ? 'create account' : 'onyx'}
        </h2>
        <p className="text-xs text-[#71717a] mb-5">
          {isRecovering ? 'enter your email to receive a reset link' : isSignUpMode ? 'fill details to join onyx' : 'sign in to continue'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
          <input
            type="email"
            aria-label="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email address..."
            required
            className="w-full px-4 py-3 bg-[#0b0b0e] border border-[#27272a] focus:border-[#52525b] rounded-xl text-white text-sm outline-none transition-colors"
          />
          {!isRecovering && (
            <input
              type="password"
              aria-label="Password"
              autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password..."
              required
              className="w-full px-4 py-3 bg-[#0b0b0e] border border-[#27272a] focus:border-[#52525b] rounded-xl text-white text-sm outline-none transition-colors"
            />
          )}

          {isSignUpMode && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="unique username..."
                maxLength={15}
                required
                className="w-full px-4 py-3 bg-[#0b0b0e] border border-[#27272a] focus:border-[#52525b] rounded-xl text-white text-sm outline-none transition-colors"
              />

              <div className="text-left">
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

              {uploadedImageData && (
                <div className="flex justify-center my-1">
                  <img
                    src={uploadedImageData}
                    alt="preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#3f3f46]"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1f1f24] hover:bg-[#27272a] border border-[#27272a] hover:border-[#3f3f46] text-white rounded-xl font-semibold text-sm transition-all mt-1 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'processing...' : isRecovering ? 'send reset link' : isSignUpMode ? 'sign up' : 'sign in'}
          </button>
        </form>

        {!isSignUpMode && !isRecovering && (
          <button
            type="button"
            disabled={loading}
            onClick={() => { setPassword(''); setIsRecovering(true); }}
            className="block mx-auto mt-4 text-xs text-[#a1a1aa] hover:text-white underline cursor-pointer"
          >
            forgot password?
          </button>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setPassword('');
            if (isRecovering) setIsRecovering(false);
            else setIsSignUpMode(!isSignUpMode);
          }}
          className="text-xs text-[#71717a] hover:text-[#a1a1aa] mt-4 cursor-pointer underline transition-colors"
        >
          {isRecovering ? 'back to sign in' : isSignUpMode ? 'already have an account? sign in' : 'need an account? sign up'}
        </button>
      </div>
    </div>
  );
};
