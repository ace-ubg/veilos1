import {
	initializeApp,
	getApps,
	getApp,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
	getAuth,
	setPersistence,
	browserLocalPersistence,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	updateProfile,
	signOut as fbSignOut,
	onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
	getFirestore,
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	onSnapshot,
	runTransaction,
	arrayUnion,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const OWNER_EMAIL = "678.gxvin@gmail.com";
const ACCOUNT_STORAGE_KEY = "veilos_account";

// Account Firebase Config (Onyx Chat project - shared Auth/Users with /chat.html)
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

// VIP Firebase Config (Dedicated VIP & Owner Codes project)
const VIP_FIREBASE_CONFIG = {
	apiKey: "AIzaSyBS8DrJzebey-NfJp86zvPBio9TRj-MEU8",
	authDomain: "vip-veilos.firebaseapp.com",
	projectId: "vip-veilos",
	storageBucket: "vip-veilos.firebasestorage.app",
	messagingSenderId: "870063245200",
	appId: "1:870063245200:web:db168c3cdcacff67359515",
	measurementId: "G-M2JMWC6W4C",
};

const accountApp = getApps().some((a) => a.name === "[DEFAULT]")
	? getApp("[DEFAULT]")
	: initializeApp(ACCOUNT_FIREBASE_CONFIG);

const vipApp = getApps().some((a) => a.name === "vip-veilos")
	? getApp("vip-veilos")
	: initializeApp(VIP_FIREBASE_CONFIG, "vip-veilos");

const accountAuth = getAuth(accountApp);
const accountDb = getFirestore(accountApp);
const vipDb = getFirestore(vipApp);

setPersistence(accountAuth, browserLocalPersistence).catch(() => {});

function normalizeEmail(email) {
	return String(email || "").trim().toLowerCase();
}

function isOwnerEmail(email) {
	return normalizeEmail(email) === OWNER_EMAIL;
}

function readStoredAccount() {
	try {
		const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") {
			return parsed;
		}
	} catch (_) {}
	return null;
}

function writeStoredAccount(snapshot) {
	try {
		if (!snapshot) {
			localStorage.removeItem(ACCOUNT_STORAGE_KEY);
			return;
		}
		// Never persist owner-only fields or secrets; keep safe session summary
		const safeObj = {
			mode: snapshot.mode,
			uid: snapshot.uid || null,
			email: snapshot.email || null,
			username: snapshot.username || null,
			photoURL: snapshot.photoURL || null,
			role: snapshot.role || null,
			roles: Array.isArray(snapshot.roles) ? snapshot.roles : [],
			isVip: Boolean(snapshot.isVip),
			isOwner: Boolean(snapshot.isOwner),
			vipExpiresAt: snapshot.vipExpiresAt || null,
			vipSource: snapshot.vipSource || null,
			updatedAt: Date.now(),
		};
		localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(safeObj));
	} catch (_) {}
}

function isMemberActive(data) {
	if (!data || data.active !== true) return false;
	if (data.expiresAt && Date.now() >= Number(data.expiresAt)) return false;
	return true;
}

function defaultAvatarFor(seed) {
	return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed || "veilos")}`;
}

function createInitialState() {
	const stored = readStoredAccount();
	if (stored && stored.mode === "guest") {
		return {
			ready: false,
			mode: "guest",
			uid: null,
			email: null,
			username: "Guest",
			photoURL: null,
			role: "guest",
			roles: [],
			isVip: false,
			isOwner: false,
			vipExpiresAt: null,
			vipSource: null,
			error: null,
		};
	}
	if (stored && stored.mode === "account" && stored.uid) {
		return {
			ready: false,
			mode: "account",
			uid: stored.uid,
			email: stored.email || null,
			username: stored.username || "Veil User",
			photoURL: stored.photoURL || defaultAvatarFor(stored.uid),
			role: stored.role || "user",
			roles: Array.isArray(stored.roles) ? stored.roles : [],
			isVip: false,
			isOwner: false,
			vipExpiresAt: null,
			vipSource: null,
			error: null,
		};
	}
	return {
		ready: false,
		mode: "signed_out",
		uid: null,
		email: null,
		username: "Veil User",
		photoURL: null,
		role: null,
		roles: [],
		isVip: false,
		isOwner: false,
		vipExpiresAt: null,
		vipSource: null,
		error: null,
	};
}

let state = createInitialState();
const listeners = new Set();
let unsubUserDoc = null;
let unsubVipUidDoc = null;
let unsubVipEmailDoc = null;
let currentUserDocData = null;
let currentVipUidData = null;
let currentVipEmailData = null;

function syncStoreUsername() {
	try {
		if (typeof window !== "undefined" && window.store) {
			if (state.mode === "account" && state.username) {
				window.store.osUsername = state.username;
			} else if (state.mode === "guest") {
				window.store.osUsername = "Guest";
			} else {
				window.store.osUsername = "Veil User";
			}
		}
	} catch (_) {}
}

function emitState() {
	syncStoreUsername();
	const snapshot = { ...state, roles: [...(state.roles || [])] };
	listeners.forEach((fn) => {
		try {
			fn(snapshot);
		} catch (e) {
			console.error("[VeilAuth listener error]", e);
		}
	});
}

function recomputeAccountState(authUser) {
	if (!authUser) {
		const stored = readStoredAccount();
		const nextMode = stored && stored.mode === "guest" ? "guest" : "signed_out";
		state = {
			ready: true,
			mode: nextMode,
			uid: null,
			email: null,
			username: nextMode === "guest" ? "Guest" : "Veil User",
			photoURL: null,
			role: nextMode === "guest" ? "guest" : null,
			roles: [],
			isVip: false,
			isOwner: false,
			vipExpiresAt: null,
			vipSource: null,
			error: null,
		};
		if (nextMode === "guest") {
			writeStoredAccount(state);
		} else {
			writeStoredAccount(null);
		}
		emitState();
		return;
	}

	const uData = currentUserDocData || {};
	const email = authUser.email || uData.email || null;
	const owner = isOwnerEmail(email);
	const userRoles = Array.isArray(uData.roles)
		? uData.roles.map((r) => String(r).toLowerCase())
		: [];
	const userRole = uData.role ? String(uData.role).toLowerCase() : "user";

	const uidMember = currentVipUidData;
	const emailMember = currentVipEmailData;
	const uidActive = isMemberActive(uidMember);
	const emailActive = isMemberActive(emailMember);

	// Authoritative revocation check: if uidMember exists with active === false and no newer active email grant
	const explicitlyRevoked =
		uidMember &&
		uidMember.active === false &&
		!emailActive;

	let isVip = false;
	let vipExpiresAt = null;
	let vipSource = null;

	if (owner) {
		isVip = true;
		vipExpiresAt = null;
		vipSource = "owner";
	} else if (!explicitlyRevoked && (uidActive || emailActive)) {
		const winning = uidActive ? uidMember : emailMember;
		isVip = true;
		vipExpiresAt = winning.expiresAt ? Number(winning.expiresAt) : null;
		vipSource = winning.source || "vip";
	} else if (!explicitlyRevoked && !uidMember && !emailMember) {
		if (userRole === "vip" || userRoles.includes("vip")) {
			isVip = true;
			vipSource = "role";
		}
	}

	const username =
		uData.username ||
		authUser.displayName ||
		(email ? email.split("@")[0] : `user_${authUser.uid.slice(0, 5)}`);

	state = {
		ready: true,
		mode: "account",
		uid: authUser.uid,
		email,
		username,
		photoURL: uData.photoURL || defaultAvatarFor(authUser.uid),
		role: userRole,
		roles: userRoles,
		isVip,
		isOwner: owner,
		vipExpiresAt,
		vipSource,
		error: null,
	};
	writeStoredAccount(state);
	emitState();
}

function clearSubscriptions() {
	if (unsubUserDoc) {
		unsubUserDoc();
		unsubUserDoc = null;
	}
	if (unsubVipUidDoc) {
		unsubVipUidDoc();
		unsubVipUidDoc = null;
	}
	if (unsubVipEmailDoc) {
		unsubVipEmailDoc();
		unsubVipEmailDoc = null;
	}
	currentUserDocData = null;
	currentVipUidData = null;
	currentVipEmailData = null;
}

onAuthStateChanged(accountAuth, async (user) => {
	clearSubscriptions();

	if (!user) {
		recomputeAccountState(null);
		return;
	}

	const userDocRef = doc(accountDb, "users", user.uid);
	unsubUserDoc = onSnapshot(
		userDocRef,
		async (snap) => {
			if (snap.exists()) {
				currentUserDocData = snap.data();
				if (currentUserDocData.banned) {
					await fbSignOut(accountAuth);
					state.error = "This Onyx Chat account is banned.";
					emitState();
					return;
				}
			} else {
				const fallbackName = (
					user.displayName ||
					(user.email ? user.email.split("@")[0] : `user_${user.uid.slice(0, 5)}`)
				)
					.toLowerCase()
					.replace(/[^a-z0-9_.-]/g, "")
					.slice(0, 15) || `user_${user.uid.slice(0, 5)}`;
				currentUserDocData = {
					uid: user.uid,
					username: fallbackName,
					email: normalizeEmail(user.email),
					photoURL: user.photoURL || defaultAvatarFor(user.uid),
					role: "user",
					roles: ["beta tester"],
					banned: false,
					createdAt: new Date(),
				};
				try {
					await setDoc(userDocRef, currentUserDocData, { merge: true });
				} catch (_) {}
			}
			recomputeAccountState(user);
		},
		(err) => {
			console.warn("[VeilAuth] users snapshot error:", err);
			recomputeAccountState(user);
		}
	);

	const vipUidRef = doc(vipDb, "vip_members", user.uid);
	unsubVipUidDoc = onSnapshot(
		vipUidRef,
		(snap) => {
			currentVipUidData = snap.exists() ? snap.data() : null;
			recomputeAccountState(user);
		},
		(err) => {
			console.warn("[VeilAuth] vip_members(uid) snapshot error:", err);
			recomputeAccountState(user);
		}
	);

	const normEmail = normalizeEmail(user.email);
	if (normEmail) {
		const vipEmailRef = doc(vipDb, "vip_members", `email:${normEmail}`);
		unsubVipEmailDoc = onSnapshot(
			vipEmailRef,
			async (snap) => {
				currentVipEmailData = snap.exists() ? snap.data() : null;
				// Promote email pre-assignment into uid doc if user doesn't have uid doc yet
				if (isMemberActive(currentVipEmailData) && !currentVipUidData) {
					try {
						await setDoc(
							doc(vipDb, "vip_members", user.uid),
							{
								uid: user.uid,
								email: normEmail,
								username: state.username || null,
								active: true,
								source: currentVipEmailData.source || "owner",
								expiresAt: currentVipEmailData.expiresAt || null,
								grantedBy: currentVipEmailData.grantedBy || OWNER_EMAIL,
								grantedAt: currentVipEmailData.grantedAt || Date.now(),
								updatedAt: Date.now(),
							},
							{ merge: true }
						);
					} catch (_) {}
				}
				recomputeAccountState(user);
			},
			(err) => {
				console.warn("[VeilAuth] vip_members(email) snapshot error:", err);
				recomputeAccountState(user);
			}
		);
	}

	recomputeAccountState(user);
});

async function compressAvatarFile(file, maxW = 128, maxH = 128) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Failed to read image file"));
		reader.onload = (ev) => {
			const img = new Image();
			img.onerror = () => reject(new Error("Invalid image file"));
			img.onload = () => {
				let w = img.width;
				let h = img.height;
				if (w > h && w > maxW) {
					h = Math.round((h * maxW) / w);
					w = maxW;
				} else if (h >= w && h > maxH) {
					w = Math.round((w * maxH) / h);
					h = maxH;
				}
				const canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext("2d");
				if (!ctx) return reject(new Error("Canvas unavailable"));
				ctx.drawImage(img, 0, 0, w, h);
				resolve(canvas.toDataURL("image/jpeg", 0.8));
			};
			img.src = ev.target?.result;
		};
		reader.readAsDataURL(file);
	});
}

async function isUsernameTaken(cleanUsername) {
	const q = query(collection(accountDb, "users"), where("username", "==", cleanUsername));
	const snap = await getDocs(q);
	return !snap.empty;
}

function assertOwner() {
	const user = accountAuth.currentUser;
	if (!user || !isOwnerEmail(user.email)) {
		throw new Error("Owner access required (678.gxvin@gmail.com).");
	}
	return user;
}

function generateRandomVipCode() {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	let p1 = "";
	let p2 = "";
	for (let i = 0; i < 4; i++) p1 += alphabet[bytes[i] % alphabet.length];
	for (let i = 4; i < 8; i++) p2 += alphabet[bytes[i] % alphabet.length];
	return `VEIL-${p1}-${p2}`;
}

function normalizeCodeString(raw) {
	return String(raw || "")
		.trim()
		.toUpperCase()
		.replace(/\s+/g, "");
}

const VeilAuth = {
	OWNER_EMAIL,

	getState() {
		return { ...state, roles: [...(state.roles || [])] };
	},

	subscribe(fn) {
		if (typeof fn !== "function") return () => {};
		listeners.add(fn);
		try {
			fn({ ...state, roles: [...(state.roles || [])] });
		} catch (_) {}
		return () => listeners.delete(fn);
	},

	hasVipAccess() {
		if (!accountAuth.currentUser || state.mode !== "account") return false;
		if (state.isOwner || isOwnerEmail(accountAuth.currentUser.email)) return true;
		if (!state.isVip) return false;
		if (state.vipExpiresAt && Date.now() >= Number(state.vipExpiresAt)) {
			return false;
		}
		return true;
	},

	isOwner() {
		return Boolean(
			accountAuth.currentUser &&
				state.mode === "account" &&
				(state.isOwner || isOwnerEmail(accountAuth.currentUser.email))
		);
	},

	async signIn(email, password) {
		const cleanEmail = String(email || "").trim();
		if (!cleanEmail || !password) {
			throw new Error("Please enter both email and password.");
		}
		writeStoredAccount({ mode: "signing_in" });
		const cred = await signInWithEmailAndPassword(accountAuth, cleanEmail, password);
		try {
			await setDoc(
				doc(accountDb, "users", cred.user.uid),
				{ email: normalizeEmail(cred.user.email || cleanEmail) },
				{ merge: true }
			);
		} catch (_) {}
		return cred.user;
	},

	async signUp({ email, password, username, photoDataUrl }) {
		const cleanEmail = String(email || "").trim();
		const cleanUsername = String(username || "").trim().toLowerCase();
		if (!cleanEmail || !password || !cleanUsername) {
			throw new Error("Email, password, and username are required.");
		}
		if (cleanUsername.length < 2 || cleanUsername.length > 20) {
			throw new Error("Username must be between 2 and 20 characters.");
		}
		if (!/^[a-z0-9_.-]+$/i.test(cleanUsername)) {
			throw new Error("Username may only contain letters, numbers, '.', '-', or '_'.");
		}
		const taken = await isUsernameTaken(cleanUsername);
		if (taken) {
			throw new Error("That username is already taken. Please pick another one.");
		}

		writeStoredAccount({ mode: "signing_in" });
		const res = await createUserWithEmailAndPassword(accountAuth, cleanEmail, password);
		await updateProfile(res.user, { displayName: cleanUsername });

		const avatarUrl = photoDataUrl || defaultAvatarFor(cleanUsername);
		let nextJoinNumber = 1;
		try {
			const usersSnap = await getDocs(collection(accountDb, "users"));
			nextJoinNumber = usersSnap.size + 1;
		} catch (_) {}

		await setDoc(doc(accountDb, "users", res.user.uid), {
			uid: res.user.uid,
			username: cleanUsername,
			email: normalizeEmail(cleanEmail),
			photoURL: avatarUrl,
			role: isOwnerEmail(cleanEmail) ? "owner" : "user",
			roles: isOwnerEmail(cleanEmail) ? ["owner", "vip"] : ["beta tester"],
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

		return res.user;
	},

	async continueAsGuest() {
		if (accountAuth.currentUser) {
			await fbSignOut(accountAuth);
		}
		const guestSnapshot = {
			mode: "guest",
			uid: null,
			email: null,
			username: "Guest",
			photoURL: null,
			role: "guest",
			roles: [],
			isVip: false,
			isOwner: false,
			vipExpiresAt: null,
			vipSource: null,
		};
		writeStoredAccount(guestSnapshot);
		state = { ready: true, ...guestSnapshot, error: null };
		emitState();
		return state;
	},

	async signOut() {
		writeStoredAccount(null);
		if (accountAuth.currentUser) {
			await fbSignOut(accountAuth);
		}
		state = {
			ready: true,
			mode: "signed_out",
			uid: null,
			email: null,
			username: "Veil User",
			photoURL: null,
			role: null,
			roles: [],
			isVip: false,
			isOwner: false,
			vipExpiresAt: null,
			vipSource: null,
			error: null,
		};
		emitState();
	},

	async refreshStatus() {
		const user = accountAuth.currentUser;
		if (!user) {
			recomputeAccountState(null);
			return state;
		}
		try {
			const [uSnap, vUidSnap] = await Promise.all([
				getDoc(doc(accountDb, "users", user.uid)),
				getDoc(doc(vipDb, "vip_members", user.uid)),
			]);
			if (uSnap.exists()) currentUserDocData = uSnap.data();
			currentVipUidData = vUidSnap.exists() ? vUidSnap.data() : null;
			const normEmail = normalizeEmail(user.email);
			if (normEmail) {
				const vEmailSnap = await getDoc(doc(vipDb, "vip_members", `email:${normEmail}`));
				currentVipEmailData = vEmailSnap.exists() ? vEmailSnap.data() : null;
			}
		} catch (e) {
			console.warn("[VeilAuth] refreshStatus error:", e);
		}
		recomputeAccountState(user);
		return state;
	},

	async redeemVipCode(rawCode) {
		const user = accountAuth.currentUser;
		if (!user || state.mode !== "account") {
			throw new Error("Sign in with your Onyx Chat account first to redeem a VIP code.");
		}
		const cleanCode = normalizeCodeString(rawCode);
		if (!cleanCode || cleanCode.includes("/") || cleanCode === "." || cleanCode === "..") {
			throw new Error("Please enter a valid VIP code.");
		}

		const codeRef = doc(vipDb, "vip_codes", cleanCode);
		const memberRef = doc(vipDb, "vip_members", user.uid);

		const result = await runTransaction(vipDb, async (tx) => {
			const codeSnap = await tx.get(codeRef);
			if (!codeSnap.exists()) {
				throw new Error("Invalid VIP code.");
			}
			const data = codeSnap.data() || {};
			if (data.active === false) {
				throw new Error("This VIP code has been disabled.");
			}
			const now = Date.now();
			if (data.expiresAt && now >= Number(data.expiresAt)) {
				throw new Error("This VIP code has expired.");
			}
			const usedCount = Number(data.usedCount || 0);
			const maxUses = data.maxUses != null ? Number(data.maxUses) : null;
			if (maxUses !== null && usedCount >= maxUses) {
				throw new Error("This VIP code has reached its maximum redemption limit.");
			}
			const usedBy = Array.isArray(data.usedBy) ? data.usedBy : [];
			if (usedBy.includes(user.uid)) {
				throw new Error("You have already redeemed this VIP code.");
			}

			const existingRedemptions = Array.isArray(data.redemptions) ? data.redemptions : [];
			const nextRedemptions = [
				...existingRedemptions,
				{
					uid: user.uid,
					email: normalizeEmail(user.email),
					username: state.username || user.displayName || null,
					redeemedAt: now,
				},
			];

			tx.update(codeRef, {
				usedCount: usedCount + 1,
				usedBy: [...usedBy, user.uid],
				redemptions: nextRedemptions,
				updatedAt: now,
			});

			const expiresAt = data.expiresAt ? Number(data.expiresAt) : null;
			tx.set(
				memberRef,
				{
					uid: user.uid,
					email: normalizeEmail(user.email),
					username: state.username || user.displayName || null,
					active: true,
					source: "code",
					codeUsed: cleanCode,
					expiresAt,
					grantedBy: `code:${cleanCode}`,
					grantedAt: now,
					updatedAt: now,
				},
				{ merge: true }
			);

			// Never return ownerNote from redemption
			return { ok: true, code: cleanCode, expiresAt };
		});

		// Best-effort sync 'vip' role in Onyx Chat users doc
		try {
			await setDoc(
				doc(accountDb, "users", user.uid),
				{ roles: arrayUnion("vip") },
				{ merge: true }
			);
		} catch (_) {}

		await this.refreshStatus();
		return result;
	},

	// ============================
	// OWNER-ONLY OPERATIONS
	// ============================
	generateRandomVipCode,

	async listOnyxUsersWithVip() {
		assertOwner();
		const [usersSnap, vipSnap] = await Promise.all([
			getDocs(collection(accountDb, "users")),
			getDocs(collection(vipDb, "vip_members")),
		]);

		const vipByUid = new Map();
		const vipByEmail = new Map();
		const extraEmailOnly = [];

		vipSnap.docs.forEach((d) => {
			const data = d.data() || {};
			if (d.id.startsWith("email:")) {
				const em = normalizeEmail(data.email || d.id.slice(6));
				vipByEmail.set(em, { id: d.id, ...data });
			} else {
				vipByUid.set(d.id, { id: d.id, ...data });
				if (data.email) vipByEmail.set(normalizeEmail(data.email), { id: d.id, ...data });
			}
		});

		const seenEmails = new Set();
		const users = usersSnap.docs.map((d) => {
			const u = d.data() || {};
			const uid = u.uid || d.id;
			const email = u.email ? normalizeEmail(u.email) : null;
			if (email) seenEmails.add(email);

			const vipRec = vipByUid.get(uid) || (email ? vipByEmail.get(email) : null) || null;
			const owner = email ? isOwnerEmail(email) : false;
			const vipActive = owner || isMemberActive(vipRec);

			return {
				uid,
				username: u.username || "unknown",
				email,
				photoURL: u.photoURL || defaultAvatarFor(uid),
				roles: Array.isArray(u.roles) ? u.roles : [u.role || "user"],
				banned: Boolean(u.banned),
				isOwner: owner,
				vipActive,
				vipExpiresAt: vipRec?.expiresAt ? Number(vipRec.expiresAt) : null,
				vipSource: owner ? "owner" : (vipRec?.source || null),
				vipDocId: vipRec?.id || uid,
			};
		});

		vipByEmail.forEach((rec, em) => {
			if (!seenEmails.has(em) && isMemberActive(rec)) {
				extraEmailOnly.push({
					uid: rec.uid || null,
					username: rec.username || em.split("@")[0],
					email: em,
					photoURL: defaultAvatarFor(em),
					roles: ["pre-assigned"],
					banned: false,
					isOwner: isOwnerEmail(em),
					vipActive: true,
					vipExpiresAt: rec.expiresAt ? Number(rec.expiresAt) : null,
					vipSource: rec.source || "owner",
					vipDocId: rec.id,
				});
			}
		});

		return [...users, ...extraEmailOnly].sort((a, b) => {
			if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
			if (a.vipActive !== b.vipActive) return a.vipActive ? -1 : 1;
			return String(a.username || "").localeCompare(String(b.username || ""));
		});
	},

	async assignUserVip({ uid, email, username, active, expiresAt }) {
		assertOwner();
		const cleanEmail = email ? normalizeEmail(email) : null;
		let targetUid = uid || null;
		let resolvedUsername = username || null;

		if (!targetUid && resolvedUsername) {
			const cleanU = String(resolvedUsername).trim().toLowerCase();
			const q = query(collection(accountDb, "users"), where("username", "==", cleanU));
			const snap = await getDocs(q);
			if (!snap.empty) {
				targetUid = snap.docs[0].id;
				const ud = snap.docs[0].data() || {};
				resolvedUsername = ud.username || cleanU;
			}
		}

		if (!targetUid && !cleanEmail) {
			throw new Error("Provide a user UID, username, or email.");
		}

		const docId = targetUid || `email:${cleanEmail}`;
		const now = Date.now();
		await setDoc(
			doc(vipDb, "vip_members", docId),
			{
				uid: targetUid,
				email: cleanEmail,
				username: resolvedUsername,
				active: Boolean(active),
				source: "owner",
				expiresAt: active ? (expiresAt ? Number(expiresAt) : null) : null,
				grantedBy: OWNER_EMAIL,
				grantedAt: now,
				updatedAt: now,
			},
			{ merge: true }
		);

		if (cleanEmail && targetUid) {
			try {
				await setDoc(
					doc(vipDb, "vip_members", `email:${cleanEmail}`),
					{
						uid: targetUid,
						email: cleanEmail,
						username: resolvedUsername,
						active: Boolean(active),
						source: "owner",
						expiresAt: active ? (expiresAt ? Number(expiresAt) : null) : null,
						grantedBy: OWNER_EMAIL,
						grantedAt: now,
						updatedAt: now,
					},
					{ merge: true }
				);
			} catch (_) {}
		}

		if (targetUid) {
			try {
				const uRef = doc(accountDb, "users", targetUid);
				const uSnap = await getDoc(uRef);
				if (uSnap.exists()) {
					const existingRoles = Array.isArray(uSnap.data().roles)
						? [...uSnap.data().roles]
						: ["beta tester"];
					let nextRoles = existingRoles.filter((r) => String(r).toLowerCase() !== "vip");
					if (active) nextRoles.push("vip");
					if (nextRoles.length === 0) nextRoles = ["beta tester"];
					await setDoc(uRef, { roles: nextRoles }, { merge: true });
				}
			} catch (_) {}
		}

		await this.refreshStatus();
	},

	async createVipCode({ code, maxUses, expiresAt, ownerNote }) {
		assertOwner();
		const cleanCode = normalizeCodeString(code || generateRandomVipCode());
		if (!cleanCode || cleanCode.length < 3 || cleanCode.includes("/") || cleanCode === "." || cleanCode === "..") {
			throw new Error("Invalid VIP code format.");
		}

		let parsedMaxUses = null;
		if (maxUses !== null && maxUses !== undefined && maxUses !== "") {
			const n = Number(maxUses);
			if (!Number.isFinite(n) || n < 1) {
				throw new Error("Usage amount must be at least 1 (or Unlimited).");
			}
			parsedMaxUses = Math.floor(n);
		}

		let parsedExpiresAt = null;
		if (expiresAt !== null && expiresAt !== undefined && expiresAt !== "") {
			const ts = Number(expiresAt);
			if (!Number.isFinite(ts) || ts <= Date.now()) {
				throw new Error("Expiration date/time must be in the future.");
			}
			parsedExpiresAt = ts;
		}

		const codeRef = doc(vipDb, "vip_codes", cleanCode);
		const existing = await getDoc(codeRef);
		if (existing.exists()) {
			throw new Error(`VIP code "${cleanCode}" already exists.`);
		}

		const now = Date.now();
		const payload = {
			code: cleanCode,
			active: true,
			maxUses: parsedMaxUses,
			usedCount: 0,
			usedBy: [],
			redemptions: [],
			expiresAt: parsedExpiresAt,
			ownerNote: String(ownerNote || "").trim().slice(0, 1000),
			createdBy: OWNER_EMAIL,
			createdAt: now,
			updatedAt: now,
		};

		await setDoc(codeRef, payload);
		return payload;
	},

	async listVipCodes() {
		assertOwner();
		const snap = await getDocs(collection(vipDb, "vip_codes"));
		const list = snap.docs.map((d) => ({
			id: d.id,
			...(d.data() || {}),
		}));
		return list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
	},

	async updateVipCode(code, patch) {
		assertOwner();
		const cleanCode = normalizeCodeString(code);
		if (!cleanCode) throw new Error("Missing code.");
		const allowed = { updatedAt: Date.now() };
		if (typeof patch.active === "boolean") allowed.active = patch.active;
		if (typeof patch.ownerNote === "string") allowed.ownerNote = patch.ownerNote.trim().slice(0, 1000);
		if (patch.maxUses === null) {
			allowed.maxUses = null;
		} else if (patch.maxUses !== undefined) {
			const n = Number(patch.maxUses);
			if (Number.isFinite(n) && n >= 1) allowed.maxUses = Math.floor(n);
		}
		if (patch.expiresAt === null) {
			allowed.expiresAt = null;
		} else if (patch.expiresAt !== undefined && Number.isFinite(Number(patch.expiresAt))) {
			allowed.expiresAt = Number(patch.expiresAt);
		}
		await updateDoc(doc(vipDb, "vip_codes", cleanCode), allowed);
	},

	async deleteVipCode(code) {
		assertOwner();
		const cleanCode = normalizeCodeString(code);
		if (!cleanCode) throw new Error("Missing code.");
		await deleteDoc(doc(vipDb, "vip_codes", cleanCode));
	},

	compressAvatarFile,
};

window.VeilAuth = VeilAuth;

// Cross-frame / same-origin auth sync (e.g. if user signs in/out inside /chat.html iframe)
window.addEventListener("message", (event) => {
	if (event.origin !== window.location.origin) return;
	if (event.data && event.data.type === "veilos-onyx-auth") {
		VeilAuth.refreshStatus();
	}
});

window.addEventListener("storage", (event) => {
	if (event.key === ACCOUNT_STORAGE_KEY) {
		VeilAuth.refreshStatus();
	}
});

export default VeilAuth;
