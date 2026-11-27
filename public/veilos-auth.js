import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-analytics.js";

const OWNER_EMAIL = "678.gxvin@gmail.com";
const ACCOUNT_STORAGE_KEY = "veilos_account";
const VIP_CACHE_KEY = "veilos_vip_cache";

const ACCOUNT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAAz-6-OWxOK-wlk5WsVDFLhf7bGt57ebs",
  authDomain: "onyxchat-4dbe4.firebaseapp.com",
  databaseURL: "https://onyxchat-4dbe4-default-rtdb.firebaseio.com",
  projectId: "onyxchat-4dbe4",
  storageBucket: "onyxchat-4dbe4.firebasestorage.app",
  messagingSenderId: "247360337566",
  appId: "1:247360337566:web:c98e51aeef806223d32d8f",
  measurementId: "G-VLVS9Y1VNE",
};

const VIP_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBS8DrJzebey-NfJp86zvPBio9TRj-MEU8",
  authDomain: "vip-veilos.firebaseapp.com",
  projectId: "vip-veilos",
  storageBucket: "vip-veilos.firebasestorage.app",
  messagingSenderId: "870063245200",
  appId: "1:870063245200:web:db168c3cdcacff67359515",
  measurementId: "G-M2JMWC6W4C",
};

const accountApp = initializeApp(ACCOUNT_FIREBASE_CONFIG);
const accountAuth = getAuth(accountApp);
const accountDb = getFirestore(accountApp);

const vipApp = initializeApp(VIP_FIREBASE_CONFIG, "vip-veilos");
// Note: vip-veilos does not have a Cloud Firestore database provisioned (returns 404 NOT_FOUND),
// so VIP codes, grants, and pending email grants persist in the active accountDb Firestore alongside users.
const vipDb = accountDb;
isAnalyticsSupported()
  .then((ok) => {
    if (ok) getAnalytics(vipApp);
  })
  .catch(() => {});

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeJsonStorage(key, val) {
  try {
    if (val === null || val === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch (_) {}
}

function isGrantActive(grant) {
  if (!grant || grant.active !== true) return false;
  if (grant.expiresAt && Number(grant.expiresAt) <= Date.now()) return false;
  return true;
}

const listeners = new Set();
let unsubUserDoc = null;
let unsubVipGrant = null;

const initialCachedAccount = readJsonStorage(ACCOUNT_STORAGE_KEY);
const initialCachedVip = readJsonStorage(VIP_CACHE_KEY);

const state = {
  ready: false,
  mode: initialCachedAccount?.mode === "guest" ? "guest" : (initialCachedAccount?.mode === "account" ? "signed_in" : "signed_out"),
  user: initialCachedAccount?.mode === "account"
    ? {
        uid: initialCachedAccount.uid || null,
        username: initialCachedAccount.username || "Veil User",
        email: (initialCachedAccount.email || "").toLowerCase(),
        photoURL: initialCachedAccount.photoURL || "",
        role: "user",
        roles: [],
      }
    : null,
  vipGrant: (initialCachedAccount?.mode === "account" && initialCachedVip && initialCachedVip.uid === initialCachedAccount.uid)
    ? initialCachedVip
    : null,
};

function isVerifiedOwner() {
  const cur = accountAuth.currentUser;
  return Boolean(cur && cur.email && cur.email.trim().toLowerCase() === OWNER_EMAIL);
}

function computeSnapshot() {
  const isOwner = isVerifiedOwner();
  const isSignedIn = state.mode === "signed_in" && Boolean(state.user && state.user.uid);
  const isVip = isSignedIn && isGrantActive(state.vipGrant);
  return {
    ready: state.ready,
    mode: state.mode,
    user: state.user ? { ...state.user } : null,
    vip: state.vipGrant ? { ...state.vipGrant } : null,
    isSignedIn,
    isGuest: state.mode === "guest",
    isVip,
    isOwner,
    hasVipAccess: Boolean(isOwner || isVip),
  };
}

function emitChange() {
  const snap = computeSnapshot();
  if (typeof window !== "undefined") {
    try {
      if (window.store) {
        if (snap.isSignedIn && snap.user?.username) {
          window.store.osUsername = snap.user.username;
        } else if (snap.isGuest) {
          window.store.osUsername = "Guest";
        } else if (!snap.isSignedIn && window.store.osUsername !== "Veil User") {
          window.store.osUsername = "Veil User";
        }
      }
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("veilos-auth-change", { detail: snap }));
  }
  listeners.forEach((cb) => {
    try {
      cb(snap);
    } catch (_) {}
  });
}

function cleanupRealtimeSubs() {
  if (unsubUserDoc) {
    try { unsubUserDoc(); } catch (_) {}
    unsubUserDoc = null;
  }
  if (unsubVipGrant) {
    try { unsubVipGrant(); } catch (_) {}
    unsubVipGrant = null;
  }
}

async function claimPendingEmailVipIfAny(uid, email) {
  if (!uid || !email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const pendingRef = doc(vipDb, "vip_pending_emails", cleanEmail);
    const pendingSnap = await getDoc(pendingRef);
    if (!pendingSnap.exists()) return;
    const pending = pendingSnap.data() || {};
    const grantRef = doc(vipDb, "vip_grants", uid);
    const grantSnap = await getDoc(grantRef);
    const existingUpdatedAt = grantSnap.exists() ? Number(grantSnap.data()?.updatedAt || 0) : 0;
    const pendingTime = Number(pending.updatedAt || pending.grantedAt || 0);
    if (!grantSnap.exists() || pendingTime >= existingUpdatedAt) {
      const now = Date.now();
      const grantPayload = {
        uid,
        email: cleanEmail,
        username: state.user?.username || "",
        active: Boolean(pending.active),
        expiresAt: pending.active && pending.expiresAt ? Number(pending.expiresAt) : null,
        grantedBy: pending.grantedBy || `owner:${OWNER_EMAIL}`,
        codeUsed: pending.codeUsed || null,
        grantedAt: pending.grantedAt || now,
        updatedAt: now,
      };
      await setDoc(grantRef, grantPayload, { merge: true });
      await setDoc(
        doc(accountDb, "users", uid),
        {
          vipActive: grantPayload.active,
          vipExpiresAt: grantPayload.expiresAt,
          vipGrantedBy: grantPayload.grantedBy,
          vipCodeUsed: grantPayload.codeUsed,
          vipUpdatedAt: now,
        },
        { merge: true }
      ).catch(() => {});
    }
    await deleteDoc(pendingRef).catch(() => {});
  } catch (err) {
    console.warn("[VeilAuth] claimPendingEmailVipIfAny error:", err);
  }
}

function attachUserRealtimeListeners(fbUser) {
  cleanupRealtimeSubs();
  const normalizedEmail = (fbUser.email || "").trim().toLowerCase();
  const userDocRef = doc(accountDb, "users", fbUser.uid);

  let grantDocVip = null;
  let userDocVip = null;

  const syncMergedVipGrant = () => {
    let chosen = null;
    if (grantDocVip && userDocVip) {
      chosen = Number(userDocVip.updatedAt || 0) > Number(grantDocVip.updatedAt || 0) ? userDocVip : grantDocVip;
    } else {
      chosen = grantDocVip || userDocVip || null;
    }
    state.vipGrant = chosen ? { ...chosen, uid: fbUser.uid } : null;
    writeJsonStorage(VIP_CACHE_KEY, state.vipGrant);
  };

  unsubUserDoc = onSnapshot(
    userDocRef,
    async (snap) => {
      let uData = {};
      if (snap.exists()) {
        uData = snap.data() || {};
        if (normalizedEmail && uData.email !== normalizedEmail) {
          setDoc(userDocRef, { email: normalizedEmail }, { merge: true }).catch(() => {});
        }
      } else {
        const fallbackName = (fbUser.displayName || normalizedEmail.split("@")[0] || `user_${fbUser.uid.slice(0, 5)}`).toLowerCase();
        uData = {
          uid: fbUser.uid,
          username: fallbackName,
          email: normalizedEmail,
          photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${fbUser.uid}`,
          role: "user",
          roles: ["beta tester"],
          banned: false,
          createdAt: new Date(),
        };
        await setDoc(userDocRef, uData, { merge: true }).catch(() => {});
      }

      if (uData.banned) {
        writeJsonStorage(ACCOUNT_STORAGE_KEY, null);
        writeJsonStorage(VIP_CACHE_KEY, null);
        await fbSignOut(accountAuth).catch(() => {});
        state.mode = "signed_out";
        state.user = null;
        state.vipGrant = null;
        state.ready = true;
        emitChange();
        return;
      }

      if (uData.vipActive !== undefined) {
        userDocVip = {
          uid: fbUser.uid,
          active: Boolean(uData.vipActive),
          expiresAt: uData.vipExpiresAt || null,
          grantedBy: uData.vipGrantedBy || "",
          codeUsed: uData.vipCodeUsed || null,
          updatedAt: Number(uData.vipUpdatedAt || 0),
        };
      } else {
        userDocVip = null;
      }
      syncMergedVipGrant();

      const username = uData.username || fbUser.displayName || normalizedEmail.split("@")[0] || "Veil User";
      const photoURL = uData.photoURL || fbUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${fbUser.uid}`;
      const accountPayload = {
        mode: "account",
        uid: fbUser.uid,
        username,
        email: normalizedEmail || uData.email || "",
        photoURL,
        updatedAt: Date.now(),
      };

      state.mode = "signed_in";
      state.user = {
        uid: fbUser.uid,
        username,
        email: accountPayload.email,
        photoURL,
        role: uData.role || "user",
        roles: Array.isArray(uData.roles) ? uData.roles : [],
      };
      state.ready = true;
      writeJsonStorage(ACCOUNT_STORAGE_KEY, accountPayload);
      try {
        localStorage.setItem("osUsername", username);
      } catch (_) {}
      emitChange();
    },
    (err) => {
      console.warn("[VeilAuth] User doc listener error:", err);
      state.ready = true;
      emitChange();
    }
  );

  const vipGrantRef = doc(vipDb, "vip_grants", fbUser.uid);
  claimPendingEmailVipIfAny(fbUser.uid, normalizedEmail);
  unsubVipGrant = onSnapshot(
    vipGrantRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() || {};
        grantDocVip = {
          uid: fbUser.uid,
          active: Boolean(data.active),
          expiresAt: data.expiresAt || null,
          grantedBy: data.grantedBy || "",
          codeUsed: data.codeUsed || null,
          updatedAt: Number(data.updatedAt || Date.now()),
        };
      } else {
        grantDocVip = null;
      }
      syncMergedVipGrant();
      emitChange();
    },
    (err) => {
      console.warn("[VeilAuth] VIP grant listener error:", err);
    }
  );
}

onAuthStateChanged(accountAuth, (fbUser) => {
  if (fbUser) {
    attachUserRealtimeListeners(fbUser);
  } else {
    cleanupRealtimeSubs();
    const cached = readJsonStorage(ACCOUNT_STORAGE_KEY);
    if (cached && cached.mode === "guest") {
      state.mode = "guest";
      state.user = { uid: null, username: "Guest", email: "", photoURL: "", role: "guest", roles: [] };
    } else {
      state.mode = "signed_out";
      state.user = null;
      writeJsonStorage(ACCOUNT_STORAGE_KEY, null);
    }
    state.vipGrant = null;
    writeJsonStorage(VIP_CACHE_KEY, null);
    state.ready = true;
    emitChange();
  }
});

if (typeof window !== "undefined") {
  const syncFromExternalAccountStorage = () => {
    const cached = readJsonStorage(ACCOUNT_STORAGE_KEY);
    if (!accountAuth.currentUser) {
      if (cached && cached.mode === "guest") {
        state.mode = "guest";
        state.user = { uid: null, username: "Guest", email: "", photoURL: "", role: "guest", roles: [] };
      } else if (cached && cached.mode === "account" && cached.uid) {
        state.mode = "signed_in";
        state.user = {
          uid: cached.uid,
          username: cached.username || "Veil User",
          email: (cached.email || "").toLowerCase(),
          photoURL: cached.photoURL || "",
          role: "user",
          roles: [],
        };
      } else if (!cached) {
        state.mode = "signed_out";
        state.user = null;
      }
      emitChange();
    } else if (!cached) {
      fbSignOut(accountAuth).catch(() => {});
    }
  };
  window.addEventListener("storage", (e) => {
    if (e.key === ACCOUNT_STORAGE_KEY) syncFromExternalAccountStorage();
  });
  window.addEventListener("veilos-account-sync", syncFromExternalAccountStorage);
}

async function compressAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 240;
        let w = img.width;
        let h = img.height;
        if (w > h && w > max) {
          h = Math.round((h * max) / w);
          w = max;
        } else if (h > max) {
          w = Math.round((w * max) / h);
          h = max;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function signIn(email, password) {
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail || !password) {
    throw new Error("Please enter both email and password.");
  }
  const cred = await signInWithEmailAndPassword(accountAuth, cleanEmail, password);
  attachUserRealtimeListeners(cred.user);
  return cred.user;
}

async function signUp({ email, password, username, avatarFile }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanUsername = String(username || "").trim().toLowerCase();
  if (!cleanEmail || !password || !cleanUsername) {
    throw new Error("Please complete email, password, and username.");
  }
  if (!/^[a-z0-9_.-]{2,20}$/.test(cleanUsername)) {
    throw new Error("Username must be 2–20 characters (letters, numbers, _, ., -).");
  }

  const existingSnap = await getDocs(
    query(collection(accountDb, "users"), where("username", "==", cleanUsername))
  );
  if (!existingSnap.empty) {
    throw new Error("That username is already taken. Please pick another one.");
  }

  let avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanUsername)}`;
  if (avatarFile) {
    try {
      avatarUrl = await compressAvatarFile(avatarFile);
    } catch (_) {}
  }

  const cred = await createUserWithEmailAndPassword(accountAuth, cleanEmail, password);
  await updateProfile(cred.user, { displayName: cleanUsername });

  let nextJoinNumber = 1;
  try {
    const allUsersSnap = await getDocs(collection(accountDb, "users"));
    nextJoinNumber = allUsersSnap.size + 1;
  } catch (_) {}

  await setDoc(doc(accountDb, "users", cred.user.uid), {
    uid: cred.user.uid,
    username: cleanUsername,
    email: cleanEmail,
    photoURL: avatarUrl,
    role: "user",
    roles: ["beta tester"],
    banned: false,
    accountNumber: Math.floor(Math.random() * 89) + 10,
    joinNumber: nextJoinNumber,
    joinedDate: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    views: 0,
    createdAt: new Date(),
  });

  attachUserRealtimeListeners(cred.user);
  return cred.user;
}

async function continueAsGuest() {
  if (accountAuth.currentUser) {
    await fbSignOut(accountAuth).catch(() => {});
  }
  cleanupRealtimeSubs();
  const guestPayload = {
    mode: "guest",
    uid: null,
    username: "Guest",
    email: "",
    photoURL: "",
    updatedAt: Date.now(),
  };
  writeJsonStorage(ACCOUNT_STORAGE_KEY, guestPayload);
  writeJsonStorage(VIP_CACHE_KEY, null);
  state.mode = "guest";
  state.user = { uid: null, username: "Guest", email: "", photoURL: "", role: "guest", roles: [] };
  state.vipGrant = null;
  state.ready = true;
  emitChange();
  return computeSnapshot();
}

async function signOut() {
  cleanupRealtimeSubs();
  writeJsonStorage(ACCOUNT_STORAGE_KEY, null);
  writeJsonStorage(VIP_CACHE_KEY, null);
  if (accountAuth.currentUser) {
    await fbSignOut(accountAuth).catch(() => {});
  }
  state.mode = "signed_out";
  state.user = null;
  state.vipGrant = null;
  state.ready = true;
  emitChange();
  return computeSnapshot();
}

async function redeemVipCode(rawCode) {
  const curUser = accountAuth.currentUser;
  if (!curUser) {
    throw new Error("Sign in with an Onyx Chat account first to redeem a VIP code.");
  }
  const normalizedCode = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(normalizedCode)) {
    throw new Error("Enter a valid VIP code (3–40 letters, numbers, dashes, or underscores).");
  }

  const codeRef = doc(vipDb, "vip_codes", normalizedCode);
  const grantRef = doc(vipDb, "vip_grants", curUser.uid);
  const userRef = doc(accountDb, "users", curUser.uid);

  const result = await runTransaction(vipDb, async (tx) => {
    const codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists()) {
      throw new Error("Invalid VIP code. Check spelling and try again.");
    }
    const c = codeSnap.data() || {};
    if (c.active === false) {
      throw new Error("This VIP code is currently disabled.");
    }
    if (c.expiresAt && Number(c.expiresAt) <= Date.now()) {
      throw new Error("This VIP code has expired.");
    }
    const usedCount = Number(c.usedCount || 0);
    const maxUses = c.maxUses === null || c.maxUses === undefined ? null : Number(c.maxUses);
    if (maxUses !== null && usedCount >= maxUses) {
      throw new Error("This VIP code has reached its maximum usage limit.");
    }
    const redeemedBy = Array.isArray(c.redeemedBy) ? c.redeemedBy : [];
    if (redeemedBy.includes(curUser.uid)) {
      throw new Error("You have already redeemed this VIP code.");
    }

    const now = Date.now();
    const nextUsed = usedCount + 1;
    const nextRedeemedBy = [...redeemedBy, curUser.uid];
    tx.update(codeRef, {
      usedCount: nextUsed,
      redeemedBy: nextRedeemedBy,
      updatedAt: now,
    });

    const newGrant = {
      uid: curUser.uid,
      email: (curUser.email || state.user?.email || "").trim().toLowerCase(),
      username: (state.user?.username || curUser.displayName || "").trim().toLowerCase(),
      active: true,
      expiresAt: c.expiresAt ? Number(c.expiresAt) : null,
      grantedBy: `code:${normalizedCode}`,
      codeUsed: normalizedCode,
      grantedAt: now,
      updatedAt: now,
    };
    tx.set(grantRef, newGrant, { merge: true });
    tx.set(
      userRef,
      {
        vipActive: true,
        vipExpiresAt: newGrant.expiresAt,
        vipGrantedBy: newGrant.grantedBy,
        vipCodeUsed: normalizedCode,
        vipUpdatedAt: now,
      },
      { merge: true }
    );
    // Intentionally return only public redemption fields; ownerNote stays strictly owner-only.
    return {
      code: normalizedCode,
      expiresAt: newGrant.expiresAt,
      grant: newGrant,
    };
  });

  state.vipGrant = { ...result.grant };
  writeJsonStorage(VIP_CACHE_KEY, state.vipGrant);
  emitChange();

  return {
    code: result.code,
    expiresAt: result.expiresAt,
  };
}

function assertOwner() {
  if (!isVerifiedOwner()) {
    throw new Error(`Owner access denied. Sign in as ${OWNER_EMAIL}.`);
  }
}

async function ownerListUsers() {
  assertOwner();
  const [usersSnap, grantsSnap] = await Promise.all([
    getDocs(collection(accountDb, "users")),
    getDocs(collection(vipDb, "vip_grants")),
  ]);

  const grantMap = new Map();
  grantsSnap.forEach((d) => {
    grantMap.set(d.id, d.data());
  });

  const list = [];
  usersSnap.forEach((d) => {
    const u = d.data() || {};
    const uid = u.uid || d.id;
    const grantDoc = grantMap.get(uid) || null;
    const userDocGrant =
      u.vipActive !== undefined
        ? {
            active: Boolean(u.vipActive),
            expiresAt: u.vipExpiresAt || null,
            grantedBy: u.vipGrantedBy || null,
            updatedAt: Number(u.vipUpdatedAt || 0),
          }
        : null;

    let grant = grantDoc;
    if (grantDoc && userDocGrant) {
      grant = Number(userDocGrant.updatedAt || 0) > Number(grantDoc.updatedAt || 0) ? userDocGrant : grantDoc;
    } else if (!grantDoc && userDocGrant) {
      grant = userDocGrant;
    }

    list.push({
      uid,
      username: u.username || "unknown",
      email: (u.email || "").toLowerCase(),
      photoURL: u.photoURL || "",
      role: u.role || "user",
      vipActive: isGrantActive(grant),
      vipExpiresAt: grant?.expiresAt || null,
      vipGrantedBy: grant?.grantedBy || null,
    });
  });

  list.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
  return list;
}

async function applyUserVipGrant({ uid, email, username, active, expiresAt }) {
  const now = Date.now();
  const cleanUid = String(uid || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanUsername = String(username || "").trim().toLowerCase();
  const nextActive = Boolean(active);
  const nextExpiresAt = nextActive && expiresAt ? Number(expiresAt) : null;
  const grantedBy = `owner:${OWNER_EMAIL}`;

  const grantPayload = {
    uid: cleanUid,
    email: cleanEmail,
    username: cleanUsername,
    active: nextActive,
    expiresAt: nextExpiresAt,
    grantedBy,
    codeUsed: null,
    grantedAt: now,
    updatedAt: now,
  };

  await Promise.all([
    setDoc(doc(vipDb, "vip_grants", cleanUid), grantPayload, { merge: true }),
    setDoc(
      doc(accountDb, "users", cleanUid),
      {
        vipActive: nextActive,
        vipExpiresAt: nextExpiresAt,
        vipGrantedBy: grantedBy,
        vipCodeUsed: null,
        vipUpdatedAt: now,
      },
      { merge: true }
    ),
  ]);

  if (accountAuth.currentUser && accountAuth.currentUser.uid === cleanUid) {
    state.vipGrant = { ...grantPayload };
    writeJsonStorage(VIP_CACHE_KEY, state.vipGrant);
    emitChange();
  }

  return grantPayload;
}

async function ownerSetUserVip(target, active, expiresAt = null) {
  assertOwner();
  const targetUid = target?.uid ? String(target.uid).trim() : "";
  const targetEmail = target?.email ? String(target.email).trim().toLowerCase() : "";
  const targetUsername = target?.username ? String(target.username).trim().toLowerCase() : "";

  if (targetUid) {
    await applyUserVipGrant({
      uid: targetUid,
      email: targetEmail,
      username: targetUsername,
      active,
      expiresAt,
    });
    return { ok: true, uid: targetUid };
  }

  if (targetEmail) {
    let matchedDoc = null;
    const matched = await getDocs(
      query(collection(accountDb, "users"), where("email", "==", targetEmail))
    );
    if (!matched.empty) {
      matchedDoc = matched.docs[0];
    } else {
      // Fallback case-insensitive lookup in case an older user record stored mixed-case email
      const allUsers = await getDocs(collection(accountDb, "users"));
      matchedDoc =
        allUsers.docs.find((d) => (d.data()?.email || "").trim().toLowerCase() === targetEmail) || null;
    }

    if (matchedDoc) {
      const u = matchedDoc.data() || {};
      const uid = u.uid || matchedDoc.id;
      await applyUserVipGrant({
        uid,
        email: targetEmail,
        username: u.username || targetUsername,
        active,
        expiresAt,
      });
      await deleteDoc(doc(vipDb, "vip_pending_emails", targetEmail)).catch(() => {});
      return { ok: true, uid };
    }

    const now = Date.now();
    await setDoc(doc(vipDb, "vip_pending_emails", targetEmail), {
      email: targetEmail,
      active: Boolean(active),
      expiresAt: active && expiresAt ? Number(expiresAt) : null,
      grantedBy: `owner:${OWNER_EMAIL}`,
      grantedAt: now,
      updatedAt: now,
    });
    return { ok: true, pendingEmail: targetEmail };
  }

  throw new Error("Target user UID or email is required.");
}

async function ownerListVipCodes() {
  assertOwner();
  const snap = await getDocs(collection(vipDb, "vip_codes"));
  const list = [];
  snap.forEach((d) => {
    const c = d.data() || {};
    list.push({
      code: c.code || d.id,
      active: c.active !== false,
      maxUses: c.maxUses === null || c.maxUses === undefined ? null : Number(c.maxUses),
      usedCount: Number(c.usedCount || 0),
      redeemedBy: Array.isArray(c.redeemedBy) ? c.redeemedBy : [],
      expiresAt: c.expiresAt ? Number(c.expiresAt) : null,
      ownerNote: typeof c.ownerNote === "string" ? c.ownerNote : "",
      createdBy: c.createdBy || OWNER_EMAIL,
      createdAt: Number(c.createdAt || 0),
    });
  });
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}

async function ownerCreateVipCode({ code, maxUses, expiresAt, ownerNote }) {
  assertOwner();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(cleanCode)) {
    throw new Error("Code must be 3–40 uppercase letters, numbers, dashes, or underscores.");
  }

  let normalizedMaxUses = null;
  if (maxUses !== null && maxUses !== undefined && maxUses !== "") {
    const parsed = Number(maxUses);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error("Usage amount must be a whole number of at least 1, or Unlimited.");
    }
    normalizedMaxUses = parsed;
  }

  let normalizedExpiresAt = null;
  if (expiresAt !== null && expiresAt !== undefined && expiresAt !== "") {
    const ts = Number(expiresAt);
    if (!Number.isFinite(ts) || ts <= Date.now()) {
      throw new Error("Expiration date/time must be in the future.");
    }
    normalizedExpiresAt = ts;
  }

  const ref = doc(vipDb, "vip_codes", cleanCode);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error(`VIP code "${cleanCode}" already exists.`);
  }

  const payload = {
    code: cleanCode,
    active: true,
    maxUses: normalizedMaxUses,
    usedCount: 0,
    redeemedBy: [],
    expiresAt: normalizedExpiresAt,
    ownerNote: String(ownerNote || "").trim().slice(0, 500),
    createdBy: OWNER_EMAIL,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(ref, payload);
  return payload;
}

async function ownerToggleVipCode(code, active) {
  assertOwner();
  const cleanCode = String(code || "").trim().toUpperCase();
  await updateDoc(doc(vipDb, "vip_codes", cleanCode), {
    active: Boolean(active),
    updatedAt: Date.now(),
  });
}

async function ownerDeleteVipCode(code) {
  assertOwner();
  const cleanCode = String(code || "").trim().toUpperCase();
  await deleteDoc(doc(vipDb, "vip_codes", cleanCode));
}

function generateRandomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n) => {
    let out = "";
    for (let i = 0; i < n; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  };
  return `VEIL-${pick(4)}-${pick(4)}`;
}

const VeilAuth = {
  OWNER_EMAIL,
  getState: computeSnapshot,
  isVip: () => computeSnapshot().isVip,
  isOwner: () => computeSnapshot().isOwner,
  hasVipAccess: () => computeSnapshot().hasVipAccess,
  subscribe(cb) {
    if (typeof cb !== "function") return () => {};
    listeners.add(cb);
    try {
      cb(computeSnapshot());
    } catch (_) {}
    return () => listeners.delete(cb);
  },
  signIn,
  signUp,
  continueAsGuest,
  signOut,
  redeemVipCode,
  ownerListUsers,
  ownerSetUserVip,
  ownerListVipCodes,
  ownerCreateVipCode,
  ownerToggleVipCode,
  ownerDeleteVipCode,
  generateRandomCode,
};

if (typeof window !== "undefined") {
  window.VeilAuth = VeilAuth;
  window.dispatchEvent(new CustomEvent("veilos-auth-ready", { detail: VeilAuth }));
}

export default VeilAuth;
