import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export async function findUserDocByUsername(username: string): Promise<{ id: string; data: any } | null> {
  if (!username) return null;
  const clean = username.trim().toLowerCase();

  try {
    const q1 = query(collection(db, 'users'), where('username', '==', clean));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return { id: snap1.docs[0].id, data: snap1.docs[0].data() };
    }

    const q2 = query(collection(db, 'users'), where('username', '==', username.trim()));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return { id: snap2.docs[0].id, data: snap2.docs[0].data() };
    }

    const allSnap = await getDocs(collection(db, 'users'));
    for (const docSnap of allSnap.docs) {
      const d = docSnap.data();
      if (d.username && d.username.toLowerCase() === clean) {
        return { id: docSnap.id, data: d };
      }
    }
  } catch (e) {
    console.error('Error finding user doc by username:', e);
  }

  return null;
}

export function sanitizeFlashUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) {
    return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  }
  const clean = rawUrl.trim();
  const lower = clean.toLowerCase();

  if (lower === '1' || lower === 'youtube' || lower === 'yt') {
    return 'https://www.youtube.com';
  }
  if (lower === '2' || lower === 'twitter' || lower === 'x') {
    return 'https://x.com';
  }
  if (lower === '3' || lower === 'github') {
    return 'https://github.com';
  }
  if (lower === '4' || lower === 'google') {
    return 'https://www.google.com';
  }
  if (lower === '5' || lower === 'rickroll') {
    return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  }

  if (!/^https?:\/\//i.test(clean)) {
    return 'https://' + clean;
  }
  return clean;
}
