const API_BASE = "https://veilos-s-production.up.railway.app";
let _apiBaseReachable = null;

async function safeApiFetch(urlPath, options) {
	try {
		const localRes = await fetch(urlPath, options);
		if (localRes.ok || localRes.status < 500) {
			return localRes;
		}
	} catch (_) {}
	if (API_BASE && _apiBaseReachable !== false) {
		try {
			const res = await fetch(`${API_BASE}${urlPath}`, options);
			if (res.ok) {
				_apiBaseReachable = true;
				return res;
			}
			_apiBaseReachable = false;
			return res;
		} catch (_) {
			_apiBaseReachable = false;
		}
	}
	return fetch(urlPath, options);
}

function escapeHtml(str) {
	return ("" + (str || "")).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const script1 = document.createElement('script');
script1.async = true;
script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-0LH2MR13BF';
document.head.appendChild(script1);

window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-0LH2MR13BF');

var store = (typeof window !== "undefined" && window.store) ||
	(typeof self !== "undefined" && self.store) ||
	(typeof store !== "undefined" ? store : null);

if (!store) {
	console.warn("[VeilOS UI] Global store not found, initializing fallback store");
	var fallbackInitial = {
		url: "https://google.com",
		wispurl: (typeof _CONFIG !== "undefined" && _CONFIG && _CONFIG.wispurl) ||
			(typeof window !== "undefined" && window._CONFIG && window._CONFIG.wispurl) ||
			(typeof WISP_URL !== "undefined" ? WISP_URL : "wss://fern.best/wisp/"),
		bareurl: (typeof _CONFIG !== "undefined" && _CONFIG && _CONFIG.bareurl) ||
			(typeof window !== "undefined" && window._CONFIG && window._CONFIG.bareurl) ||
			"https://fern.best/bare/",
		proxy: "",
		transport: "/libcurl/index.mjs",
		searchEngine: "google",
		tabCloak: "veil",
		customCloakTitle: "",
		customCloakIcon: "",
		autoAboutBlank: false,
		bookmarks: [
			{ id: "bm1", name: "Google", url: "https://google.com", icon: "🔍", addedAt: Date.now() },
			{ id: "bm2", name: "YouTube", url: "https://youtube.com", icon: "📺", addedAt: Date.now() },
			{ id: "bm3", name: "GitHub", url: "https://github.com", icon: "💻", addedAt: Date.now() },
			{ id: "bm4", name: "Wikipedia", url: "https://wikipedia.org", icon: "📖", addedAt: Date.now() },
			{ id: "bm5", name: "Reddit", url: "https://reddit.com", icon: "💬", addedAt: Date.now() },
			{ id: "bm6", name: "Discord", url: "https://discord.com", icon: "🎙️", addedAt: Date.now() }
		],
		history: [
			{ id: "h1", name: "Google", url: "https://google.com", visitedAt: Date.now() - 3600000 }
		],
		theme: "default",
		wallpaper: "assets/background.jpg",
		accentColor: "indigo",
		notes: [
			{ id: "note_1", title: "Welcome to VeilOS", content: "# VeilOS\n\nWelcome to VeilOS Web Operating System!", updatedAt: Date.now() }
		],
		osUsername: "Veil User",
		dockPosition: "bottom"
	};

	try {
		if (typeof $store === "function") {
			store = $store(fallbackInitial, { ident: "settings", backing: "localstorage", autosave: "auto" });
		} else if (typeof $state === "function") {
			store = $state(fallbackInitial);
		} else {
			store = fallbackInitial;
		}
	} catch (e) {
		store = (typeof $state === "function") ? $state(fallbackInitial) : fallbackInitial;
	}

	if (typeof window !== "undefined") window.store = store;
	if (typeof self !== "undefined") self.store = store;
}

window.openSettingsModal = (tabName) => {
	if (tabName && typeof window.__setCfgTab === "function") {
		window.__setCfgTab(tabName);
	}
	const cfg = document.querySelector("dialog.cfg");
	if (cfg) {
		if (typeof cfg.showModal === "function") {
			try {
				if (!cfg.open) cfg.showModal();
			} catch (e) {
				cfg.setAttribute("open", "");
			}
		} else {
			cfg.setAttribute("open", "");
		}
	}
	if (typeof window.__refreshCfgPanels === "function") {
		window.__refreshCfgPanels();
	}
};

window.closeSettingsModal = () => {
	const cfg = document.querySelector("dialog.cfg");
	if (cfg) {
		if (typeof cfg.close === "function") {
			try {
				cfg.close();
			} catch (e) {
				cfg.removeAttribute("open");
			}
		} else {
			cfg.removeAttribute("open");
		}
	}
};

const handleModalClose = (dialogEl) => {
	if (dialogEl && typeof dialogEl.close === "function") {
		try {
			dialogEl.close();
			return;
		} catch (e) {}
	}
	window.closeSettingsModal();
};

const UI_VEIL_VERSION = (typeof window !== "undefined" && (window.VEIL_VERSION || window.SPADE_VERSION)) ||
	(typeof VEIL_VERSION !== "undefined" ? VEIL_VERSION : "v0.9.1");
if (typeof window !== "undefined") {
	if (!window.VEIL_VERSION) window.VEIL_VERSION = UI_VEIL_VERSION;
	if (!window.SPADE_VERSION) window.SPADE_VERSION = UI_VEIL_VERSION;
}

const DEFAULT_WISP_URL = (typeof _CONFIG !== "undefined" && _CONFIG && _CONFIG.wispurl) ||
	(typeof window !== "undefined" && window._CONFIG && window._CONFIG.wispurl) ||
	(typeof WISP_URL !== "undefined" ? WISP_URL : ((typeof window !== "undefined" && window.WISP_URL) || "wss://fern.best/wisp/"));

const getLocalWispUrl = () => {
	if (typeof location !== "undefined" && location.host) {
		return (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/";
	}
	return null;
};

const ensureTrailingSlash = (u) => {
	if (!u) return u;
	return u.endsWith("/") ? u : (u + "/");
};

let _localWispProbeCache = null;

const probeWispEndpoint = (wsUrl, timeoutMs = 1500) => {
	return new Promise((resolve) => {
		if (typeof WebSocket === "undefined" || !wsUrl) return resolve(false);
		let settled = false;
		let ws = null;
		const finish = (ok) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try { if (ws) ws.close(); } catch (e) {}
			resolve(ok);
		};
		const timer = setTimeout(() => finish(false), timeoutMs);
		try {
			ws = new WebSocket(wsUrl);
			ws.binaryType = "arraybuffer";
			ws.onmessage = (ev) => {
				try {
					if (ev.data && typeof ev.data.byteLength === "number" && ev.data.byteLength >= 5) {
						const view = new Uint8Array(ev.data);
						if ((view[0] === 0x03 || view[0] === 0x05) &&
							view[1] === 0 && view[2] === 0 && view[3] === 0 && view[4] === 0) {
							return finish(true);
						}
					}
				} catch (e) {}
				finish(false);
			};
			ws.onerror = () => finish(false);
			ws.onclose = () => finish(false);
		} catch (e) {
			finish(false);
		}
	});
};

const checkLocalWispAvailable = async (forceProbe = false) => {
	const localWisp = getLocalWispUrl();
	if (!localWisp) return null;
	if (forceProbe || !_localWispProbeCache || _localWispProbeCache.url !== localWisp) {
		const okPromise = probeWispEndpoint(localWisp);
		_localWispProbeCache = { url: localWisp, promise: okPromise };
	}
	const ok = await _localWispProbeCache.promise;
	return ok ? localWisp : null;
};

const resolveWispUrl = async (preferredWisp, { forceProbe = false } = {}) => {
	const fallback = ensureTrailingSlash(DEFAULT_WISP_URL || "wss://fern.best/wisp/");
	const raw = preferredWisp || (typeof store !== "undefined" && store.wispurl) || fallback;
	const normalizedRaw = ensureTrailingSlash(raw);
	const localWisp = getLocalWispUrl();
	const isDefaultFern = normalizedRaw === fallback || normalizedRaw === "wss://fern.best/wisp/";
	const isLocalCandidate = Boolean(localWisp && normalizedRaw === localWisp);

	if (isDefaultFern || isLocalCandidate) {
		const answeringLocal = await checkLocalWispAvailable(forceProbe);
		if (answeringLocal) {
			return answeringLocal;
		}
		if (isLocalCandidate && typeof store !== "undefined" && store.wispurl && ensureTrailingSlash(store.wispurl) === localWisp) {
			store.wispurl = fallback;
		}
		return fallback;
	}
	return normalizedRaw;
};

const applyTransport = async (transport, wispurl) => {
	const host = window.ScramjetHost && window.ScramjetHost.current;
	if (!host) return;
	const primary = transport || "/libcurl/index.mjs";
	const fallbackTransport = String(primary).includes("epoxy") ? "/libcurl/index.mjs" : "/epoxy/index.mjs";
	const targetWisp = await resolveWispUrl(wispurl);
	try {
		await host.setTransport(primary, targetWisp);
		if (typeof store !== "undefined") {
			store.transport = primary;
		}
	} catch (err) {
		console.warn(`Failed to set transport ${primary}, falling back to ${fallbackTransport}:`, err);
		try {
			await host.setTransport(fallbackTransport, targetWisp);
			if (typeof store !== "undefined") {
				store.transport = fallbackTransport;
			}
		} catch (fallbackErr) {
			console.error("Fallback transport also failed:", fallbackErr);
		}
	}
};

const reconnectWispTransport = async (overrideWisp) => {
	const host = window.ScramjetHost && window.ScramjetHost.current;
	if (!host) return false;
	const targetWisp = overrideWisp
		? ensureTrailingSlash(overrideWisp)
		: await resolveWispUrl(typeof store !== "undefined" ? store.wispurl : null, { forceProbe: true });
	const primary = (typeof store !== "undefined" && store.transport) || "/libcurl/index.mjs";
	const fallbackTransport = String(primary).includes("epoxy") ? "/libcurl/index.mjs" : "/epoxy/index.mjs";
	try {
		console.log("[Wisp] Reconnecting transport with target:", targetWisp);
		await host.setTransport(primary, targetWisp);
		if (typeof store !== "undefined") {
			store.transport = primary;
		}
		return true;
	} catch (err) {
		console.warn(`[Wisp] Reconnection with ${primary} failed, falling back to ${fallbackTransport}:`, err);
		try {
			await host.setTransport(fallbackTransport, targetWisp);
			if (typeof store !== "undefined") {
				store.transport = fallbackTransport;
			}
			return true;
		} catch (fallbackErr) {
			console.error("[Wisp] Reconnect fallback failed:", fallbackErr);
			return false;
		}
	}
};
if (typeof window !== "undefined") {
	window.applyTransport = applyTransport;
	window.reconnectWispTransport = reconnectWispTransport;
}

const VIP_GATED_APPS = new Set(["movies", "ai", "music", "cloudgaming"]);
const VIP_GATED_APP_LABELS = {
	movies: "SSV Movies",
	ai: "Scenario",
	music: "Sonora",
	cloudgaming: "Cloud Gaming",
};

function hasVipAccess() {
	return Boolean(window.VeilAuth && typeof window.VeilAuth.hasVipAccess === "function" && window.VeilAuth.hasVipAccess());
}

function getVeilAuthState() {
	if (window.VeilAuth && typeof window.VeilAuth.getState === "function") {
		return window.VeilAuth.getState();
	}
	return { mode: "signed_out", username: "Veil User", email: null, isVip: false, isOwner: false, vipExpiresAt: null };
}

function formatVipExpiry(ts) {
	if (!ts) return "Never (Lifetime)";
	const d = new Date(Number(ts));
	if (isNaN(d.getTime())) return "Unknown";
	return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function parseExpirationSelection(preset, customValue) {
	const now = Date.now();
	if (preset === "never" || !preset) return null;
	if (preset === "1h") return now + 60 * 60 * 1000;
	if (preset === "24h") return now + 24 * 60 * 60 * 1000;
	if (preset === "7d") return now + 7 * 24 * 60 * 60 * 1000;
	if (preset === "30d") return now + 30 * 24 * 60 * 60 * 1000;
	if (preset === "custom" && customValue) {
		const ts = new Date(customValue).getTime();
		return isNaN(ts) ? null : ts;
	}
	return null;
}

function renderVipGateView(appId, win, osInstance) {
	const root = document.createElement("div");
	root.className = "w-full h-full bg-[#09090b] text-neutral-100 flex items-center justify-center p-6 select-none overflow-y-auto";

	const appName = VIP_GATED_APP_LABELS[appId] || win.title || "VIP App";
	const auth = getVeilAuthState();
	const isGuestOrOut = auth.mode !== "account";

	root.innerHTML = `
		<div class="max-w-md w-full bg-[#111118]/95 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
			<div class="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-400 text-2xl">
				<i class="fa-solid fa-crown"></i>
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-[11px] font-bold uppercase tracking-widest text-amber-400">VIP Exclusive Access</span>
				<h2 class="text-lg font-bold text-white tracking-tight">${escapeHtml(appName)} Requires VIP</h2>
				<p class="text-xs text-neutral-400 leading-relaxed mt-0.5">
					SSV Movies, Scenario, Sonora, and Cloud Gaming are reserved for VeilOS VIP members.
				</p>
			</div>
			<div class="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs flex items-center justify-between">
				<span class="text-neutral-400">Current Session</span>
				<span class="font-semibold text-white">
					${auth.mode === "account" ? `@${escapeHtml(auth.username)} (Free)` : (auth.mode === "guest" ? "Guest Mode" : "Signed Out")}
				</span>
			</div>
			<div class="flex flex-col gap-2 w-full">
				${isGuestOrOut ? `
					<button type="button" id="vip-gate-signin-btn"
						class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
						<i class="fa-solid fa-right-to-bracket"></i>
						<span>Sign In to Redeem VIP</span>
					</button>
				` : `
					<button type="button" id="vip-gate-redeem-btn"
						class="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
						<i class="fa-solid fa-ticket"></i>
						<span>Redeem VIP Code in Settings</span>
					</button>
				`}
				<button type="button" id="vip-gate-settings-btn"
					class="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
					<i class="fa-solid fa-gear"></i>
					<span>Open Account &amp; VIP Settings</span>
				</button>
			</div>
		</div>
	`;

	const signInBtn = root.querySelector("#vip-gate-signin-btn");
	if (signInBtn) {
		signInBtn.onclick = () => {
			if (osInstance) {
				osInstance.isLocked = true;
				osInstance.windows = [...osInstance.windows];
			}
		};
	}
	const redeemBtn = root.querySelector("#vip-gate-redeem-btn");
	if (redeemBtn) {
		redeemBtn.onclick = () => window.openSettingsModal("vip");
	}
	const settingsBtn = root.querySelector("#vip-gate-settings-btn");
	if (settingsBtn) {
		settingsBtn.onclick = () => window.openSettingsModal("vip");
	}

	return root;
}

function mountSettingsVipPanel(container) {
	let feedback = null;
	let authMode = "signin";
	let busy = false;
	let codeInputVal = "";

	function render() {
		const auth = getVeilAuthState();
		const isAccount = auth.mode === "account";
		const isOwner = Boolean(auth.isOwner);
		const isVip = Boolean(isOwner || hasVipAccess());

		container.innerHTML = `
			<div class="flex flex-col gap-4">
				<div class="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
					<div class="flex items-center gap-3 min-w-0">
						${isAccount && auth.photoURL
							? `<img src="${escapeHtml(auth.photoURL)}" alt="" class="w-11 h-11 rounded-full object-cover border border-white/20 shrink-0" />`
							: `<div class="w-11 h-11 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0"><i class="fa-solid fa-user"></i></div>`
						}
						<div class="flex flex-col min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm font-bold text-white truncate">${isAccount ? `@${escapeHtml(auth.username)}` : (auth.mode === "guest" ? "Guest Session" : "Not Signed In")}</span>
								${isOwner
									? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">Owner</span>`
									: isVip
									? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">VIP Active</span>`
									: `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-neutral-300 border border-white/10 shrink-0">${auth.mode === "guest" ? "Guest" : "Free"}</span>`
								}
							</div>
							<span class="text-[11px] text-neutral-400 truncate mt-0.5">
								${isAccount ? escapeHtml(auth.email || "Onyx Chat Account") : "Sign in with your Onyx Chat account to sync & unlock VIP"}
							</span>
							${isVip && !isOwner ? `
								<span class="text-[10px] text-emerald-300 font-mono mt-1">Expires: ${escapeHtml(formatVipExpiry(auth.vipExpiresAt))}</span>
							` : ""}
						</div>
					</div>
					<div class="flex items-center gap-1.5 shrink-0">
						${isAccount ? `
							<button type="button" id="cfg-signout-btn" class="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-semibold cursor-pointer transition-colors">
								Sign Out
							</button>
						` : `
							<button type="button" id="cfg-guest-btn" class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-medium cursor-pointer transition-colors">
								${auth.mode === "guest" ? "Guest Active" : "Use Guest"}
							</button>
						`}
					</div>
				</div>

				${feedback ? `
					<div class="p-3 rounded-xl border text-xs font-medium ${feedback.type === "error" ? "bg-rose-500/15 border-rose-500/35 text-rose-200" : "bg-emerald-500/15 border-emerald-500/35 text-emerald-200"}">
						${escapeHtml(feedback.text)}
					</div>
				` : ""}

				${!isAccount ? `
					<div class="p-4 rounded-2xl bg-black/35 border border-white/10 flex flex-col gap-3">
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold uppercase tracking-wider text-neutral-300">Onyx Chat Account Sign In</span>
							<div class="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
								<button type="button" id="cfg-mode-signin" class="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${authMode === "signin" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white"}">Sign In</button>
								<button type="button" id="cfg-mode-signup" class="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${authMode === "signup" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white"}">Create Account</button>
							</div>
						</div>
						<form id="cfg-auth-form" class="flex flex-col gap-2.5">
							<input id="cfg-auth-email" type="email" required placeholder="Email address" class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-400" />
							<input id="cfg-auth-pass" type="password" required placeholder="Password" class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-400" />
							${authMode === "signup" ? `
								<input id="cfg-auth-user" type="text" required maxlength="20" placeholder="Unique Onyx Chat username" class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-400" />
							` : ""}
							<button type="submit" ${busy ? "disabled" : ""} class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors">
								${busy ? "Processing..." : (authMode === "signup" ? "Create Onyx Account" : "Sign In")}
							</button>
						</form>
					</div>
				` : ""}

				<div class="p-4 rounded-2xl bg-black/35 border border-amber-500/25 flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<i class="fa-solid fa-crown text-amber-400 text-sm"></i>
							<span class="text-xs font-bold uppercase tracking-wider text-amber-300">Redeem VIP Code</span>
						</div>
						<span class="text-[10px] text-neutral-400">Unlocks SSV Movies, Scenario, Sonora &amp; Cloud Gaming</span>
					</div>
					<form id="cfg-redeem-form" class="flex gap-2">
						<input id="cfg-vip-code-input" type="text" value="${escapeHtml(codeInputVal)}" placeholder="Enter VIP code (e.g. VEIL-XXXX-XXXX)"
							class="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono uppercase placeholder-neutral-500 outline-none focus:border-amber-400" />
						<button type="submit" ${busy || !isAccount ? "disabled" : ""}
							class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-black text-xs font-bold cursor-pointer transition-colors shrink-0">
							${busy ? "..." : "Redeem"}
						</button>
					</form>
					${!isAccount ? `<p class="text-[11px] text-neutral-400">Sign in above first to bind a VIP code to your Onyx Chat account.</p>` : ""}
				</div>

				<button type="button" id="cfg-replay-tour-btn"
					class="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors">
					<div class="flex items-center gap-2">
						<i class="fa-solid fa-compass text-sky-400"></i>
						<span>Replay VeilOS Interactive Tour</span>
					</div>
					<span class="text-[11px] text-sky-400 font-medium">Launch &rarr;</span>
				</button>
			</div>
		`;

		const signOutBtn = container.querySelector("#cfg-signout-btn");
		if (signOutBtn) {
			signOutBtn.onclick = async () => {
				try {
					await window.VeilAuth.signOut();
					feedback = { type: "ok", text: "Signed out cleanly." };
				} catch (err) {
					feedback = { type: "error", text: err.message || "Failed to sign out." };
				}
				render();
			};
		}

		const guestBtn = container.querySelector("#cfg-guest-btn");
		if (guestBtn) {
			guestBtn.onclick = async () => {
				await window.VeilAuth.continueAsGuest();
				feedback = { type: "ok", text: "Guest mode active." };
				render();
			};
		}

		const modeIn = container.querySelector("#cfg-mode-signin");
		const modeUp = container.querySelector("#cfg-mode-signup");
		if (modeIn) modeIn.onclick = () => { authMode = "signin"; feedback = null; render(); };
		if (modeUp) modeUp.onclick = () => { authMode = "signup"; feedback = null; render(); };

		const authForm = container.querySelector("#cfg-auth-form");
		if (authForm) {
			authForm.onsubmit = async (e) => {
				e.preventDefault();
				if (busy) return;
				busy = true;
				feedback = null;
				const em = container.querySelector("#cfg-auth-email")?.value || "";
				const pw = container.querySelector("#cfg-auth-pass")?.value || "";
				const un = container.querySelector("#cfg-auth-user")?.value || "";
				render();
				try {
					if (authMode === "signup") {
						await window.VeilAuth.signUp({ email: em, password: pw, username: un });
						feedback = { type: "ok", text: "Account created & signed in!" };
					} else {
						await window.VeilAuth.signIn(em, pw);
						feedback = { type: "ok", text: "Signed in with Onyx Chat account!" };
					}
				} catch (err) {
					feedback = { type: "error", text: err.message || "Authentication failed." };
				} finally {
					busy = false;
					render();
				}
			};
		}

		const codeInp = container.querySelector("#cfg-vip-code-input");
		if (codeInp) {
			codeInp.oninput = (e) => { codeInputVal = e.target.value; };
		}

		const redeemForm = container.querySelector("#cfg-redeem-form");
		if (redeemForm) {
			redeemForm.onsubmit = async (e) => {
				e.preventDefault();
				if (busy) return;
				const raw = container.querySelector("#cfg-vip-code-input")?.value || codeInputVal;
				if (!raw.trim()) {
					feedback = { type: "error", text: "Enter a VIP code first." };
					render();
					return;
				}
				busy = true;
				feedback = null;
				render();
				try {
					const res = await window.VeilAuth.redeemVipCode(raw);
					codeInputVal = "";
					feedback = {
						type: "ok",
						text: `VIP unlocked (${res.code})! Expires: ${formatVipExpiry(res.expiresAt)}.`,
					};
					window.osGlobalInstance && window.osGlobalInstance.notify("VIP Activated", "SSV Movies, Scenario, Sonora & Cloud Gaming unlocked!", "fa-solid fa-crown", "info");
				} catch (err) {
					feedback = { type: "error", text: err.message || "Could not redeem VIP code." };
				} finally {
					busy = false;
					render();
				}
			};
		}

		const tourBtn = container.querySelector("#cfg-replay-tour-btn");
		if (tourBtn) {
			tourBtn.onclick = () => {
				window.closeSettingsModal();
				if (window.osGlobalInstance && typeof window.osGlobalInstance.startTour === "function") {
					window.osGlobalInstance.startTour(true);
				}
			};
		}
	}

	render();
	container.__refreshPanel = render;
}

function mountSettingsOwnerPanel(container) {
	let subTab = "codes";
	let users = [];
	let codes = [];
	let loadingData = false;
	let feedback = null;
	let searchUsers = "";
	let editingNoteCode = null;
	let confirmDeleteCode = null;

	let newCodeVal = "";
	let usageMode = "limited";
	let maxUsesVal = "1";
	let expPreset = "never";
	let expCustom = "";
	let ownerNoteVal = "";

	let manualTargetVal = "";
	let manualExpPreset = "never";
	let manualExpCustom = "";

	async function loadOwnerData() {
		if (!window.VeilAuth || !window.VeilAuth.isOwner()) return;
		loadingData = true;
		render();
		try {
			const [uList, cList] = await Promise.all([
				window.VeilAuth.listOnyxUsersWithVip(),
				window.VeilAuth.listVipCodes(),
			]);
			users = uList;
			codes = cList;
		} catch (err) {
			feedback = { type: "error", text: err.message || "Failed to load Owner data." };
		} finally {
			loadingData = false;
			render();
		}
	}

	function render() {
		if (!window.VeilAuth || !window.VeilAuth.isOwner()) {
			container.innerHTML = `<div class="p-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-2xl">Owner authentication required (678.gxvin@gmail.com).</div>`;
			return;
		}

		const filteredUsers = users.filter((u) => {
			if (!searchUsers.trim()) return true;
			const q = searchUsers.trim().toLowerCase();
			return (
				String(u.username || "").toLowerCase().includes(q) ||
				String(u.email || "").toLowerCase().includes(q) ||
				String(u.uid || "").toLowerCase().includes(q)
			);
		});

		container.innerHTML = `
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-400/30 px-3.5 py-2.5 rounded-2xl">
					<div class="flex items-center gap-2 min-w-0">
						<i class="fa-solid fa-shield-halved text-amber-400"></i>
						<div class="flex flex-col min-w-0">
							<span class="text-xs font-bold text-amber-200">Owner Console</span>
							<span class="text-[10px] text-amber-300/80 font-mono truncate">678.gxvin@gmail.com</span>
						</div>
					</div>
					<div class="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
						<button type="button" id="owner-sub-codes" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${subTab === "codes" ? "bg-amber-500 text-black font-bold" : "text-neutral-300 hover:text-white"}">VIP Codes (${codes.length})</button>
						<button type="button" id="owner-sub-users" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${subTab === "users" ? "bg-amber-500 text-black font-bold" : "text-neutral-300 hover:text-white"}">Assign VIP (${users.length})</button>
						<button type="button" id="owner-refresh-btn" class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 flex items-center justify-center text-[10px] cursor-pointer" title="Refresh"><i class="fa-solid fa-rotate ${loadingData ? "fa-spin" : ""}"></i></button>
					</div>
				</div>

				${feedback ? `
					<div class="p-2.5 rounded-xl border text-xs font-medium ${feedback.type === "error" ? "bg-rose-500/15 border-rose-500/35 text-rose-200" : "bg-emerald-500/15 border-emerald-500/35 text-emerald-200"}">
						${escapeHtml(feedback.text)}
					</div>
				` : ""}

				${subTab === "codes" ? `
					<form id="owner-create-code-form" class="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2.5">
						<div class="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Create VIP Code</div>
						<div class="flex gap-2">
							<input id="owner-code-input" type="text" value="${escapeHtml(newCodeVal)}" placeholder="Code (leave blank to auto-generate)"
								class="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono uppercase placeholder-neutral-500 outline-none focus:border-amber-400" />
							<button type="button" id="owner-gen-code-btn" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0">Generate</button>
						</div>

						<div class="grid grid-cols-2 gap-2">
							<div class="flex flex-col gap-1">
								<label class="text-[10px] uppercase font-bold text-neutral-400">Usage Amount</label>
								<div class="flex gap-1.5">
									<select id="owner-usage-mode" class="flex-1 px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none">
										<option value="limited" ${usageMode === "limited" ? "selected" : ""}>Limited Uses</option>
										<option value="unlimited" ${usageMode === "unlimited" ? "selected" : ""}>Unlimited</option>
									</select>
									${usageMode === "limited" ? `
										<input id="owner-max-uses" type="number" min="1" max="100000" value="${escapeHtml(maxUsesVal)}"
											class="w-20 px-2.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono tabular-nums outline-none focus:border-amber-400" />
									` : ""}
								</div>
							</div>

							<div class="flex flex-col gap-1">
								<label class="text-[10px] uppercase font-bold text-neutral-400">Expiration</label>
								<select id="owner-exp-preset" class="w-full px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none">
									<option value="never" ${expPreset === "never" ? "selected" : ""}>Never Expires</option>
									<option value="1h" ${expPreset === "1h" ? "selected" : ""}>1 Hour</option>
									<option value="24h" ${expPreset === "24h" ? "selected" : ""}>24 Hours</option>
									<option value="7d" ${expPreset === "7d" ? "selected" : ""}>7 Days</option>
									<option value="30d" ${expPreset === "30d" ? "selected" : ""}>30 Days</option>
									<option value="custom" ${expPreset === "custom" ? "selected" : ""}>Custom Date/Time</option>
								</select>
							</div>
						</div>

						${expPreset === "custom" ? `
							<input id="owner-exp-custom" type="datetime-local" value="${escapeHtml(expCustom)}"
								class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono outline-none focus:border-amber-400" />
						` : ""}

						<div class="flex flex-col gap-1">
							<label class="text-[10px] uppercase font-bold text-amber-300/90 flex items-center gap-1.5">
								<i class="fa-solid fa-lock text-[9px]"></i>
								<span>Owner-Only Private Note (hidden from all other users)</span>
							</label>
							<textarea id="owner-note-input" rows="2" placeholder="Optional private note about who this code is for..."
								class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400 resize-none">${escapeHtml(ownerNoteVal)}</textarea>
						</div>

						<button type="submit" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer transition-colors">
							Create VIP Code
						</button>
					</form>

					<div class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
						${loadingData && codes.length === 0 ? `<div class="py-6 text-center text-xs text-neutral-400">Loading VIP codes...</div>` : ""}
						${!loadingData && codes.length === 0 ? `<div class="py-6 text-center text-xs text-neutral-500">No VIP codes created yet.</div>` : ""}
						${codes.map((c) => {
							const used = Number(c.usedCount || 0);
							const max = c.maxUses != null ? Number(c.maxUses) : null;
							const isExpired = Boolean(c.expiresAt && Date.now() >= Number(c.expiresAt));
							const isMaxed = max !== null && used >= max;
							const isActive = c.active !== false && !isExpired && !isMaxed;
							const statusLabel = c.active === false ? "Paused" : isExpired ? "Expired" : isMaxed ? "Maxed" : "Active";
							const statusCls = isActive ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30";

							return `
								<div class="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2">
									<div class="flex items-center justify-between gap-2">
										<div class="flex items-center gap-2 min-w-0">
											<span class="font-mono text-xs font-bold text-white tracking-wide truncate">${escapeHtml(c.code)}</span>
											<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${statusCls}">${statusLabel}</span>
										</div>
										<div class="flex items-center gap-1 shrink-0">
											<button type="button" data-copy-code="${escapeHtml(c.code)}" class="owner-copy-code px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-neutral-200 cursor-pointer" title="Copy code"><i class="fa-solid fa-copy"></i></button>
											<button type="button" data-toggle-code="${escapeHtml(c.code)}" data-active="${c.active !== false ? "1" : "0"}" class="owner-toggle-code px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-neutral-200 cursor-pointer">${c.active !== false ? "Pause" : "Enable"}</button>
											${confirmDeleteCode === c.code ? `
												<button type="button" data-del-confirm="${escapeHtml(c.code)}" class="owner-del-confirm px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer">Confirm Delete</button>
											` : `
												<button type="button" data-del-code="${escapeHtml(c.code)}" class="owner-del-code px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-[10px] cursor-pointer"><i class="fa-solid fa-trash"></i></button>
											`}
										</div>
									</div>
									<div class="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
										<span>Uses: <strong class="text-neutral-200">${used} / ${max === null ? "∞" : max}</strong></span>
										<span>Expires: ${escapeHtml(formatVipExpiry(c.expiresAt))}</span>
									</div>
									<div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] flex flex-col gap-1">
										<div class="flex items-center justify-between">
											<span class="text-[9px] font-bold uppercase tracking-wider text-amber-300"><i class="fa-solid fa-lock mr-1"></i>Owner Note</span>
											<button type="button" data-edit-note="${escapeHtml(c.code)}" class="owner-edit-note-btn text-[10px] text-amber-300 hover:text-white cursor-pointer">${editingNoteCode === c.code ? "Cancel" : "Edit Note"}</button>
										</div>
										${editingNoteCode === c.code ? `
											<div class="flex gap-1.5 mt-0.5">
												<input type="text" data-note-input="${escapeHtml(c.code)}" value="${escapeHtml(c.ownerNote || "")}" class="flex-1 px-2 py-1 rounded-lg bg-black/60 border border-amber-400/40 text-xs text-white outline-none" />
												<button type="button" data-save-note="${escapeHtml(c.code)}" class="owner-save-note px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-bold cursor-pointer">Save</button>
											</div>
										` : `
											<p class="text-neutral-200 whitespace-pre-wrap break-words">${c.ownerNote ? escapeHtml(c.ownerNote) : `<span class="text-neutral-500 italic">No owner note</span>`}</p>
										`}
									</div>
								</div>
							`;
						}).join("")}
					</div>
				` : `
					<form id="owner-manual-assign-form" class="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2">
						<div class="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Assign VIP by Email or Username</div>
						<div class="flex gap-2">
							<input id="owner-manual-target" type="text" value="${escapeHtml(manualTargetVal)}" placeholder="email@example.com or Onyx username"
								class="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400" />
							<select id="owner-manual-exp" class="px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none">
								<option value="never" ${manualExpPreset === "never" ? "selected" : ""}>Lifetime</option>
								<option value="24h" ${manualExpPreset === "24h" ? "selected" : ""}>24h</option>
								<option value="7d" ${manualExpPreset === "7d" ? "selected" : ""}>7d</option>
								<option value="30d" ${manualExpPreset === "30d" ? "selected" : ""}>30d</option>
								<option value="custom" ${manualExpPreset === "custom" ? "selected" : ""}>Custom</option>
							</select>
						</div>
						${manualExpPreset === "custom" ? `
							<input id="owner-manual-custom-exp" type="datetime-local" value="${escapeHtml(manualExpCustom)}" class="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono outline-none" />
						` : ""}
						<button type="submit" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer">Grant VIP</button>
					</form>

					<input id="owner-user-search" type="text" value="${escapeHtml(searchUsers)}" placeholder="Search Onyx Chat users by username, email, or UID..."
						class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400" />

					<div class="flex flex-col gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
						${loadingData && users.length === 0 ? `<div class="py-6 text-center text-xs text-neutral-400">Loading users...</div>` : ""}
						${filteredUsers.map((u) => `
							<div class="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2">
								<div class="flex items-center gap-2.5 min-w-0">
									<img src="${escapeHtml(u.photoURL || "")}" alt="" class="w-8 h-8 rounded-full object-cover border border-white/15 shrink-0" />
									<div class="flex flex-col min-w-0">
										<div class="flex items-center gap-1.5">
											<span class="text-xs font-bold text-white truncate">@${escapeHtml(u.username)}</span>
											${u.isOwner
												? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">Owner</span>`
												: u.vipActive
												? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">VIP</span>`
												: ""
											}
										</div>
										<span class="text-[10px] text-neutral-400 truncate font-mono">${escapeHtml(u.email || u.uid || "")}</span>
									</div>
								</div>
								<div class="flex items-center gap-1.5 shrink-0">
									${!u.isOwner ? (
										u.vipActive
											? `<button type="button" data-vip-uid="${escapeHtml(u.uid || "")}" data-vip-email="${escapeHtml(u.email || "")}" data-vip-name="${escapeHtml(u.username || "")}" data-vip-action="revoke" class="owner-vip-btn px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/30 text-[11px] font-semibold cursor-pointer">Revoke VIP</button>`
											: `<button type="button" data-vip-uid="${escapeHtml(u.uid || "")}" data-vip-email="${escapeHtml(u.email || "")}" data-vip-name="${escapeHtml(u.username || "")}" data-vip-action="grant" class="owner-vip-btn px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer">Grant VIP</button>`
									) : `<span class="text-[10px] text-amber-300 font-semibold">Full Access</span>`}
								</div>
							</div>
						`).join("")}
					</div>
				`}
			</div>
		`;

		const subCodesBtn = container.querySelector("#owner-sub-codes");
		const subUsersBtn = container.querySelector("#owner-sub-users");
		const refBtn = container.querySelector("#owner-refresh-btn");
		if (subCodesBtn) subCodesBtn.onclick = () => { subTab = "codes"; feedback = null; render(); };
		if (subUsersBtn) subUsersBtn.onclick = () => { subTab = "users"; feedback = null; render(); };
		if (refBtn) refBtn.onclick = () => loadOwnerData();

		const genBtn = container.querySelector("#owner-gen-code-btn");
		if (genBtn) {
			genBtn.onclick = () => {
				newCodeVal = window.VeilAuth.generateRandomVipCode();
				const inp = container.querySelector("#owner-code-input");
				if (inp) inp.value = newCodeVal;
			};
		}

		const codeInput = container.querySelector("#owner-code-input");
		if (codeInput) codeInput.oninput = (e) => { newCodeVal = e.target.value; };
		const usageSel = container.querySelector("#owner-usage-mode");
		if (usageSel) usageSel.onchange = (e) => { usageMode = e.target.value; render(); };
		const maxUsesInp = container.querySelector("#owner-max-uses");
		if (maxUsesInp) maxUsesInp.oninput = (e) => { maxUsesVal = e.target.value; };
		const expSel = container.querySelector("#owner-exp-preset");
		if (expSel) expSel.onchange = (e) => { expPreset = e.target.value; render(); };
		const expCustomInp = container.querySelector("#owner-exp-custom");
		if (expCustomInp) expCustomInp.oninput = (e) => { expCustom = e.target.value; };
		const noteInp = container.querySelector("#owner-note-input");
		if (noteInp) noteInp.oninput = (e) => { ownerNoteVal = e.target.value; };

		const createForm = container.querySelector("#owner-create-code-form");
		if (createForm) {
			createForm.onsubmit = async (e) => {
				e.preventDefault();
				feedback = null;
				try {
					const maxUses = usageMode === "unlimited" ? null : Number(maxUsesVal || 1);
					const expiresAt = parseExpirationSelection(expPreset, expCustom);
					if (expPreset === "custom" && !expiresAt) {
						throw new Error("Choose a valid custom expiration date/time.");
					}
					const created = await window.VeilAuth.createVipCode({
						code: newCodeVal,
						maxUses,
						expiresAt,
						ownerNote: ownerNoteVal,
					});
					newCodeVal = "";
					ownerNoteVal = "";
					feedback = { type: "ok", text: `Created VIP code ${created.code}` };
					await loadOwnerData();
				} catch (err) {
					feedback = { type: "error", text: err.message || "Failed to create VIP code." };
					render();
				}
			};
		}

		container.querySelectorAll(".owner-copy-code").forEach((btn) => {
			btn.onclick = () => {
				const c = btn.getAttribute("data-copy-code");
				navigator.clipboard?.writeText(c);
				feedback = { type: "ok", text: `Copied ${c} to clipboard.` };
				render();
			};
		});

		container.querySelectorAll(".owner-toggle-code").forEach((btn) => {
			btn.onclick = async () => {
				const c = btn.getAttribute("data-toggle-code");
				const curActive = btn.getAttribute("data-active") === "1";
				try {
					await window.VeilAuth.updateVipCode(c, { active: !curActive });
					await loadOwnerData();
				} catch (err) {
					feedback = { type: "error", text: err.message || "Failed to update code." };
					render();
				}
			};
		});

		container.querySelectorAll(".owner-del-code").forEach((btn) => {
			btn.onclick = () => {
				confirmDeleteCode = btn.getAttribute("data-del-code");
				render();
			};
		});

		container.querySelectorAll(".owner-del-confirm").forEach((btn) => {
			btn.onclick = async () => {
				const c = btn.getAttribute("data-del-confirm");
				confirmDeleteCode = null;
				try {
					await window.VeilAuth.deleteVipCode(c);
					feedback = { type: "ok", text: `Deleted VIP code ${c}.` };
					await loadOwnerData();
				} catch (err) {
					feedback = { type: "error", text: err.message || "Failed to delete code." };
					render();
				}
			};
		});

		container.querySelectorAll(".owner-edit-note-btn").forEach((btn) => {
			btn.onclick = () => {
				const c = btn.getAttribute("data-edit-note");
				editingNoteCode = editingNoteCode === c ? null : c;
				render();
			};
		});

		container.querySelectorAll(".owner-save-note").forEach((btn) => {
			btn.onclick = async () => {
				const c = btn.getAttribute("data-save-note");
				const inp = container.querySelector(`[data-note-input="${CSS.escape(c)}"]`);
				const nextNote = inp ? inp.value : "";
				try {
					await window.VeilAuth.updateVipCode(c, { ownerNote: nextNote });
					editingNoteCode = null;
					feedback = { type: "ok", text: `Updated private note on ${c}.` };
					await loadOwnerData();
				} catch (err) {
					feedback = { type: "error", text: err.message || "Failed to update note." };
					render();
				}
			};
		});

		const manualInp = container.querySelector("#owner-manual-target");
		if (manualInp) manualInp.oninput = (e) => { manualTargetVal = e.target.value; };
		const manualExpSel = container.querySelector("#owner-manual-exp");
		if (manualExpSel) manualExpSel.onchange = (e) => { manualExpPreset = e.target.value; render(); };
		const manualCustomInp = container.querySelector("#owner-manual-custom-exp");
		if (manualCustomInp) manualCustomInp.oninput = (e) => { manualExpCustom = e.target.value; };

		const manualForm = container.querySelector("#owner-manual-assign-form");
		if (manualForm) {
			manualForm.onsubmit = async (e) => {
				e.preventDefault();
				const raw = manualTargetVal.trim();
				if (!raw) return;
				try {
					const expiresAt = parseExpirationSelection(manualExpPreset, manualExpCustom);
					const isEmail = raw.includes("@");
					await window.VeilAuth.assignUserVip({
						email: isEmail ? raw : null,
						username: isEmail ? null : raw.replace(/^@/, ""),
						active: true,
						expiresAt,
					});
					manualTargetVal = "";
					feedback = { type: "ok", text: `Granted VIP to ${raw}` };
					await loadOwnerData();
				} catch (err) {
					feedback = { type: "error", text: err.message || "Failed to grant VIP." };
					render();
				}
			};
		}

		const userSearchInp = container.querySelector("#owner-user-search");
		if (userSearchInp) {
			userSearchInp.oninput = (e) => {
				searchUsers = e.target.value;
				render();
				const next = container.querySelector("#owner-user-search");
				if (next) {
					next.focus();
					next.selectionStart = next.selectionEnd = next.value.length;
				}
			};
		}

		container.querySelectorAll(".owner-vip-btn").forEach((btn) => {
			btn.onclick = async () => {
				const uid = btn.getAttribute("data-vip-uid") || null;
				const email = btn.getAttribute("data-vip-email") || null;
				const username = btn.getAttribute("data-vip-name") || null;
				const grant = btn.getAttribute("data-vip-action") === "grant";
				try {
					await window.VeilAuth.assignUserVip({ uid, email, username, active: grant, expiresAt: null });
					feedback = { type: "ok", text: `${grant ? "Granted" : "Revoked"} VIP for @${username || email}` };
					await loadOwnerData();
				} catch (err) {
					feedback = { type: "error", text: err.message || "Failed to update VIP status." };
					render();
				}
			};
		});
	}

	loadOwnerData();
	container.__refreshPanel = loadOwnerData;
}

function mountLockScreenAuthCard(container, osInstance) {
	let authMode = "signin";
	let emailVal = "";
	let passVal = "";
	let usernameVal = "";
	let avatarDataUrl = "";
	let avatarFileName = "Optional profile picture...";
	let busy = false;
	let errorMsg = "";

	function render() {
		const auth = getVeilAuthState();
		const isAccount = auth.mode === "account";
		const isOwner = Boolean(auth.isOwner);
		const isVip = Boolean(isOwner || hasVipAccess());

		if (isAccount) {
			container.innerHTML = `
				<div class="w-full flex flex-col items-center gap-3.5 text-center">
					<div class="relative group">
						<div class="w-20 h-20 rounded-full bg-[#181822] flex items-center justify-center shadow-xl border-2 border-indigo-400/50 overflow-hidden shrink-0">
							${auth.photoURL
								? `<img src="${escapeHtml(auth.photoURL)}" alt="" class="w-full h-full object-cover" />`
								: `<span class="text-2xl font-bold text-indigo-300">${escapeHtml((auth.username || "V").charAt(0).toUpperCase())}</span>`
							}
						</div>
					</div>
					<div class="flex flex-col items-center gap-1">
						<div class="flex items-center gap-2">
							<h2 class="text-base sm:text-lg font-bold tracking-tight text-white">@${escapeHtml(auth.username)}</h2>
							${isOwner
								? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40">Owner</span>`
								: isVip
								? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">VIP</span>`
								: ""
							}
						</div>
						<span class="text-[11px] text-neutral-400">${escapeHtml(auth.email || "Onyx Chat Account")}</span>
					</div>
					<div class="w-full flex flex-col gap-2 mt-1">
						<button type="button" id="lock-enter-os-btn"
							class="group relative w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2.5">
							<span>Enter VeilOS</span>
							<i class="fa-solid fa-arrow-right text-xs transition-transform duration-300 group-hover:translate-x-1"></i>
						</button>
						<div class="grid grid-cols-2 gap-2">
							<button type="button" id="lock-signout-btn"
								class="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-[11px] font-semibold cursor-pointer transition-colors">
								Sign Out
							</button>
							<button type="button" id="lock-guest-btn"
								class="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-[11px] font-semibold cursor-pointer transition-colors">
								Continue as Guest
							</button>
						</div>
					</div>
				</div>
			`;
			const enterBtn = container.querySelector("#lock-enter-os-btn");
			if (enterBtn) enterBtn.onclick = () => osInstance.unlockOS();
			const signOutBtn = container.querySelector("#lock-signout-btn");
			if (signOutBtn) {
				signOutBtn.onclick = async () => {
					await window.VeilAuth.signOut();
					render();
				};
			}
			const guestBtn = container.querySelector("#lock-guest-btn");
			if (guestBtn) {
				guestBtn.onclick = async () => {
					await window.VeilAuth.continueAsGuest();
					osInstance.unlockOS();
				};
			}
			return;
		}

		container.innerHTML = `
			<div class="w-full flex flex-col items-center gap-3 text-center">
				<div class="flex items-center gap-2.5">
					<div class="w-10 h-10 rounded-2xl bg-[#181822] border border-indigo-400/40 flex items-center justify-center shadow-lg">
						<svg viewBox="0 0 64 64" class="w-6 h-6" aria-label="VeilOS">
							<defs>
								<linearGradient id="veilLockGradMini" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" stop-color="#6366f1"/>
									<stop offset="100%" stop-color="#38bdf8"/>
								</linearGradient>
							</defs>
							<path d="M12 14L32 52L52 14H41.5L32 33.5L22.5 14H12Z" fill="url(#veilLockGradMini)"/>
						</svg>
					</div>
					<div class="text-left">
						<div class="tracking-[0.2em] font-bold uppercase text-xs text-indigo-400">VEILOS</div>
						<div class="text-xs text-neutral-300 font-medium">Sign in with your Onyx Chat account</div>
					</div>
				</div>

				<div class="w-full grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/45 border border-white/10">
					<button type="button" id="lock-tab-signin" class="py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${authMode === "signin" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white"}">Sign In</button>
					<button type="button" id="lock-tab-signup" class="py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${authMode === "signup" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white"}">Create Account</button>
				</div>

				${errorMsg ? `
					<div class="w-full p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[11px] text-left">
						${escapeHtml(errorMsg)}
					</div>
				` : ""}

				<form id="lock-auth-form" class="w-full flex flex-col gap-2 text-left">
					<input id="lock-email" type="email" required value="${escapeHtml(emailVal)}" placeholder="Email address"
						class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-400" />
					<input id="lock-password" type="password" required value="${escapeHtml(passVal)}" placeholder="Password"
						class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-400" />
					${authMode === "signup" ? `
						<input id="lock-username" type="text" required maxlength="20" value="${escapeHtml(usernameVal)}" placeholder="Unique username"
							class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-400" />
						<label class="w-full px-3 py-2 rounded-xl bg-black/40 border border-dashed border-white/20 hover:border-indigo-400/50 text-[11px] text-neutral-300 cursor-pointer text-center truncate">
							<i class="fa-solid fa-image mr-1.5 text-indigo-400"></i>${escapeHtml(avatarFileName)}
							<input id="lock-avatar-file" type="file" accept="image/*" class="hidden" />
						</label>
					` : ""}
					<button type="submit" ${busy ? "disabled" : ""}
						class="w-full py-2.5 mt-0.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 disabled:opacity-55 text-white font-bold text-xs tracking-wider uppercase shadow-xl cursor-pointer transition-all">
						${busy ? "Signing In..." : (authMode === "signup" ? "Create Account & Enter" : "Sign In & Enter")}
					</button>
				</form>

				<div class="w-full flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-wider">
					<div class="flex-1 h-px bg-white/10"></div>
					<span>or</span>
					<div class="flex-1 h-px bg-white/10"></div>
				</div>

				<button type="button" id="lock-continue-guest-btn"
					class="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-neutral-200 hover:text-white font-semibold text-xs cursor-pointer transition-colors flex items-center justify-center gap-2">
					<i class="fa-regular fa-user text-neutral-400"></i>
					<span>Continue as Guest</span>
				</button>
			</div>
		`;

		const tabIn = container.querySelector("#lock-tab-signin");
		const tabUp = container.querySelector("#lock-tab-signup");
		if (tabIn) tabIn.onclick = () => { authMode = "signin"; errorMsg = ""; render(); };
		if (tabUp) tabUp.onclick = () => { authMode = "signup"; errorMsg = ""; render(); };

		const emInp = container.querySelector("#lock-email");
		const pwInp = container.querySelector("#lock-password");
		const unInp = container.querySelector("#lock-username");
		if (emInp) emInp.oninput = (e) => { emailVal = e.target.value; };
		if (pwInp) pwInp.oninput = (e) => { passVal = e.target.value; };
		if (unInp) unInp.oninput = (e) => { usernameVal = e.target.value; };

		const fileInp = container.querySelector("#lock-avatar-file");
		if (fileInp) {
			fileInp.onchange = async (e) => {
				const file = e.target.files?.[0];
				if (!file || !window.VeilAuth) return;
				avatarFileName = file.name;
				try {
					avatarDataUrl = await window.VeilAuth.compressAvatarFile(file);
				} catch (_) {}
				render();
			};
		}

		const form = container.querySelector("#lock-auth-form");
		if (form) {
			form.onsubmit = async (e) => {
				e.preventDefault();
				if (busy) return;
				if (!window.VeilAuth) {
					errorMsg = "Account service is still loading. Please try again.";
					render();
					return;
				}
				busy = true;
				errorMsg = "";
				render();
				try {
					if (authMode === "signup") {
						await window.VeilAuth.signUp({
							email: emailVal,
							password: passVal,
							username: usernameVal,
							photoDataUrl: avatarDataUrl,
						});
					} else {
						await window.VeilAuth.signIn(emailVal, passVal);
					}
					passVal = "";
					osInstance.unlockOS();
				} catch (err) {
					errorMsg = err.message || "Sign in failed.";
				} finally {
					busy = false;
					render();
				}
			};
		}

		const guestBtn = container.querySelector("#lock-continue-guest-btn");
		if (guestBtn) {
			guestBtn.onclick = async () => {
				if (window.VeilAuth) {
					await window.VeilAuth.continueAsGuest();
				}
				osInstance.unlockOS();
			};
		}
	}

	render();
	container.__refreshLockAuth = render;
}

function Config() {
	this.cfgTab = "search";
	this.cfgTick = 0;

	window.__setCfgTab = (tabName) => {
		if (tabName === "owner" && !(window.VeilAuth && window.VeilAuth.isOwner())) {
			this.cfgTab = "vip";
		} else {
			this.cfgTab = tabName || "search";
		}
		this.cfgTick = (this.cfgTick || 0) + 1;
	};
	const refreshActiveCfgSlots = () => {
		document.querySelectorAll("[data-veil-cfg-slot]").forEach((el) => {
			if (typeof el.__refreshPanel === "function") el.__refreshPanel();
		});
	};
	window.__refreshCfgPanels = () => {
		if (this.cfgTab === "owner" && !(window.VeilAuth && window.VeilAuth.isOwner())) {
			this.cfgTab = "vip";
		}
		this.cfgTick = (this.cfgTick || 0) + 1;
		refreshActiveCfgSlots();
	};
	if (window.VeilAuth && typeof window.VeilAuth.subscribe === "function") {
		window.VeilAuth.subscribe(() => {
			if (this.cfgTab === "owner" && !window.VeilAuth.isOwner()) {
				this.cfgTab = "vip";
			}
			this.cfgTick = (this.cfgTick || 0) + 1;
			refreshActiveCfgSlots();
		});
	}

	this.css = `
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 1;
    
    &.cfg {
      background: rgba(15, 15, 22, 0.96) !important;
      color: #f4f4f5;
      border: 1px solid rgba(99, 102, 241, 0.25) !important;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 36px rgba(99, 102, 241, 0.14);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      padding: 24px;
      max-width: 600px;
      width: 94%;
      box-sizing: border-box;
      max-height: 88vh;
      overflow-y: auto;
      outline: none !important;
    }

    &.cfg:focus, &.cfg:focus-visible {
      outline: none !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85) !important;
    }

    &.cfg *:focus:not(.selected-item),
    &.cfg *:focus-visible:not(.selected-item) {
      outline: none !important;
      box-shadow: none !important;
    }

    .selected-item, &.cfg .selected-item, dialog .selected-item, dialog button.selected-item {
      outline: 2px solid #ffffff !important;
      outline-offset: 2px !important;
      border: 2px solid #6366f1 !important;
      background-color: rgba(99, 102, 241, 0.22) !important;
      color: #ffffff !important;
      box-shadow: 0 0 18px rgba(99, 102, 241, 0.35) !important;
    }

    &::backdrop {
      background: rgba(0, 0, 0, 0.75) !important;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 12px;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: #f4f4f5;
      font-family: "Plus Jakarta Sans", sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tab-pills {
      display: flex;
      gap: 6px;
      margin-bottom: 18px;
      background: rgba(255, 255, 255, 0.04);
      padding: 4px;
      border-radius: 14px;
      border: none !important;
      outline: none !important;
    }

    .tab-pills button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #a1a1aa;
      background: transparent;
      border: none !important;
      outline: none !important;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .tab-pills button.active {
      background: rgba(99, 102, 241, 0.22) !important;
      outline: none !important;
      border: 1px solid rgba(99, 102, 241, 0.4) !important;
      color: #ffffff !important;
      box-shadow: none !important;
    }

    .tab-pills button:focus,
    .tab-pills button:focus-visible,
    .tab-pills button.active:focus,
    .tab-pills button.active:focus-visible {
      outline: none !important;
      box-shadow: none !important;
    }

    .tab-pills button:hover:not(.active) {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
    }

    .section-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a1a1aa;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .buttons button {
      flex: 1;
      border: none !important;
      outline: none !important;
      background-color: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      color: #a1a1aa;
      padding: 10px 14px;
      font-size: 0.85rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .buttons button.active {
      background-color: rgba(99, 102, 241, 0.24);
      border: 1px solid rgba(99, 102, 241, 0.65) !important;
      outline: none !important;
      color: #ffffff;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.25);
    }

    .buttons button:hover:not(.active) {
      background-color: rgba(255, 255, 255, 0.08);
      color: #f4f4f5;
    }

    .input_row {
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input_row label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #a1a1aa;
    }

    .input_row input {
      background-color: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      color: #f4f4f5;
      outline: none !important;
      padding: 10px 12px;
      font-size: 0.85rem;
      transition: all 0.2s;
      font-family: "IBM Plex Mono", monospace;
    }

    .input_row input:focus {
      border-color: rgba(99, 102, 241, 0.65) !important;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.25) !important;
      background-color: rgba(0, 0, 0, 0.65);
      outline: none !important;
    }

    .status-pill {
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.75rem;
      color: #38bdf8;
      background-color: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 10px 14px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 16px;
    }

    .close-btn {
      background: linear-gradient(135deg, #6366f1, #38bdf8);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      outline: none !important;
      border-radius: 12px;
      padding: 12px 24px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
    }

    .close-btn:hover {
      background: linear-gradient(135deg, #818cf8, #38bdf8);
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(99, 102, 241, 0.45);
    }

    .close-btn:active {
      transform: translateY(0);
    }
  `;

	function handleModalClose(modal) {
		modal.classList.add("animate-fade-out");
		setTimeout(() => {
			modal.close();
			modal.classList.remove("animate-fade-out");
		}, 200);
	}

	return html`
      <dialog class="cfg">
        <div class="modal-header">
          <div class="modal-title">
            <i class="fa-solid fa-gear text-indigo-400"></i>
            <span>VeilOS Preferences & Cloak</span>
          </div>
        </div>

        <div class="tab-pills">
          <button class=${use(this.cfgTab, (t) => t === "search" ? "active" : "")} on:click=${() => { this.cfgTab = "search"; }}>
            <i class="fa-solid fa-magnifying-glass"></i>
            <span>Search</span>
          </button>
          <button class=${use(this.cfgTab, (t) => t === "cloak" ? "active" : "")} on:click=${() => { this.cfgTab = "cloak"; }}>
            <i class="fa-solid fa-user-secret"></i>
            <span>Cloaking</span>
          </button>
          <button class=${use(this.cfgTab, (t) => t === "vip" ? "active" : "")} on:click=${() => { this.cfgTab = "vip"; }}>
            <i class="fa-solid fa-crown text-amber-400"></i>
            <span>Account &amp; VIP</span>
          </button>
          ${use(this.cfgTick, () => {
						const isOwn = window.VeilAuth && window.VeilAuth.isOwner && window.VeilAuth.isOwner();
						if (!isOwn) return null;
						return html`
              <button class=${use(this.cfgTab, (t) => t === "owner" ? "active" : "")} on:click=${() => { this.cfgTab = "owner"; }}>
                <i class="fa-solid fa-shield-halved text-amber-400"></i>
                <span>Owner</span>
              </button>
            `;
					})}
        </div>

        ${use(this.cfgTab, (tab) => {
					if (tab === "vip") {
						const slot = document.createElement("div");
						slot.setAttribute("data-veil-cfg-slot", "vip");
						slot.className = "mb-4 animate-fade";
						mountSettingsVipPanel(slot);
						return slot;
					}
					if (tab === "owner") {
						const slot = document.createElement("div");
						slot.setAttribute("data-veil-cfg-slot", "owner");
						slot.className = "mb-4 animate-fade";
						mountSettingsOwnerPanel(slot);
						return slot;
					}
					if (tab === "search") {
						const curEng = (store.searchEngine || "google").toLowerCase();
						const engines = [
							{ id: "google", name: "Google", icon: "fa-brands fa-google text-emerald-400" },
							{ id: "duckduckgo", name: "DuckDuckGo", icon: "fa-solid fa-shield-halved text-amber-400" },
							{ id: "bing", name: "Bing", icon: "fa-brands fa-microsoft text-sky-400" },
							{ id: "brave", name: "Brave Search", icon: "fa-solid fa-fire text-orange-400" }
						];
						return html`
              <div class="flex flex-col gap-3 mb-4 animate-fade">
                <div class="section-title">Default Search Engine</div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                  ${engines.map(eng => {
										const isSel = curEng === eng.id;
										return html`
                      <button
                        class:selected-item=${isSel}
                        class=${isSel
                          ? "selected-item p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs font-semibold bg-indigo-500/20 border-2 border-indigo-400 text-white shadow-lg"
                          : "p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs font-semibold bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                        }
                        on:click=${() => {
													store.searchEngine = eng.id;
													try { localStorage.setItem("spade_user_picked_engine", "true"); } catch(e){}
													this.cfgTab = "search";
												}}>
                        <div class="flex items-center gap-2.5">
                          <i class="${eng.icon} text-sm"></i>
                          <span>${eng.name}</span>
                        </div>
                        ${isSel ? html`<i class="fa-solid fa-circle-check text-indigo-300 text-xs"></i>` : null}
                      </button>
                    `;
									})}
                </div>
                <div class="text-[11px] text-neutral-400 bg-white/5 p-3 rounded-xl leading-relaxed">
                  Queries entered into the address bar will automatically route through your selected search provider.
                </div>
              </div>
            `;
					} else {
						const defaultVeilIcon = (typeof window !== "undefined" && window.VEIL_ICON_DATA_URL) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236366f1'/%3E%3Cstop offset='100%25' stop-color='%2338bdf8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='16' fill='%2309090b'/%3E%3Cpath d='M16 18L32 48L48 18H39.5L32 33.5L24.5 18H16Z' fill='url(%23g)'/%3E%3C/svg%3E";
						const presets = window.TAB_CLOAK_PRESETS || [
							{ id: "veil", name: "VeilOS (Default)", title: "VeilOS", icon: defaultVeilIcon },
							{ id: "google", name: "Google", title: "Google", icon: "https://www.google.com/favicon.ico" },
							{ id: "classroom", name: "Google Classroom", title: "Classes", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
							{ id: "drive", name: "Google Drive", title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png" },
							{ id: "docs", name: "Google Docs", title: "Google Docs", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" },
							{ id: "canvas", name: "Canvas LMS", title: "Canvas", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
							{ id: "desmos", name: "Desmos Calculator", title: "Desmos | Graphing Calculator", icon: "https://www.desmos.com/favicon.ico" }
						];
						const curCloak = (!store.tabCloak || store.tabCloak === "default" || store.tabCloak === "spade") ? "veil" : store.tabCloak;
						return html`
              <div class="flex flex-col gap-3 mb-4 animate-fade">
                <div class="section-title">Tab Cloak Presets</div>
                <div class="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  ${presets.map(p => {
										const isSel = curCloak === p.id;
										return html`
                    <button
                      class:selected-item=${isSel}
                      class=${isSel
                        ? "selected-item p-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer text-xs bg-indigo-500/20 border-2 border-indigo-400 text-white font-semibold shadow-lg"
                        : "p-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer text-xs bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                      }
                      on:click=${() => {
												store.tabCloak = p.id;
												if (window.applyTabCloak) window.applyTabCloak(p.id);
												this.cfgTab = "cloak";
											}}>
                      <div class="flex items-center gap-2 truncate">
                        <img src="${p.icon || defaultVeilIcon}" class="w-4 h-4 rounded object-contain shrink-0" />
                        <span class="truncate">${p.name}</span>
                      </div>
                      ${isSel ? html`<i class="fa-solid fa-circle-check text-indigo-300 text-xs shrink-0"></i>` : null}
                    </button>
                  `;
									})}
                </div>

                <div class="section-title mt-2">Stealth Launchers</div>
                <div class="grid grid-cols-2 gap-2">
                  <button class="p-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                    on:click=${() => { if (window.openAboutBlankCloak) window.openAboutBlankCloak(); }}>
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>About:Blank Cloak</span>
                  </button>
                  <button class="p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                    on:click=${() => { if (window.openBlobCloak) window.openBlobCloak(); }}>
                    <i class="fa-solid fa-cube"></i>
                    <span>Blob Cloak</span>
                  </button>
                </div>

                <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 mt-1">
                  <div class="flex flex-col">
                    <span class="text-xs font-semibold text-white">Auto About:Blank Cloak</span>
                    <span class="text-[10px] text-neutral-400">Launch in disguised about:blank automatically</span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" checked=${Boolean(store.autoAboutBlank)}
                      on:change=${(e) => {
												const checked = Boolean(e.target.checked);
												store.autoAboutBlank = checked;
												try {
													localStorage.setItem("veil_auto_about_blank", checked ? "true" : "false");
													localStorage.setItem("spade_auto_about_blank", checked ? "true" : "false");
												} catch(err) {}
												this.cfgTab = "cloak";
											}}>
                    <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
              </div>
            `;
					}
				})}

        <div class="flex flex-col gap-2 pt-2 border-t border-white/10 mt-3">
          <button class="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-between cursor-pointer transition-all"
            on:click=${() => {
							handleModalClose(this.root);
							if (window.osGlobalInstance) {
								window.osGlobalInstance.openApp("changelog");
							}
						}}>
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-scroll text-sky-400"></i>
              <span>View VeilOS Changelog & Credits</span>
            </div>
            <span class="text-[10px] text-sky-400 font-mono tabular-nums">${UI_VEIL_VERSION} &rarr;</span>
          </button>

          <button class="close-btn" on:click=${() => {
						if (window.applyTabCloak) window.applyTabCloak(store.tabCloak, store.customCloakTitle, store.customCloakIcon);
						handleModalClose(this.root);
					}}>
            <i class="fa-solid fa-check"></i>
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </dialog>
  `;
}

window.addEventListener("load", async () => {
	if (!window.ScramjetHost) {
		console.error("ScramjetHost is not defined. Include /scram-host.js after /host/host.js.");
		return;
	}

	let scramjet;
	try {
		const preferredTransport = store.transport || "/libcurl/index.mjs";
		const bootWisp = await resolveWispUrl(store.wispurl);
		try {
			scramjet = await window.ScramjetHost.boot({
				transport: preferredTransport,
				wisp: bootWisp,
			});
			if (scramjet && scramjet.transportKind && typeof store !== "undefined") {
				store.transport = scramjet.transportKind === "epoxy" ? "/epoxy/index.mjs" : "/libcurl/index.mjs";
			}
		} catch (bootErr) {
			const fallbackTransport = String(preferredTransport).includes("epoxy")
				? "/libcurl/index.mjs"
				: "/epoxy/index.mjs";
			console.warn(`[Scramjet] Failed to start with ${preferredTransport}, falling back to ${fallbackTransport}:`, bootErr);
			scramjet = await window.ScramjetHost.boot({
				transport: fallbackTransport,
				wisp: bootWisp,
			});
			if (typeof store !== "undefined") {
				store.transport = fallbackTransport;
			}
		}
	} catch (err) {
		console.error("[Scramjet] Failed to start:", err);
		return;
	}

	let globalNextTabNumericId = 1;
	let globalNextWindowNumericId = 1;
	let sapphireInitPromise = null;

	const getOnyxBrowserWindows = () => {
		const inst = window.osGlobalInstance;
		if (!inst || !Array.isArray(inst.windows)) return [];
		return inst.windows.filter((w) => w && w.customState && Array.isArray(w.customState.tabs));
	};

	const findOnyxTabById = (tabId) => {
		for (const w of getOnyxBrowserWindows()) {
			const tabs = w.customState.tabs;
			const idx = tabs.findIndex((t) => t.numericId === tabId);
			if (idx !== -1) {
				return { win: w, tab: tabs[idx], index: idx };
			}
		}
		return null;
	};

	const findOnyxTabByWindow = (targetWin) => {
		if (!targetWin) return null;
		for (const w of getOnyxBrowserWindows()) {
			const tabs = w.customState.tabs;
			for (let i = 0; i < tabs.length; i++) {
				const t = tabs[i];
				const iframeWin = t.frameObj?.frame?.contentWindow;
				if (!iframeWin) continue;
				if (iframeWin === targetWin) return { win: w, tab: t, index: i };
				try {
					if (targetWin.top === iframeWin) return { win: w, tab: t, index: i };
				} catch (_) {}
				try {
					let cur = targetWin;
					for (let depth = 0; depth < 10 && cur && cur.parent && cur.parent !== cur; depth++) {
						if (cur.parent === iframeWin) return { win: w, tab: t, index: i };
						cur = cur.parent;
					}
				} catch (_) {}
			}
		}
		return null;
	};

	const getActiveOnyxBrowserWindow = () => {
		const inst = window.osGlobalInstance;
		const bWins = getOnyxBrowserWindows();
		if (!bWins.length) return null;
		if (inst && inst.activeWinId) {
			const active = bWins.find((w) => w.id === inst.activeWinId);
			if (active) return active;
		}
		return bWins[bWins.length - 1];
	};

	const toSapphireTabInfo = (w, t, idx) => {
		const windowNumericId = w.customState?.windowNumericId || 1;
		const inst = window.osGlobalInstance;
		const isActiveWin = !inst?.activeWinId || inst.activeWinId === w.id;
		const isActiveTab = isActiveWin && w.customState?.activeTabId === t.id;
		return {
			id: t.numericId,
			windowId: windowNumericId,
			url: t.url || "onyx://newtab",
			title: t.title || "New Tab",
			active: Boolean(isActiveTab),
			index: idx,
		};
	};

	window.ensureSapphire = function () {
		if (window.sapphire) {
			if (scramjet && scramjet.controller && typeof window.sapphire.attachController === "function") {
				window.sapphire.attachController(scramjet.controller);
			}
			return Promise.resolve(window.sapphire);
		}
		if (sapphireInitPromise) {
			return sapphireInitPromise;
		}

		sapphireInitPromise = (async () => {
			if (typeof window.Sapphire !== "function") {
				throw new Error("Sapphire class is not available. Ensure /host/host.js is loaded.");
			}

			const adapter = {
				ensureController: () => {
					if (window.sapphire && scramjet && scramjet.controller && typeof window.sapphire.attachController === "function") {
						window.sapphire.attachController(scramjet.controller);
					}
				},
				getTabId: (win) => {
					const found = findOnyxTabByWindow(win);
					return found ? found.tab.numericId : null;
				},
				getTab: (tabId) => {
					const found = findOnyxTabById(tabId);
					return found ? toSapphireTabInfo(found.win, found.tab, found.index) : null;
				},
				getAllTabs: () => {
					const all = [];
					for (const w of getOnyxBrowserWindows()) {
						w.customState.tabs.forEach((t, i) => {
							all.push(toSapphireTabInfo(w, t, i));
						});
					}
					return all;
				},
				getActiveTabId: () => {
					const w = getActiveOnyxBrowserWindow();
					if (!w) return null;
					const active = w.customState.tabs.find((t) => t.id === w.customState.activeTabId) || w.customState.tabs[0];
					return active ? active.numericId : null;
				},
				getTabWindow: (tabId) => {
					const found = findOnyxTabById(tabId);
					try {
						return found?.tab.frameObj?.frame?.contentWindow || null;
					} catch (_) {
						return null;
					}
				},
				navigateTab: (tabId, url) => {
					if (tabId === null || tabId === undefined) {
						adapter.createTab(url, { active: true });
						return;
					}
					const found = findOnyxTabById(tabId);
					if (found && found.win.customState && typeof found.win.customState.loadTabUrl === "function") {
						found.win.customState.loadTabUrl(found.tab, url);
					}
				},
				createTab: (url, options = {}) => {
					const targetUrl = url || "onyx://newtab";
					const w = getActiveOnyxBrowserWindow();
					if (w && w.customState && typeof w.customState.createTab === "function") {
						const tabObj = w.customState.createTab(targetUrl);
						w.customState.tabs.push(tabObj);
						if (options.active !== false && typeof w.customState.switchTab === "function") {
							w.customState.switchTab(tabObj.id);
						} else if (typeof w.customState.renderTabStrip === "function") {
							w.customState.renderTabStrip();
						}
						return tabObj.numericId;
					}
					const inst = window.osGlobalInstance;
					if (inst && typeof inst.openApp === "function") {
						inst.openApp("browser", { url: targetUrl });
						const bWin = getActiveOnyxBrowserWindow();
						const openedTab = bWin?.customState?.tabs?.[bWin.customState.tabs.length - 1];
						return openedTab ? openedTab.numericId : null;
					}
					return null;
				},
				closeTab: (tabId) => {
					const found = findOnyxTabById(tabId);
					if (found && found.win.customState && typeof found.win.customState.closeTab === "function") {
						found.win.customState.closeTab(found.tab.id);
					}
				},
				reloadTab: (tabId) => {
					const found = findOnyxTabById(tabId);
					if (found?.tab?.frameObj?.reload) {
						found.tab.frameObj.reload();
					}
				},
				activateTab: (tabId) => {
					const found = findOnyxTabById(tabId);
					if (!found) return;
					if (window.osGlobalInstance && typeof window.osGlobalInstance.focusWindow === "function") {
						window.osGlobalInstance.focusWindow(found.win.id);
					}
					if (found.win.customState && typeof found.win.customState.switchTab === "function") {
						found.win.customState.switchTab(found.tab.id);
					}
				},
				goBack: (tabId) => {
					const found = findOnyxTabById(tabId);
					if (found?.tab?.frameObj?.back) {
						found.tab.frameObj.back();
					}
				},
				goForward: (tabId) => {
					const found = findOnyxTabById(tabId);
					if (found?.tab?.frameObj?.forward) {
						found.tab.frameObj.forward();
					}
				},
				openPopup: (extId, tabId) => {
					const found = tabId !== null && tabId !== undefined ? findOnyxTabById(tabId) : null;
					const w = found ? found.win : getActiveOnyxBrowserWindow();
					if (w && w.customState && typeof w.customState.showExtensionPopover === "function") {
						w.customState.showExtensionPopover(extId);
						return true;
					}
					return false;
				},
				closePopup: (extId) => {
					for (const w of getOnyxBrowserWindows()) {
						if (w.customState && typeof w.customState.hidePopover === "function") {
							if (!extId || w.customState.activePopupExtId === extId) {
								w.customState.hidePopover();
							}
						}
					}
				},
				showNotification: (title, message) => {
					if (window.osGlobalInstance && typeof window.osGlobalInstance.notify === "function") {
						window.osGlobalInstance.notify(title || "Extension", message || "", "fa-solid fa-puzzle-piece", "info");
					}
				},
			};

			const sapphire = new window.Sapphire({ host: adapter });
			await sapphire.init();
			if (scramjet && scramjet.controller && typeof sapphire.attachController === "function") {
				sapphire.attachController(scramjet.controller);
			}
			window.sapphire = sapphire;
			return sapphire;
		})().catch((err) => {
			sapphireInitPromise = null;
			console.error("[Sapphire] Failed to initialize extension engine:", err);
			throw err;
		});

		return sapphireInitPromise;
	};

	// Initialize Sapphire in the background after Scramjet boots so lock screen rendering is never blocked.
	void window.ensureSapphire().catch(() => {});

	const LOCKSCREEN_QUOTES = [
		{
			author: "Yuki",
			quote: "9.3/10",
			role: "Owner of Snipershot",
			icon: "fa-solid fa-crosshairs",
			avatarBg: "bg-gradient-to-br from-amber-500 to-red-600"
		},
		{
			author: "Obamamegagon",
			quote: "VeilOS is tuff like me",
			role: "Owner of Potatoland and Black Hat",
			icon: "fa-solid fa-hat-cowboy",
			avatarBg: "bg-gradient-to-br from-indigo-500 to-purple-700"
		},
		{
			author: "hvtrs",
			quote: "veilos mogs figure",
			role: "Ex-Owner of Cherri",
			icon: "fa-solid fa-crown",
			avatarBg: "bg-gradient-to-br from-rose-600 to-pink-700"
		},
		{
			author: "MrCoffee",
			quote: "wow this is amazing and i love it so much",
			role: "Owner of Vanta",
			icon: "fa-solid fa-mug-hot",
			avatarBg: "bg-gradient-to-br from-amber-700 to-yellow-900"
		},
		{
			author: "david",
			quote: "faiz basha faiz basha blue bands 🩵",
			role: "Owner of Novene",
			icon: "fa-solid fa-gem",
			avatarBg: "bg-gradient-to-br from-sky-500 to-cyan-700"
		},
		{
			author: "Rasha",
			quote: "veil os is so clean and fast 👌",
			role: "Owner of Niche and T9 Network",
			icon: "fa-solid fa-fingerprint",
			avatarBg: "bg-gradient-to-br from-emerald-600 to-teal-800"
		},
		{
			author: "Dominus",
			quote: "Site so good even the femboys couldnt resist",
			role: "Owner of Dominum Network",
			icon: "fa-solid fa-bolt",
			avatarBg: "bg-gradient-to-br from-purple-600 to-indigo-700"
		},
		{
			author: "zxs",
			quote: "Vrrtrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
			role: "Owner of Emis, Zodiac and Luna",
			icon: "fa-solid fa-brain",
			avatarBg: "bg-gradient-to-br from-fuchsia-600 to-pink-800"
		},
		{
			author: "Suki",
			quote: "If you use Veil you have aura",
			role: "Owner of Celsius",
			icon: "fa-solid fa-sun",
			avatarBg: "bg-gradient-to-br from-amber-500 to-orange-600"
		},
		{
			author: "midnight",
			quote: "VeilOS runs the web desktop",
			role: "Owner of Nocturne",
			icon: "fa-solid fa-moon",
			avatarBg: "bg-gradient-to-br from-slate-700 to-indigo-900"
		},
		{
			author: "bestspark",
			quote: "this is one of the good web os'es out there according to my 30 second view of it",
			role: "Owner of BestSpark",
			icon: "fa-solid fa-star",
			avatarBg: "bg-gradient-to-br from-yellow-500 to-amber-700"
		},
		{
			author: "taii",
			quote: "veilos is amazing i love it",
			role: "Owner of Mizumath",
			icon: "fa-solid fa-heart",
			avatarBg: "bg-gradient-to-br from-teal-500 to-emerald-700"
		}
	];

	const APPS = [
		{ 
			id: "browser", 
			name: "Onyx Browser", 
			logoUrl: null, 
			iconClass: "fa-solid fa-bolt", 
			iconColor: "text-sky-400", 
			dockGradient: "from-blue-500 to-indigo-600", 
			desc: "Fast, privacy-focused Web Browser with multi-tab workspace", 
			category: "Internet", 
			defaultW: 980, 
			defaultH: 640, 
			inDock: true 
		},
		{ 
			id: "movies", 
			name: "SSV Movies", 
			logoUrl: null, 
			iconClass: "fa-solid fa-film", 
			iconColor: "text-rose-400", 
			dockGradient: "from-pink-600 via-purple-700 to-indigo-800", 
			desc: "Movies, TV shows, and streaming player (Cherri / SSV)", 
			category: "Entertainment", 
			defaultW: 1080, 
			defaultH: 720, 
			inDock: true 
		},
		{ 
			id: "games", 
			name: "Pulse Games", 
			logoUrl: null, 
			iconClass: "fa-solid fa-gamepad", 
			iconColor: "text-violet-400", 
			dockGradient: "from-violet-600 to-purple-800", 
			desc: "Arcade and interactive games with community libraries", 
			category: "Gaming", 
			defaultW: 1080, 
			defaultH: 720, 
			inDock: true 
		},
		{ 
			id: "music", 
			name: "Sonora", 
			logoUrl: null, 
			iconClass: "fa-solid fa-music", 
			iconColor: "text-rose-400", 
			dockGradient: "from-rose-500 via-fuchsia-600 to-indigo-600", 
			desc: "High-fidelity music streaming proxied via cherrion.top/music", 
			category: "Entertainment", 
			defaultW: 1060, 
			defaultH: 700, 
			inDock: false 
		},
		{ 
			id: "ai", 
			name: "Scenario", 
			logoUrl: null, 
			iconClass: "fa-solid fa-brain", 
			iconColor: "text-purple-400", 
			dockGradient: "from-indigo-600 via-purple-600 to-pink-500", 
			desc: "Scenario AI Assistant (proxied via scenario-wheat.vercel.app)", 
			category: "Productivity", 
			defaultW: 1040, 
			defaultH: 700, 
			inDock: false 
		},
		{ 
			id: "chat", 
			name: "Onyx Chat", 
			logoUrl: null, 
			iconClass: "fa-solid fa-message", 
			iconColor: "text-emerald-400", 
			dockGradient: "from-emerald-500 to-teal-600", 
			desc: "Multi-channel community chat room", 
			category: "Social", 
			defaultW: 860, 
			defaultH: 580, 
			inDock: true 
		},
		{ 
			id: "vault", 
			name: "Helium Vault", 
			logoUrl: null, 
			iconClass: "fa-solid fa-vault", 
			iconColor: "text-cyan-400", 
			dockGradient: "from-rose-500 via-indigo-600 to-cyan-500", 
			desc: "Curated Movies, TV Shows & Direct Streams (Lord Beerus)", 
			category: "Entertainment", 
			defaultW: 1120, 
			defaultH: 740, 
			inDock: false 
		},
		{ 
			id: "cloudgaming", 
			name: "Cloud Gaming", 
			logoUrl: null, 
			iconClass: "fa-solid fa-cloud", 
			iconColor: "text-teal-400", 
			dockGradient: "from-teal-600 to-indigo-700", 
			desc: "Cloud gaming mirrors (Frogiee's Arcade)", 
			category: "Gaming", 
			defaultW: 1040, 
			defaultH: 700, 
			inDock: false 
		},
		{ 
			id: "activity", 
			name: "Task Manager", 
			logoUrl: null, 
			iconClass: "fa-solid fa-chart-line", 
			iconColor: "text-rose-400", 
			dockGradient: "from-rose-600 to-red-800", 
			desc: "Realtime CPU/RAM meters & process supervisor", 
			category: "System", 
			defaultW: 760, 
			defaultH: 500, 
			inDock: false 
		},
		{ 
			id: "terminal", 
			name: "Veil Terminal", 
			logoUrl: null, 
			iconClass: "fa-solid fa-terminal", 
			iconColor: "text-emerald-400", 
			dockGradient: "from-emerald-500 to-slate-900", 
			desc: "Developer console & system shell", 
			category: "System", 
			defaultW: 840, 
			defaultH: 520, 
			inDock: false 
		},
		{ 
			id: "files", 
			name: "Veil Files", 
			logoUrl: null, 
			iconClass: "fa-solid fa-folder-open", 
			iconColor: "text-amber-400", 
			dockGradient: "from-amber-500 to-indigo-600", 
			desc: "Storage explorer, application vault & files", 
			category: "System", 
			defaultW: 880, 
			defaultH: 560, 
			inDock: false 
		},
		{ 
			id: "changelog", 
			name: "Changelog & Credits", 
			logoUrl: null, 
			iconClass: "fa-solid fa-scroll", 
			iconColor: "text-indigo-400", 
			dockGradient: "from-indigo-500 via-sky-500 to-emerald-500", 
			desc: "Version release history, features & project credits", 
			category: "System", 
			defaultW: 940, 
			defaultH: 660, 
			inDock: false 
		}
	];

	function VeilOS() {
		window.osGlobalInstance = this;
		this.appsList = APPS;
		this.windows = [];
		this.activeWinId = null;
		this.appsMenuOpen = false;
		this.startMenuOpen = false;
		this.dockOpen = true;
		this.controlCenterOpen = false;
		this.isLocked = true;
		this.spotlightOpen = false;
		this.spotlightQuery = "";
		this.spotlightSelectedIdx = 0;
		this.contextMenu = { open: false, x: 0, y: 0 };
		this.notifications = [];
		this.soundEffects = (store && store.soundEffects !== undefined) ? store.soundEffects : true;
		this.desktopWidgetsOpen = (store && store.desktopWidgets !== undefined) ? store.desktopWidgets : true;
		if (!store.wallpaper || store.wallpaper === "assets/christmas.jpg" || store.wallpaper === "assets/halloween.jpg" || store.wallpaper === "assets/spadeos-gta6-wallpaper.jpg" || store.wallpaper === "assets/spadeos-lock-backdrop.jpg") {
			store.wallpaper = "assets/background.jpg";
		}
		if (!store.theme || store.theme === "halloween" || store.theme === "christmas" || store.theme === "jolly" || store.theme === "vice" || store.theme === "leonida") {
			store.theme = "default";
		}
		this.batteryLevel = 100;
		this.isCharging = true;
		this.pingMs = 12;

		this.quoteIndex = 0;
		this.quotePaused = false;
		this.nextQuote = () => {
			this.quoteIndex = (this.quoteIndex + 1) % LOCKSCREEN_QUOTES.length;
			this.windows = [...this.windows];
		};
		this.prevQuote = () => {
			this.quoteIndex = (this.quoteIndex - 1 + LOCKSCREEN_QUOTES.length) % LOCKSCREEN_QUOTES.length;
			this.windows = [...this.windows];
		};

		setInterval(() => {
			if (this.isLocked && !this.quotePaused) {
				this.quoteIndex = (this.quoteIndex + 1) % LOCKSCREEN_QUOTES.length;
				this.windows = [...this.windows];
			}
		}, 3500);

		this.notify = (title, message, icon = "fa-solid fa-bell", type = "info") => {
			const id = "notif_" + Date.now();
			this.notifications.push({ id, title, message, icon, type });
			const audioApi = window.SpadeAudio || window.VeilAudio;
			audioApi && audioApi.playPop();
			this.windows = [...this.windows];
			setTimeout(() => {
				this.notifications = this.notifications.filter(n => n.id !== id);
				this.windows = [...this.windows];
			}, 3800);
		};
		window.spadeNotify = this.notify;
		window.veilNotify = this.notify;

		this.spotlightOpen = false;
		this.spotlightQuery = "";
		this.spotlightSelectedIdx = 0;

		const spotlightOverlay = document.createElement("div");
		spotlightOverlay.id = "os-spotlight-overlay";
		spotlightOverlay.className = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 transition-all duration-150 pointer-events-auto hidden";
		spotlightOverlay.style.zIndex = "9999";
		this.spotlightOverlay = spotlightOverlay;

		spotlightOverlay.onclick = (e) => {
			if (e.target === spotlightOverlay) {
				this.closeSpotlight();
			}
		};

		const spotlightCard = document.createElement("div");
		spotlightCard.className = "w-full max-w-xl bg-[#111118]/98 border border-white/15 rounded-3xl shadow-2xl backdrop-blur-3xl overflow-hidden flex flex-col m-auto animate-spotlight text-white font-sans";
		spotlightOverlay.appendChild(spotlightCard);

		const searchHeader = document.createElement("div");
		searchHeader.className = "flex items-center px-4 py-3.5 border-b border-white/10 gap-3 shrink-0";

		const searchIcon = document.createElement("i");
		searchIcon.className = "fa-solid fa-magnifying-glass text-indigo-400 text-base shrink-0";
		searchHeader.appendChild(searchIcon);

		const searchInput = document.createElement("input");
		searchInput.id = "spotlight-search-input";
		searchInput.type = "text";
		searchInput.autocomplete = "off";
		searchInput.spellcheck = false;
		searchInput.className = "flex-1 bg-transparent text-white placeholder-neutral-400 outline-none text-sm font-sans";
		searchInput.placeholder = "Search VeilOS apps or type a web address...";
		searchHeader.appendChild(searchInput);

		const escBadge = document.createElement("span");
		escBadge.className = "text-[10px] text-neutral-300 font-mono bg-white/10 px-2 py-1 rounded-md shrink-0 select-none cursor-pointer hover:bg-white/15";
		escBadge.textContent = "ESC to close";
		escBadge.onclick = () => this.closeSpotlight();
		searchHeader.appendChild(escBadge);

		spotlightCard.appendChild(searchHeader);

		const mathCard = document.createElement("div");
		mathCard.className = "hidden m-3 p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 items-center justify-between";
		spotlightCard.appendChild(mathCard);

		const resultsScroll = document.createElement("div");
		resultsScroll.className = "max-h-80 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1";
		spotlightCard.appendChild(resultsScroll);

		this.renderSpotlightResults = () => {
			resultsScroll.innerHTML = "";
			const rawQ = (searchInput.value || "").trim();
			const q = rawQ.toLowerCase();

			const mathVal = this.evaluateMath(rawQ);
			if (mathVal !== null) {
				mathCard.className = "m-3 p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-between";
				mathCard.innerHTML = `
					<div class="flex items-center gap-2.5">
						<i class="fa-solid fa-calculator text-sky-400"></i>
						<span class="text-xs text-neutral-300 font-mono">${escapeHtml(rawQ)} =</span>
						<span class="text-base font-bold font-mono tabular-nums text-white">${mathVal}</span>
					</div>
					<button class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer">
						Copy
					</button>
				`;
				const copyBtn = mathCard.querySelector("button");
				if (copyBtn) {
					copyBtn.onclick = () => {
						navigator.clipboard.writeText("" + mathVal);
						this.notify("Copied", `Result ${mathVal} copied to clipboard`, "fa-solid fa-check");
					};
				}
			} else {
				mathCard.className = "hidden";
				mathCard.innerHTML = "";
			}

			const filtered = APPS.filter(a => {
				if (!q) return true;
				return a.name.toLowerCase().includes(q) ||
					(a.desc && a.desc.toLowerCase().includes(q)) ||
					(a.category && a.category.toLowerCase().includes(q)) ||
					a.id.toLowerCase().includes(q);
			});

			const countHeader = document.createElement("div");
			countHeader.className = "text-[10px] uppercase font-bold text-neutral-400 tracking-wider px-3 py-1 select-none flex items-center justify-between";
			countHeader.innerHTML = `<span>APPLICATIONS (${filtered.length})</span>`;
			resultsScroll.appendChild(countHeader);

			if (filtered.length === 0 && !rawQ) {
				const emptyEl = document.createElement("div");
				emptyEl.className = "px-3 py-4 text-center text-xs text-neutral-500";
				emptyEl.textContent = "No applications found";
				resultsScroll.appendChild(emptyEl);
			}

			filtered.forEach((app, idx) => {
				const row = document.createElement("div");
				const isSelected = idx === this.spotlightSelectedIdx;
				row.className = `flex items-center justify-between px-3 py-2 rounded-2xl cursor-pointer transition-colors group ${isSelected ? 'bg-white/15' : 'hover:bg-white/10'}`;

				const left = document.createElement("div");
				left.className = "flex items-center gap-3 min-w-0";

				const iconBox = document.createElement("div");
				iconBox.className = "w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white text-sm shadow-sm group-hover:scale-105 transition-transform overflow-hidden p-0.5 shrink-0";
				if (app.logoUrl) {
					const img = document.createElement("img");
					img.src = app.logoUrl;
					img.alt = app.name;
					img.className = "w-6 h-6 object-contain pointer-events-none rounded-lg";
					iconBox.appendChild(img);
				} else {
					const ic = document.createElement("i");
					ic.className = `${app.iconClass || 'fa-solid fa-shapes'} ${app.iconColor || 'text-white'} text-base`;
					iconBox.appendChild(ic);
				}
				left.appendChild(iconBox);

				const textCol = document.createElement("div");
				textCol.className = "flex flex-col min-w-0";

				const nameRow = document.createElement("div");
				nameRow.className = "flex items-center gap-1.5 min-w-0";

				const nameSpan = document.createElement("span");
				nameSpan.className = "text-xs font-semibold text-white truncate";
				nameSpan.textContent = app.name;
				nameRow.appendChild(nameSpan);

				if (VIP_GATED_APPS.has(app.id)) {
					const vipPill = document.createElement("span");
					vipPill.className = hasVipAccess()
						? "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0"
						: "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0";
					vipPill.textContent = "VIP";
					nameRow.appendChild(vipPill);
				}

				textCol.appendChild(nameRow);

				const descSpan = document.createElement("span");
				descSpan.className = "text-[11px] text-neutral-400 truncate";
				descSpan.textContent = app.desc || app.category || "";
				textCol.appendChild(descSpan);

				left.appendChild(textCol);
				row.appendChild(left);

				const enterHint = document.createElement("span");
				enterHint.className = `text-[10px] text-neutral-400 font-mono transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`;
				enterHint.textContent = "Press ↵";
				row.appendChild(enterHint);

				row.onclick = () => {
					this.openApp(app.id);
					this.closeSpotlight();
				};

				resultsScroll.appendChild(row);
			});

			if (rawQ) {
				const isUrl = /^https?:\/\//i.test(rawQ) || (rawQ.includes(".") && !rawQ.includes(" "));
				const webRow = document.createElement("div");
				webRow.className = "flex items-center justify-between px-3 py-2.5 mt-1 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 group";
				webRow.innerHTML = `
					<div class="flex items-center gap-3 min-w-0">
						<i class="fa-solid fa-globe text-sky-400 text-base shrink-0"></i>
						<span class="text-xs text-neutral-200 truncate">
							${isUrl ? `Open URL "<span class="font-bold text-white">${escapeHtml(rawQ)}</span>"` : `Search web for "<span class="font-bold text-white">${escapeHtml(rawQ)}</span>"`}
						</span>
					</div>
					<span class="text-[10px] text-sky-400 font-semibold shrink-0">Browse ↵</span>
				`;
				webRow.onclick = () => {
					this.openApp("browser", "Search", { url: rawQ });
					this.closeSpotlight();
				};
				resultsScroll.appendChild(webRow);
			}
		};

		searchInput.oninput = () => {
			this.spotlightSelectedIdx = 0;
			this.renderSpotlightResults();
		};

		searchInput.onkeydown = (e) => {
			if (e.key === "Escape") {
				e.preventDefault();
				this.closeSpotlight();
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				const q = (searchInput.value || "").trim().toLowerCase();
				const filtered = APPS.filter(a => !q || a.name.toLowerCase().includes(q) || (a.desc && a.desc.toLowerCase().includes(q)) || a.id.toLowerCase().includes(q));
				if (filtered.length > 0) {
					this.spotlightSelectedIdx = (this.spotlightSelectedIdx + 1) % filtered.length;
					this.renderSpotlightResults();
				}
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				const q = (searchInput.value || "").trim().toLowerCase();
				const filtered = APPS.filter(a => !q || a.name.toLowerCase().includes(q) || (a.desc && a.desc.toLowerCase().includes(q)) || a.id.toLowerCase().includes(q));
				if (filtered.length > 0) {
					this.spotlightSelectedIdx = (this.spotlightSelectedIdx - 1 + filtered.length) % filtered.length;
					this.renderSpotlightResults();
				}
			} else if (e.key === "Enter") {
				e.preventDefault();
				const rawQ = (searchInput.value || "").trim();
				const q = rawQ.toLowerCase();
				const mathVal = this.evaluateMath(rawQ);
				const filtered = APPS.filter(a => !q || a.name.toLowerCase().includes(q) || (a.desc && a.desc.toLowerCase().includes(q)) || a.id.toLowerCase().includes(q));

				if (mathVal !== null && !filtered.some(a => a.name.toLowerCase() === q)) {
					navigator.clipboard.writeText("" + mathVal);
					this.notify("Copied", `Result ${mathVal} copied to clipboard`, "fa-solid fa-check");
					this.closeSpotlight();
				} else if (filtered.length > 0 && (this.spotlightSelectedIdx < filtered.length)) {
					this.openApp(filtered[this.spotlightSelectedIdx].id);
					this.closeSpotlight();
				} else if (rawQ) {
					this.openApp("browser", "Search", { url: rawQ });
					this.closeSpotlight();
				}
			}
		};

		this.openSpotlight = () => {
			this.spotlightOpen = true;
			this.appsMenuOpen = false;
			this.startMenuOpen = false;
			(window.SpadeAudio || window.VeilAudio) && (window.SpadeAudio || window.VeilAudio).playClick();
			spotlightOverlay.style.zIndex = String(Math.max(9999, (this.topZIndex || 100) + 10));
			spotlightOverlay.classList.remove("hidden");
			searchInput.value = "";
			this.spotlightSelectedIdx = 0;
			this.renderSpotlightResults();
			setTimeout(() => {
				searchInput.focus();
			}, 20);
		};

		this.closeSpotlight = () => {
			this.spotlightOpen = false;
			spotlightOverlay.classList.add("hidden");
			searchInput.value = "";
		};

		this.snapWindow = (winId, snapType) => {
			const win = this.windows.find(w => w.id === winId);
			if (!win) return;
			const screenW = window.innerWidth;
			const screenH = window.innerHeight;
			win.isMinimized = false;
			if (snapType === "left") {
				win.isMaximized = false;
				win.x = 0;
				win.y = 0;
				win.w = Math.floor(screenW / 2);
				win.h = screenH;
			} else if (snapType === "right") {
				win.isMaximized = false;
				win.x = Math.floor(screenW / 2);
				win.y = 0;
				win.w = Math.floor(screenW / 2);
				win.h = screenH;
			} else if (snapType === "center") {
				win.isMaximized = false;
				win.w = Math.min(1080, Math.floor(screenW * 0.8));
				win.h = Math.min(720, Math.floor(screenH * 0.85));
				win.x = Math.floor((screenW - win.w) / 2);
				win.y = Math.floor((screenH - win.h) / 2);
			} else if (snapType === "maximize") {
				win.isMaximized = true;
			}
			(window.SpadeAudio || window.VeilAudio) && (window.SpadeAudio || window.VeilAudio).playSnap();
			this.focusWindow(winId);
			this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
			this.windows = [...this.windows];
		};

		this.setWallpaper = (wpUrl) => {
			store.wallpaper = wpUrl || "assets/background.jpg";
			this.notify("Wallpaper Updated", "Desktop appearance refreshed", "fa-solid fa-image");
			this.windows = [...this.windows];
		};

		this.evaluateMath = (expr) => {
			if (!expr || expr.length < 2) return null;
			const clean = expr.trim();
			if (!/^[0-9+\-*/().^ %Math.PIEsincostanqrte]+$/.test(clean)) return null;
			try {
				const jsExpr = clean.replace(/\^/g, "**");
				const res = Function('"use strict"; return (' + jsExpr + ')')();
				if (typeof res === "number" && !isNaN(res) && isFinite(res)) {
					return Math.round(res * 100000000) / 100000000;
				}
			} catch (e) {}
			return null;
		};

		if (typeof navigator !== "undefined" && navigator.getBattery) {
			navigator.getBattery().then(batt => {
				const syncBatt = () => {
					this.batteryLevel = Math.round(batt.level * 100);
					this.isCharging = batt.charging;
					this.windows = [...this.windows];
				};
				syncBatt();
				batt.addEventListener("levelchange", syncBatt);
				batt.addEventListener("chargingchange", syncBatt);
			}).catch(() => {});
		}

		const checkPing = async () => {
			const start = performance.now();
			try {
				await fetch("/favicon.webp?t=" + Date.now(), { method: "HEAD", cache: "no-store" });
				this.pingMs = Math.max(4, Math.round(performance.now() - start));
			} catch (e) {
				this.pingMs = Math.floor(10 + Math.random() * 8);
			}
		};
		checkPing();
		setInterval(checkPing, 20000);

		this.startTour = (force = false) => {
			if (!force) {
				try {
					if (localStorage.getItem("veilos_tour_completed") === "1") return;
				} catch (_) {}
			}
			const existingOverlay = document.getElementById("veilos-tour-overlay");
			if (existingOverlay) existingOverlay.remove();

			const steps = [
				{
					title: "Welcome to VeilOS",
					body: "Your browser-based desktop workspace. Launch apps, browse through Scramjet, and chat with your Onyx Chat account across every app.",
					targetId: null,
					position: "center",
				},
				{
					title: "App Dock & Running Apps",
					body: "Launch Onyx Browser, SSV Movies, Pulse Games, and Onyx Chat from the dock, or check the live clock at the right.",
					targetId: "veil-app-dock",
					position: "top",
				},
				{
					title: "Quick Search & Spotlight (⌘K)",
					body: "Press ⌘K (or Ctrl+K) or click search anytime to jump straight to any app, calculate math, or open a website.",
					targetId: "veil-dock-spotlight",
					position: "top",
				},
				{
					title: "Onyx Chat & Account Sync",
					body: "Your Onyx Chat login syncs across VeilOS automatically. Switch between your account and Guest mode anytime.",
					targetId: "veil-dock-app-chat",
					position: "top",
				},
				{
					title: "VeilOS Menu & Appearance",
					body: "Open the VeilOS menu to toggle Sound Effects, Desktop Widgets, Tab Cloaking, Lock Screen, or replay this tour.",
					targetId: "veil-start-btn",
					position: "right",
				},
				{
					title: "VIP Apps & Settings",
					body: "Redeem a VIP code in Preferences to unlock SSV Movies, Scenario, Sonora, and Cloud Gaming.",
					targetId: "veil-top-widgets",
					position: "bottom",
					actionLabel: "Open Account & VIP Settings",
					action: () => window.openSettingsModal("vip"),
				},
			];

			let stepIdx = 0;
			const overlay = document.createElement("div");
			overlay.id = "veilos-tour-overlay";
			overlay.className = "fixed inset-0 z-[9998] pointer-events-auto";
			overlay.style.zIndex = "9998";

			const backdrop = document.createElement("div");
			backdrop.className = "absolute inset-0 bg-black/60 backdrop-blur-[2px]";
			overlay.appendChild(backdrop);

			const highlightBox = document.createElement("div");
			highlightBox.className = "fixed rounded-2xl border-2 border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45),0_0_32px_rgba(99,102,241,0.55)] pointer-events-none transition-all duration-200";
			overlay.appendChild(highlightBox);

			const card = document.createElement("div");
			card.className = "fixed w-[330px] max-w-[calc(100vw-24px)] bg-[#111118]/98 border border-indigo-400/40 rounded-2xl p-4 shadow-2xl text-white font-sans flex flex-col gap-3";
			overlay.appendChild(card);

			const finishTour = () => {
				try { localStorage.setItem("veilos_tour_completed", "1"); } catch (_) {}
				window.removeEventListener("resize", renderStep);
				window.removeEventListener("keydown", onTourKey);
				overlay.remove();
			};

			const onTourKey = (ev) => {
				if (ev.key === "Escape") {
					ev.preventDefault();
					finishTour();
				}
			};

			const renderStep = () => {
				const step = steps[stepIdx];
				const target = step.targetId ? document.getElementById(step.targetId) : null;
				const rect = target && target.offsetParent !== null ? target.getBoundingClientRect() : null;

				if (rect && rect.width > 0 && rect.height > 0) {
					const pad = 6;
					highlightBox.style.display = "block";
					highlightBox.style.left = `${Math.max(4, rect.left - pad)}px`;
					highlightBox.style.top = `${Math.max(4, rect.top - pad)}px`;
					highlightBox.style.width = `${rect.width + pad * 2}px`;
					highlightBox.style.height = `${rect.height + pad * 2}px`;
					backdrop.style.display = "none";

					const cardW = Math.min(330, window.innerWidth - 24);
					const cardH = 210;
					let left = rect.left + rect.width / 2 - cardW / 2;
					let top = rect.top - cardH - 16;

					if (step.position === "bottom" || top < 12) {
						top = rect.bottom + 14;
					}
					if (step.position === "right") {
						left = rect.right + 16;
						top = rect.bottom - cardH;
					}
					left = Math.max(12, Math.min(window.innerWidth - cardW - 12, left));
					top = Math.max(12, Math.min(window.innerHeight - cardH - 12, top));
					card.style.left = `${left}px`;
					card.style.top = `${top}px`;
					card.style.transform = "none";
				} else {
					highlightBox.style.display = "none";
					backdrop.style.display = "block";
					card.style.left = "50%";
					card.style.top = "50%";
					card.style.transform = "translate(-50%, -50%)";
				}

				const isLast = stepIdx === steps.length - 1;
				card.innerHTML = `
					<div class="flex items-center justify-between">
						<span class="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/35 text-[10px] font-bold uppercase tracking-wider text-indigo-300 font-mono tabular-nums">
							Step ${stepIdx + 1} of ${steps.length}
						</span>
						<button type="button" id="tour-skip-btn" class="text-[11px] text-neutral-400 hover:text-white cursor-pointer">Skip Tour</button>
					</div>
					<div>
						<h3 class="text-sm font-bold text-white tracking-tight">${escapeHtml(step.title)}</h3>
						<p class="text-xs text-neutral-300 leading-relaxed mt-1">${escapeHtml(step.body)}</p>
					</div>
					${step.actionLabel ? `
						<button type="button" id="tour-action-btn" class="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-semibold cursor-pointer transition-colors">
							${escapeHtml(step.actionLabel)}
						</button>
					` : ""}
					<div class="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
						<button type="button" id="tour-back-btn" ${stepIdx === 0 ? "disabled" : ""}
							class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-35 text-xs font-medium text-neutral-300 cursor-pointer">
							Back
						</button>
						<button type="button" id="tour-next-btn"
							class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer">
							${isLast ? "Finish Tour" : "Next"}
						</button>
					</div>
				`;

				const skipBtn = card.querySelector("#tour-skip-btn");
				const backBtn = card.querySelector("#tour-back-btn");
				const nextBtn = card.querySelector("#tour-next-btn");
				const actBtn = card.querySelector("#tour-action-btn");

				if (skipBtn) skipBtn.onclick = finishTour;
				if (backBtn) backBtn.onclick = () => { if (stepIdx > 0) { stepIdx--; renderStep(); } };
				if (nextBtn) nextBtn.onclick = () => {
					if (isLast) finishTour();
					else { stepIdx++; renderStep(); }
				};
				if (actBtn && step.action) {
					actBtn.onclick = () => {
						finishTour();
						step.action();
					};
				}
			};

			document.body.appendChild(overlay);
			window.addEventListener("resize", renderStep);
			window.addEventListener("keydown", onTourKey);
			renderStep();
		};

		this.unlockOS = () => {
			if (this.isUnlocking) return;
			this.isUnlocking = true;
			(window.SpadeAudio || window.VeilAudio) && (window.SpadeAudio || window.VeilAudio).playChime();
			const lockEl = document.getElementById("veil-lock-screen") || document.getElementById("spade-lock-screen");
			const finishUnlock = () => {
				this.isLocked = false;
				this.isUnlocking = false;
				if (lockEl) lockEl.classList.remove("animate-lock-unlock");
				this.windows = [...this.windows];
				setTimeout(() => this.startTour(false), 320);
			};
			if (lockEl) {
				lockEl.classList.add("animate-lock-unlock");
				setTimeout(finishUnlock, 380);
			} else {
				finishUnlock();
			}
		};

		this.syncVipGatedWindows = () => {
			const unlocked = hasVipAccess();
			let changed = false;
			this.windows.forEach((w) => {
				if (!VIP_GATED_APPS.has(w.appId)) return;
				const shouldBeLocked = !unlocked;
				if (Boolean(w.__vipLocked) !== shouldBeLocked) {
					changed = true;
					if (w.customState && typeof w.customState.cleanup === "function") {
						try { w.customState.cleanup(); } catch (_) {}
					}
					w.contentEl = null;
					w.customState = {};
					if (w.domEl) {
						const body = w.domEl.querySelector('[data-win-body="1"]');
						if (body) {
							body.innerHTML = "";
							const nextEl = renderAppContent(w, scramjet, this);
							if (nextEl) body.appendChild(nextEl);
						}
					}
				}
			});
			if (changed) {
				this.windows = [...this.windows];
			}
		};

		if (window.VeilAuth && typeof window.VeilAuth.subscribe === "function") {
			window.VeilAuth.subscribe(() => {
				this.syncVipGatedWindows();
				const lockCard = document.getElementById("veil-lock-auth-slot");
				if (lockCard && typeof lockCard.__refreshLockAuth === "function") {
					lockCard.__refreshLockAuth();
				}
				this.windows = [...this.windows];
			});
		}

		this.windowsContainer = document.createElement("div");
		this.windowsContainer.id = "os-windows-layer";
		this.windowsContainer.className = "absolute inset-0 pointer-events-none";

		this.animationsEnabled = true;
		this.notificationsEnabled = true;
		this.viewMode = "auto";
		this.searchQuery = "";

		this.daySpacedStr = "W E D N E S D A Y";
		this.dockTimeStr = "7:58 PM";
		this.dockDateStr = "Wed, Sep 2";
		this.topZIndex = 100;

		const updateClock = () => {
			const now = new Date();
			const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
			this.daySpacedStr = dayName.split('').join(' ');
			this.dockTimeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
			this.dockDateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
		};
		updateClock();
		setInterval(updateClock, 1000);

		// Global Keydown Listener for commands, Escape key exit, & ⌘K search shortcut
		window.addEventListener("keydown", (e) => {
			if (this.isLocked) {
				const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
				if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || (e.target && e.target.isContentEditable)) {
					return;
				}
				const authSt = getVeilAuthState();
				if ((authSt.mode === "account" || authSt.mode === "guest") && (e.key === "Enter" || e.key === " " || e.key === "Spacebar")) {
					this.unlockOS();
				}
				return;
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				if (this.spotlightOpen) {
					this.closeSpotlight();
				} else {
					this.openSpotlight();
				}
				return;
			}
			if (e.key === "Escape") {
				if (this.spotlightOpen) {
					this.closeSpotlight();
					return;
				}
				if (this.contextMenu.open) {
					this.contextMenu.open = false;
					this.windows = [...this.windows];
					return;
				}
				if (this.appsMenuOpen || this.startMenuOpen) {
					this.appsMenuOpen = false;
					this.startMenuOpen = false;
					this.windows = [...this.windows];
				}
			}
			if (window.sapphire && window.findMatchingCommand && window.triggerCommand) {
				try {
					const match = window.findMatchingCommand(window.sapphire.registry, e);
					if (match) {
						window.triggerCommand(window.sapphire.registry, match.extId, match.name);
					}
				} catch (err) {}
			}
		});

		this.openApp = (appId, customTitle, customState = {}) => {
			const appDef = APPS.find(a => a.id === appId);
			if (!appDef) return;

			if (appId !== "browser") {
				const existing = this.windows.find(w => w.appId === appId);
				if (existing) {
					if (existing.isMinimized) {
						existing.isMinimized = false;
					} else if (this.activeWinId === existing.id) {
						existing.isMinimized = true;
						const remaining = this.windows.filter(w => w.id !== existing.id && !w.isMinimized);
						this.activeWinId = remaining.length ? remaining[remaining.length - 1].id : null;
						this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
						this.windows = [...this.windows];
						return;
					}
					this.focusWindow(existing.id);
					this.appsMenuOpen = false;
					this.startMenuOpen = false;
					this.windows = [...this.windows];
					return;
				}
			}

			const winId = "win_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
			this.topZIndex++;

			const screenW = window.innerWidth;
			const screenH = window.innerHeight;
			const defaultW = Math.min(appDef.defaultW, screenW - 60);
			const defaultH = Math.min(appDef.defaultH, screenH - 120);

			const offsetX = 40 + (this.windows.length % 6) * 30;
			const offsetY = 30 + (this.windows.length % 6) * 30;

			const newWin = {
				id: winId,
				appId: appId,
				title: customTitle || appDef.name,
				iconClass: appDef.iconClass || "fa-solid fa-window-maximize",
				iconColor: appDef.iconColor || "text-neutral-400",
				logoUrl: appDef.logoUrl,
				x: offsetX,
				y: offsetY,
				w: defaultW,
				h: defaultH,
				isMinimized: false,
				isMaximized: false,
				zIndex: this.topZIndex,
				customState: customState
			};

			this.windows.push(newWin);
			this.activeWinId = winId;
			this.appsMenuOpen = false;
			this.startMenuOpen = false;

			const winEl = renderWindowDOM(newWin, scramjet, this);
			if (winEl && this.windowsContainer && !this.windowsContainer.contains(winEl)) {
				this.windowsContainer.appendChild(winEl);
			}
			this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
			this.windows = [...this.windows];
		};

		this.closeWindow = (winId, e) => {
			if (e) {
				e.stopPropagation();
				e.preventDefault();
			}
			const win = this.windows.find(w => w.id === winId);
			if (win) {
				if (win.customState && win.customState.urlPollTimer) {
					clearInterval(win.customState.urlPollTimer);
				}
				if (win.customState && typeof win.customState.__sapphireUnsub === "function") {
					try { win.customState.__sapphireUnsub(); } catch (err) {}
					win.customState.__sapphireUnsub = null;
				}
				if (win.customState && typeof win.customState.hidePopover === "function") {
					try { win.customState.hidePopover(); } catch (err) {}
				}
				if (win.domEl) {
					win.domEl.classList.add("animate-window-close");
					setTimeout(() => {
						try { win.domEl.remove(); } catch (err) {}
						this.windows = this.windows.filter(w => w.id !== winId);
						if (this.activeWinId === winId) {
							const remaining = this.windows.filter(w => !w.isMinimized);
							this.activeWinId = remaining.length ? remaining[remaining.length - 1].id : null;
						}
						this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
						this.windows = [...this.windows];
					}, 200);
					return;
				}
			}
			this.windows = this.windows.filter(w => w.id !== winId);
			if (this.activeWinId === winId) {
				const remaining = this.windows.filter(w => !w.isMinimized);
				this.activeWinId = remaining.length ? remaining[remaining.length - 1].id : null;
			}
			this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
			this.windows = [...this.windows];
		};

		this.minimizeWindow = (winId, e) => {
			if (e) {
				e.stopPropagation();
				e.preventDefault();
			}
			const win = this.windows.find(w => w.id === winId);
			if (win) {
				win.isMinimized = true;
				if (this.activeWinId === winId) {
					const remaining = this.windows.filter(w => w.id !== winId && !w.isMinimized);
					this.activeWinId = remaining.length ? remaining[remaining.length - 1].id : null;
				}
				this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
				this.windows = [...this.windows];
			}
		};

		this.toggleMaximize = (winId, e) => {
			if (e) {
				e.stopPropagation();
				e.preventDefault();
			}
			const win = this.windows.find(w => w.id === winId);
			if (win) {
				win.isMaximized = !win.isMaximized;
				this.focusWindow(winId);
				this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
			}
		};

		this.focusWindow = (winId) => {
			const win = this.windows.find(w => w.id === winId);
			if (win) {
				if (win.isMinimized) win.isMinimized = false;
				if (this.activeWinId !== winId || win.zIndex !== this.topZIndex) {
					this.topZIndex++;
					win.zIndex = this.topZIndex;
					this.activeWinId = winId;
					this.windows.forEach(w => updateWindowStyle(w, this.activeWinId === w.id));
					this.windows = [...this.windows];
				} else {
					updateWindowStyle(win, true);
				}
			}
		};

		this.toggleStartMenu = () => {
			this.startMenuOpen = !this.startMenuOpen;
			this.windows = [...this.windows];
		};

		let draggingWin = null;
		let dragOffsetX = 0;
		let dragOffsetY = 0;

		this.startDrag = (winId, e) => {
			if (e.target.closest('button')) return;
			const win = this.windows.find(w => w.id === winId);
			if (!win) return;
			if (win.isMaximized) {
				win.isMaximized = false;
				win.w = Math.min(980, window.innerWidth - 80);
				win.h = Math.min(640, window.innerHeight - 100);
				win.x = Math.max(0, e.clientX - win.w / 2);
				win.y = Math.max(0, e.clientY - 20);
				updateWindowStyle(win, true);
			}

			this.focusWindow(winId);
			draggingWin = win;
			dragOffsetX = e.clientX - win.x;
			dragOffsetY = e.clientY - win.y;

			const onMouseMove = (moveEv) => {
				if (draggingWin) {
					draggingWin.x = Math.max(0, Math.min(window.innerWidth - 100, moveEv.clientX - dragOffsetX));
					draggingWin.y = Math.max(0, Math.min(window.innerHeight - 80, moveEv.clientY - dragOffsetY));
					if (draggingWin.domEl) {
						draggingWin.domEl.style.left = draggingWin.x + "px";
						draggingWin.domEl.style.top = draggingWin.y + "px";
					}
				}
			};

			const onMouseUp = (upEv) => {
				if (draggingWin) {
					if (upEv.clientY < 10) {
						this.snapWindow(draggingWin.id, 'maximize');
					} else if (upEv.clientX < 10) {
						this.snapWindow(draggingWin.id, 'left');
					} else if (upEv.clientX > window.innerWidth - 15) {
						this.snapWindow(draggingWin.id, 'right');
					} else if (draggingWin.domEl) {
						draggingWin.domEl.style.left = draggingWin.x + "px";
						draggingWin.domEl.style.top = draggingWin.y + "px";
					}
					draggingWin = null;
				}
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
			};

			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
		};

		let resizingWin = null;
		let resizeStartX = 0;
		let resizeStartY = 0;
		let resizeStartW = 0;
		let resizeStartH = 0;

		this.startResize = (winId, e) => {
			e.stopPropagation();
			e.preventDefault();
			const win = this.windows.find(w => w.id === winId);
			if (!win || win.isMaximized) return;

			this.focusWindow(winId);
			resizingWin = win;
			resizeStartX = e.clientX;
			resizeStartY = e.clientY;
			resizeStartW = win.w;
			resizeStartH = win.h;

			const onMouseMove = (moveEv) => {
				if (resizingWin) {
					const newW = Math.max(360, Math.min(window.innerWidth - resizingWin.x, resizeStartW + (moveEv.clientX - resizeStartX)));
					const newH = Math.max(260, Math.min(window.innerHeight - resizingWin.y, resizeStartH + (moveEv.clientY - resizeStartY)));
					resizingWin.w = newW;
					resizingWin.h = newH;
					if (resizingWin.domEl) {
						resizingWin.domEl.style.width = newW + "px";
						resizingWin.domEl.style.height = newH + "px";
					}
				}
			};

			const onMouseUp = () => {
				resizingWin = null;
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
			};

			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
		};

		return html`
			<div class="relative w-screen h-screen overflow-hidden select-none font-sans text-white bg-[#09090b]">
				
				<div class="absolute inset-0 z-0 overflow-hidden"
					on:contextmenu=${(e) => {
						e.preventDefault();
						e.stopPropagation();
						this.contextMenu = {
							open: true,
							x: Math.min(window.innerWidth - 220, e.clientX),
							y: Math.min(window.innerHeight - 340, e.clientY)
						};
						this.windows = [...this.windows];
					}}
					on:click=${() => {
						if (this.contextMenu.open) {
							this.contextMenu.open = false;
							this.windows = [...this.windows];
						}
					}}>
					${use(this.windows, () => {
						const wp = (store && store.wallpaper) || "assets/background.jpg";
						if (wp === "gradient") {
							return html`<div class="w-full h-full bg-gradient-to-br from-slate-900 via-[#09090b] to-black"></div>`;
						}
						return html`
							<img 
								src="${wp}"
								alt="VeilOS Wallpaper"
								onerror="this.src='assets/background.jpg'"
								class="w-full h-full object-cover pointer-events-none select-none" />
						`;
					})}
					<div class="absolute inset-0 bg-[#09090b]/20 pointer-events-none"></div>
				</div>

				<div class="absolute inset-0 bg-gradient-to-b from-[#09090b]/45 via-transparent to-[#09090b]/65 pointer-events-none"></div>

				<div class="absolute top-10 sm:top-12 left-1/2 -translate-x-1/2 z-10 text-center select-none w-full px-4 pointer-events-none">
					<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[0.28em] text-white/95 drop-shadow-[0_12px_28px_rgba(0,0,0,0.65)] uppercase">
						${use(this.daySpacedStr)}
					</h1>
				</div>

				${use(this.desktopWidgetsOpen, (isOpen) => {
					if (!isOpen) return null;
					return html`
						<div id="veil-top-widgets" class="fixed top-4 right-4 z-20 hidden md:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#111118]/85 border border-white/15 backdrop-blur-xl shadow-xl text-neutral-200 font-sans pointer-events-auto">
							<div class="flex items-center gap-1.5 text-xs font-mono tabular-nums" title="Battery: ${this.batteryLevel}% ${this.isCharging ? '(Charging)' : ''}">
								<i class="fa-solid ${this.isCharging ? 'fa-battery-bolt text-emerald-400' : (this.batteryLevel < 20 ? 'fa-battery-quarter text-rose-400' : 'fa-battery-three-quarters text-amber-400')} text-xs"></i>
								<span>${this.batteryLevel}%</span>
							</div>
							<div class="w-px h-3.5 bg-white/15"></div>
							<div class="flex items-center gap-1.5 text-xs font-mono tabular-nums text-sky-400" title="Network Latency: ${this.pingMs}ms">
								<i class="fa-solid fa-signal text-[10px]"></i>
								<span>${this.pingMs}ms</span>
							</div>
							<div class="w-px h-3.5 bg-white/15"></div>
							<button class="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/30 text-[11px] font-semibold text-white flex items-center gap-1 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
								on:click=${() => this.openSpotlight()} title="Quick Search (⌘K)">
								<i class="fa-solid fa-magnifying-glass text-[10px] text-indigo-300"></i>
								<span class="font-mono text-[10px]">⌘K</span>
							</button>
						</div>
					`;
				})}

				<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
					${use(this.windows, () => {
						return this.notifications.map(notif => html`
							<div class="pointer-events-auto p-3.5 rounded-2xl bg-[#111118]/95 border border-indigo-500/30 backdrop-blur-2xl shadow-2xl text-white flex items-center gap-3 animate-toast">
								<div class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-sm shrink-0">
									<i class="${notif.icon || 'fa-solid fa-bell'}"></i>
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-xs font-bold text-white truncate">${notif.title}</div>
									<div class="text-[11px] text-neutral-300 truncate">${notif.message}</div>
								</div>
								<button class="w-5 h-5 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
									on:click=${() => {
										this.notifications = this.notifications.filter(n => n.id !== notif.id);
										this.windows = [...this.windows];
									}}>
									<i class="fa-solid fa-xmark"></i>
								</button>
							</div>
						`);
					})}
				</div>

				${this.windowsContainer}

				<div class="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
					style=${use(this.windows, () => (this.appsMenuOpen || this.startMenuOpen) ? "display: block;" : "display: none;")}
					on:click=${(e) => {
						e.stopPropagation();
						this.appsMenuOpen = false;
						this.startMenuOpen = false;
						this.windows = [...this.windows];
					}}></div>

				<button id="veil-start-btn" class="fixed bottom-4 left-4 z-50 w-11 h-11 rounded-full bg-[#111118]/85 hover:bg-[#181822] border border-white/15 backdrop-blur-2xl text-white flex items-center justify-center text-lg shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
					style=${use(this.windows, () => {
						const active = this.windows.find(w => w.id === this.activeWinId);
						return (active && active.isMaximized && !active.isMinimized) ? "display: none !important;" : "";
					})}
					on:click=${(e) => {
						e.stopPropagation();
						this.startMenuOpen = !this.startMenuOpen;
						if (this.startMenuOpen) {
							this.appsMenuOpen = false;
						}
						this.windows = [...this.windows];
					}} title="Toggle VeilOS Menu">
					<i class="fa-solid fa-bars text-base text-indigo-400"></i>
				</button>

				<div class="fixed bottom-16 left-4 z-50 w-72 max-h-[80vh] bg-[#111118]/95 border border-white/15 rounded-3xl p-4 backdrop-blur-2xl text-white shadow-2xl flex flex-col gap-3 font-sans animate-start-menu overflow-hidden"
					style=${use(this.windows, () => {
						const active = this.windows.find(w => w.id === this.activeWinId);
						if (active && active.isMaximized && !active.isMinimized) return "display: none !important;";
						const disp = this.startMenuOpen ? "display: flex;" : "display: none;";
						return `${disp} font-family: 'Plus Jakarta Sans', system-ui, sans-serif;`;
					})}>

					<div class="flex items-center justify-between px-1 pb-1 border-b border-white/10">
						<div class="flex items-center gap-2">
							<div class="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs text-indigo-400">
								<i class="fa-solid fa-mask"></i>
							</div>
							<span class="text-sm font-bold text-white tracking-wider uppercase">VeilOS Menu</span>
						</div>
						<button class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white text-xs flex items-center justify-center cursor-pointer transition-colors"
							on:click=${(e) => { e.stopPropagation(); this.startMenuOpen = false; this.windows = [...this.windows]; }} title="Close">
							<i class="fa-solid fa-xmark"></i>
						</button>
					</div>

					${use(this.windows, () => html`
						<div class="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/5 border border-white/10">
							<div class="flex items-center gap-2 text-xs font-medium text-neutral-200">
								<i class="fa-solid fa-table-columns text-sky-400 text-xs"></i>
								<span>App Dock</span>
							</div>
							<button class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.dockOpen ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/10 text-neutral-400 hover:text-white border border-transparent'}"
								on:click=${(e) => {
									e.stopPropagation();
									this.dockOpen = !this.dockOpen;
									this.windows = [...this.windows];
								}}>
								<span>${this.dockOpen ? 'Visible' : 'Hidden'}</span>
								<i class="fa-solid ${this.dockOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[9px] opacity-75"></i>
							</button>
						</div>
					`)}

					<div class="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/5 border border-white/10">
						<div class="flex items-center gap-2 text-xs font-medium text-neutral-200">
							<i class="fa-solid ${this.soundEffects ? 'fa-volume-high text-amber-400' : 'fa-volume-xmark text-neutral-400'} text-xs"></i>
							<span>Sound Effects</span>
						</div>
						<button class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.soundEffects ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-white/10 text-neutral-400 hover:text-white border border-transparent'}"
							on:click=${(e) => {
								e.stopPropagation();
								this.soundEffects = !this.soundEffects;
								store.soundEffects = this.soundEffects;
								const audioApi = window.SpadeAudio || window.VeilAudio;
								if (this.soundEffects && audioApi) audioApi.playClick();
								this.windows = [...this.windows];
							}}>
							<span>${this.soundEffects ? 'Active' : 'Muted'}</span>
						</button>
					</div>

					<div class="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/5 border border-white/10">
						<div class="flex items-center gap-2 text-xs font-medium text-neutral-200">
							<i class="fa-solid fa-cubes text-indigo-400 text-xs"></i>
							<span>Desktop Widgets</span>
						</div>
						<button class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.desktopWidgetsOpen ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40' : 'bg-white/10 text-neutral-400 hover:text-white border border-transparent'}"
							on:click=${(e) => {
								e.stopPropagation();
								this.desktopWidgetsOpen = !this.desktopWidgetsOpen;
								store.desktopWidgets = this.desktopWidgetsOpen;
								const audioApi = window.SpadeAudio || window.VeilAudio;
								if (this.soundEffects && audioApi) audioApi.playClick();
								this.windows = [...this.windows];
							}}>
							<span>${this.desktopWidgetsOpen ? 'Visible' : 'Hidden'}</span>
						</button>
					</div>

					${use(this.windows, () => {
						const a = getVeilAuthState();
						const isOwn = Boolean(a.isOwner);
						const isVip = Boolean(isOwn || hasVipAccess());
						return html`
							<button class="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs cursor-pointer transition-colors"
								on:click=${() => {
									this.startMenuOpen = false;
									this.windows = [...this.windows];
									window.openSettingsModal(isOwn ? "owner" : "vip");
								}}>
								<div class="flex items-center gap-2.5 min-w-0">
									<div class="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-400/35 flex items-center justify-center text-indigo-300 shrink-0 overflow-hidden">
										${a.mode === "account" && a.photoURL
											? html`<img src="${a.photoURL}" class="w-full h-full object-cover" />`
											: html`<i class="fa-solid fa-user text-xs"></i>`
										}
									</div>
									<div class="flex flex-col text-left min-w-0">
										<span class="font-semibold text-white text-xs truncate">${a.mode === "account" ? "@" + a.username : (a.mode === "guest" ? "Guest Session" : "Sign In")}</span>
										<span class="text-[10px] ${isOwn ? "text-amber-300" : isVip ? "text-emerald-300" : "text-neutral-400"}">
											${isOwn ? "Owner Mode" : isVip ? "VIP Active" : "Redeem VIP / Account"}
										</span>
									</div>
								</div>
								<i class="fa-solid fa-crown text-xs ${isOwn || isVip ? "text-amber-400" : "text-neutral-500"}"></i>
							</button>
						`;
					})}

					<button class="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-neutral-200 hover:text-white cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
						on:click=${() => {
							this.startMenuOpen = false;
							this.windows = [...this.windows];
							window.openSettingsModal();
						}} title="Cloak & System Settings">
						<div class="flex items-center gap-2.5">
							<div class="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/35 flex items-center justify-center text-indigo-400">
								<i class="fa-solid fa-gear text-xs"></i>
							</div>
							<span class="text-xs font-semibold">VeilOS Preferences & Cloak</span>
						</div>
						<i class="fa-solid fa-chevron-right text-[10px] text-neutral-400"></i>
					</button>

					<button class="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-neutral-200 hover:text-white cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
						on:click=${() => {
							this.startMenuOpen = false;
							this.windows = [...this.windows];
							this.startTour(true);
						}} title="Interactive VeilOS Walkthrough">
						<div class="flex items-center gap-2.5">
							<div class="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/35 flex items-center justify-center text-sky-400">
								<i class="fa-solid fa-compass text-xs"></i>
							</div>
							<span class="text-xs font-semibold">Interactive Tour</span>
						</div>
						<i class="fa-solid fa-chevron-right text-[10px] text-neutral-400"></i>
					</button>

					<button class="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-sky-500/10 to-emerald-500/15 hover:from-indigo-500/25 hover:to-emerald-500/25 border border-indigo-500/30 text-xs text-indigo-100 hover:text-white cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
						on:click=${() => {
							this.startMenuOpen = false;
							this.windows = [...this.windows];
							this.openApp("changelog");
						}} title="View Version History & Project Credits">
						<div class="flex items-center gap-2.5">
							<div class="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/35 flex items-center justify-center text-sky-400">
								<i class="fa-solid fa-scroll text-xs"></i>
							</div>
							<div class="flex flex-col text-left">
								<span class="font-bold text-white text-[11px]">Changelog & Credits</span>
								<span class="text-[9px] text-neutral-400 tabular-nums">${UI_VEIL_VERSION} &bull; 65+ updates & attributions</span>
							</div>
						</div>
						<i class="fa-solid fa-chevron-right text-[10px] text-indigo-400"></i>
					</button>

					<div class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider px-1 pt-1">Cloak Launchers</div>
					<div class="grid grid-cols-2 gap-1.5">
						<button class="py-2 px-2 bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-500/40 rounded-xl text-indigo-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm whitespace-nowrap shrink-0"
							on:click=${() => { if (window.openAboutBlankCloak) window.openAboutBlankCloak(); }}>
							<i class="fa-solid fa-arrow-up-right-from-square"></i>
							<span>About:Blank</span>
						</button>
						<button class="py-2 px-2 bg-sky-950/50 hover:bg-sky-900/70 border border-sky-500/40 rounded-xl text-sky-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm whitespace-nowrap shrink-0"
							on:click=${() => { if (window.openBlobCloak) window.openBlobCloak(); }}>
							<i class="fa-solid fa-cube"></i>
							<span>Blob Cloak</span>
						</button>
					</div>

					<div class="h-px bg-white/10 my-0.5"></div>

					<div class="grid grid-cols-2 gap-1.5">
						<button class="py-2 px-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-neutral-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
							on:click=${() => {
								this.isLocked = true;
								this.startMenuOpen = false;
								this.windows = [...this.windows];
							}}>
							<i class="fa-solid fa-lock text-indigo-400"></i>
							<span>Lock</span>
						</button>
						<button class="py-2 px-2 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/40 rounded-xl text-rose-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
							on:click=${() => location.reload()}>
							<i class="fa-solid fa-rotate-right"></i>
							<span>Restart</span>
						</button>
					</div>
				</div>

				<div id="veil-app-dock" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-2 bg-[#111118]/85 border border-white/15 shadow-2xl rounded-3xl backdrop-blur-2xl text-white max-w-[96vw] overflow-visible transition-all"
					style=${use(this.windows, () => {
						const active = this.windows.find(w => w.id === this.activeWinId);
						if (active && active.isMaximized && !active.isMinimized) return "display: none !important;";
						return this.dockOpen ? "display: flex;" : "display: none;";
					})}>

					<button id="veil-dock-spotlight" class="w-9 h-9 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/35 active:scale-95 transition-all flex items-center justify-center text-indigo-300 hover:text-white cursor-pointer shrink-0 dock-icon-anim"
						on:click=${(e) => {
							e.stopPropagation();
							this.openSpotlight();
						}} title="Quick Search & Commands (⌘K)">
						<i class="fa-solid fa-magnifying-glass text-xs"></i>
					</button>

					<div class="w-px h-6 bg-white/15 shrink-0 mx-0.5"></div>

					<div class="flex items-center gap-2 shrink-0">
						${APPS.filter(app => app.inDock).map(app => {
							const iconCls = `${app.iconClass || 'fa-solid fa-shapes'} text-lg ${app.iconColor || 'text-white'} drop-shadow-md`;
							const isGated = VIP_GATED_APPS.has(app.id);
							return html`
								<div id="veil-dock-app-${app.id}" class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 hover:bg-indigo-500/20 active:scale-95 dock-icon-anim cursor-pointer shadow-md shrink-0 border border-white/15 hover:border-indigo-400/45 transition-all hover:scale-105"
									on:click=${() => this.openApp(app.id)}>
									
									<div class="absolute -top-11 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade">
										<div class="px-2.5 py-1 rounded-xl bg-[#111118]/98 border border-white/15 backdrop-blur-2xl shadow-2xl text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
											<span>${app.name}</span>
											${isGated ? html`<span class="text-[9px] font-bold uppercase text-amber-300">VIP</span>` : null}
										</div>
										<div class="w-2 h-2 bg-[#111118] border-b border-r border-white/15 rotate-45 -mt-1"></div>
									</div>

									${app.logoUrl ? html`
										<img src="${app.logoUrl}" alt="${app.name}" class="w-7 h-7 rounded-xl object-contain drop-shadow-md pointer-events-none select-none" />
									` : html`
										<i class="${iconCls}"></i>
									`}

									${use(this.windows, (winList) => {
										const isOpen = winList.some(w => w.appId === app.id);
										const isActive = winList.some(w => w.appId === app.id && w.id === this.activeWinId);
										if (!isOpen) return null;
										return html`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-white/60'} shadow-sm"></div>`;
									})}
								</div>
							`;
						})}
					</div>

					<div class="w-px h-6 bg-white/15 shrink-0 mx-0.5"></div>

					<div class="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/10 border border-white/10 text-white font-sans select-none shrink-0">
						<div class="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/35 flex items-center justify-center text-indigo-300">
							<i class="fa-regular fa-clock text-xs"></i>
						</div>
						<div class="flex flex-col items-start leading-tight tabular-nums">
							<span class="text-xs sm:text-sm font-bold tracking-tight text-white leading-none">${use(this.dockTimeStr)}</span>
							<span class="text-[10px] text-neutral-300 font-medium leading-tight mt-0.5">${use(this.dockDateStr)}</span>
						</div>
					</div>
				</div>

				${this.spotlightOverlay}

				${use(this.windows, () => {
					if (!this.contextMenu.open) return null;
					return html`
						<div class="fixed z-50 w-52 bg-[#111118]/95 border border-white/15 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl text-white font-sans text-xs flex flex-col gap-0.5 animate-context-menu"
							style="top: ${this.contextMenu.y}px; left: ${this.contextMenu.x}px;"
							on:click=${(e) => e.stopPropagation()}>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openSpotlight(); }}>
								<i class="fa-solid fa-magnifying-glass text-indigo-400 w-4"></i>
								<span>Spotlight (⌘K)</span>
							</button>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("browser"); }}>
								<i class="fa-solid fa-compass text-sky-400 w-4"></i>
								<span>New Browser Window</span>
							</button>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("activity"); }}>
								<i class="fa-solid fa-chart-line text-rose-400 w-4"></i>
								<span>Task Manager</span>
							</button>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("terminal"); }}>
								<i class="fa-solid fa-terminal text-emerald-400 w-4"></i>
								<span>Veil Terminal</span>
							</button>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("files"); }}>
								<i class="fa-solid fa-folder-open text-amber-400 w-4"></i>
								<span>Veil Files</span>
							</button>
							<button class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("ai"); }}>
								<span class="flex items-center gap-2.5"><i class="fa-solid fa-diamond text-purple-400 w-4"></i><span>Scenario</span></span>
								<span class="text-[9px] font-bold uppercase text-amber-300">VIP</span>
							</button>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("chat"); }}>
								<i class="fa-solid fa-message text-emerald-400 w-4"></i>
								<span>Onyx Chat</span>
							</button>
							<button class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("music"); }}>
								<span class="flex items-center gap-2.5"><i class="fa-solid fa-music text-rose-400 w-4"></i><span>Sonora</span></span>
								<span class="text-[9px] font-bold uppercase text-amber-300">VIP</span>
							</button>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-indigo-300 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.openApp("changelog"); }}>
								<i class="fa-solid fa-scroll text-sky-400 w-4"></i>
								<span>Changelog & Credits</span>
							</button>
							<div class="h-px bg-white/10 my-1"></div>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; window.openSettingsModal(); }}>
								<i class="fa-solid fa-gear text-neutral-400 w-4"></i>
								<span>Preferences</span>
							</button>
							<button class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer text-left"
								on:click=${() => { this.contextMenu.open = false; this.isLocked = true; this.windows = [...this.windows]; }}>
								<i class="fa-solid fa-lock text-rose-400 w-4"></i>
								<span>Lock Screen</span>
							</button>
						</div>
					`;
				})}

				<div id="veil-lock-screen" class="fixed inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-between p-6 sm:p-8 text-white font-sans animate-fade select-none overflow-y-auto custom-scrollbar"
					style=${use(this.isLocked, (locked) => locked ? "display: flex;" : "display: none;")}>

					<img src="assets/background.jpg" alt="" class="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none select-none" />
					<div class="absolute inset-0 bg-gradient-to-b from-[#09090b]/80 via-[#0f1018]/75 to-[#09090b]/95 backdrop-blur-sm pointer-events-none"></div>

					<div class="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none animate-orb-1"></div>
					<div class="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none animate-orb-2"></div>
					<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

					<div class="w-full flex-1 flex flex-col items-center justify-center relative z-10 py-2">
						<div class="flex flex-col items-center gap-3 sm:gap-4 max-w-sm w-full animate-card-entrance mb-4 sm:mb-6">
							<div class="text-center">
								<div class="text-5xl sm:text-6xl font-extrabold tracking-[0.12em] text-white uppercase drop-shadow-[0_10px_24px_rgba(0,0,0,0.65)] tabular-nums">
									${use(this.dockTimeStr)}
								</div>
								<div class="text-xs sm:text-sm text-neutral-300 font-medium mt-1 tracking-wide">
									${use(this.dockDateStr)}
								</div>
							</div>

							<div class="w-full bg-[#111118]/90 border border-white/15 p-5 sm:p-6 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col items-center transition-all duration-300 hover:border-indigo-400/40">
								${(() => {
									const slot = document.createElement("div");
									slot.id = "veil-lock-auth-slot";
									slot.className = "w-full";
									mountLockScreenAuthCard(slot, this);
									return slot;
								})()}
							</div>
						</div>

						<div class="w-full max-w-[100vw] overflow-hidden relative lock-quotes-container py-1"
							style="mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);">
							<div class="lock-quotes-track px-4 py-1">
								${[...LOCKSCREEN_QUOTES, ...LOCKSCREEN_QUOTES].map(q => html`
									<div class="bg-[#111118]/85 hover:bg-[#181822]/95 border border-white/10 hover:border-indigo-400/35 transition-all duration-200 rounded-2xl p-4 shadow-2xl flex flex-col justify-start w-[290px] sm:w-[310px] shrink-0 text-left backdrop-blur-md cursor-default select-none group/card">
										<div class="flex items-center gap-2.5 mb-2">
											<div class="w-8 h-8 rounded-xl ${q.avatarBg} flex items-center justify-center text-white shrink-0 shadow-inner group-hover/card:scale-105 transition-transform">
												<i class="${q.icon} text-xs"></i>
											</div>
											<div class="flex items-center gap-1.5 text-xs truncate leading-none min-w-0">
												<span class="font-bold text-white tracking-wide shrink-0">${q.author}</span>
												<span class="text-indigo-400 font-bold shrink-0">•</span>
												<span class="text-neutral-400 font-normal truncate">${q.role}</span>
											</div>
										</div>
										<p class="text-xs sm:text-[13px] text-neutral-200 font-normal leading-relaxed line-clamp-3 select-text">
											${q.quote}
										</p>
									</div>
								`)}
							</div>
						</div>
					</div>

					<div class="w-full flex items-center justify-center gap-6 pb-2 text-xs text-neutral-400 max-w-4xl shrink-0 relative z-10">
						<button class="flex items-center gap-2 hover:text-indigo-400 transition-colors cursor-pointer text-xs group"
							on:click=${() => location.reload()}>
							<i class="fa-solid fa-rotate-right text-xs transition-transform duration-500 group-hover:rotate-180"></i>
							<span>Restart VeilOS</span>
						</button>
					</div>
				</div>

				<${Config}/>

			</div>
		`;
	}

	function updateWindowStyle(win, isFocused) {
		if (!win || !win.domEl) return;
		if (win.isMinimized) {
			win.domEl.style.visibility = "hidden";
			win.domEl.style.opacity = "0";
			win.domEl.style.pointerEvents = "none";
			win.domEl.style.transform = "scale(0.96)";
			return;
		}
		win.domEl.style.visibility = "visible";
		win.domEl.style.opacity = "1";
		win.domEl.style.pointerEvents = "auto";
		win.domEl.style.transform = "none";
		win.domEl.style.display = "flex";

		if (win.isMaximized) {
			win.domEl.style.top = "0px";
			win.domEl.style.left = "0px";
			win.domEl.style.width = "100%";
			win.domEl.style.height = "100%";
			win.domEl.style.borderRadius = "0px";
			win.domEl.style.borderWidth = "0px";
			win.domEl.style.zIndex = "" + (win.zIndex || 100);
		} else {
			win.domEl.style.top = win.y + "px";
			win.domEl.style.left = win.x + "px";
			win.domEl.style.width = win.w + "px";
			win.domEl.style.height = win.h + "px";
			win.domEl.style.borderRadius = "1rem";
			win.domEl.style.borderWidth = "1px";
			win.domEl.style.zIndex = "" + win.zIndex;
		}
		if (isFocused) {
			win.domEl.className = "pointer-events-auto flex flex-col overflow-hidden shadow-2xl border transition-[shadow,border-color,opacity,transform] duration-200 border-white/30 shadow-black/80 bg-neutral-950/95 backdrop-blur-2xl";
		} else {
			win.domEl.className = "pointer-events-auto flex flex-col overflow-hidden shadow-2xl border transition-[shadow,border-color,opacity,transform] duration-200 border-white/10 bg-neutral-950/90 backdrop-blur-xl";
		}
	}

	function renderWindowDOM(win, scramjet, osInstance) {
		if (win.domEl) {
			updateWindowStyle(win, win.id === osInstance.activeWinId);
			if (osInstance && osInstance.windowsContainer && !osInstance.windowsContainer.contains(win.domEl)) {
				osInstance.windowsContainer.appendChild(win.domEl);
			}
			return win.domEl;
		}

		const isFocused = win.id === osInstance.activeWinId;
		const winClass = isFocused
			? 'border-white/30 shadow-black/80 bg-neutral-950/95 backdrop-blur-2xl'
			: 'border-white/10 bg-neutral-950/90 backdrop-blur-xl';
		const styleStr = win.isMaximized 
			? `position: absolute; top:0; left:0; width:100%; height:100%; z-index:${win.zIndex || 100}; display:flex; visibility:${win.isMinimized ? 'hidden' : 'visible'}; opacity:${win.isMinimized ? '0' : '1'}; pointer-events:${win.isMinimized ? 'none' : 'auto'}; border-radius: 0px; border-width: 0px;`
			: `position: absolute; top:${win.y}px; left:${win.x}px; width:${win.w}px; height:${win.h}px; z-index:${win.zIndex}; display:flex; visibility:${win.isMinimized ? 'hidden' : 'visible'}; opacity:${win.isMinimized ? '0' : '1'}; pointer-events:${win.isMinimized ? 'none' : 'auto'}; border-radius: 1rem; border-width: 1px;`;

		const contentEl = renderAppContent(win, scramjet, osInstance);

		const winEl = html`
			<div class="pointer-events-auto flex flex-col overflow-hidden shadow-2xl border transition-[shadow,border-color,opacity,transform] duration-200 ${winClass}"
				style=${styleStr}
				on:mousedown=${(e) => {
					if (!e.target.closest('button')) {
						osInstance.focusWindow(win.id);
					}
				}}>
				
				<div class="h-10 bg-black/60 border-b border-white/10 flex items-center justify-between px-3 cursor-move shrink-0 select-none"
					on:mousedown=${(e) => osInstance.startDrag(win.id, e)}
					on:dblclick=${(e) => osInstance.toggleMaximize(win.id, e)}>
					
					<div class="flex items-center gap-2">
						<button class="w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 transition-colors flex items-center justify-center text-[8px] text-rose-950 font-bold cursor-pointer"
							on:mousedown=${(e) => e.stopPropagation()}
							on:click=${(e) => osInstance.closeWindow(win.id, e)} title="Close">
							<i class="fa-solid fa-xmark"></i>
						</button>
						<button class="w-3.5 h-3.5 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition-colors flex items-center justify-center text-[8px] text-amber-950 font-bold cursor-pointer"
							on:mousedown=${(e) => e.stopPropagation()}
							on:click=${(e) => osInstance.minimizeWindow(win.id, e)} title="Minimize">
							<i class="fa-solid fa-minus"></i>
						</button>
						<div class="relative group py-2 -my-2 flex items-center">
							<button class="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 transition-colors flex items-center justify-center text-[8px] text-emerald-950 font-bold cursor-pointer"
								on:mousedown=${(e) => e.stopPropagation()}
								on:click=${(e) => osInstance.toggleMaximize(win.id, e)} title="Maximize (or hover for snap layouts)">
								<i class="fa-solid fa-up-right-and-down-left-from-center text-[7px]"></i>
							</button>
							<div class="absolute left-0 top-full pt-1.5 hidden group-hover:flex flex-col z-50 min-w-[200px] pointer-events-auto before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-4">
								<div class="p-2 bg-neutral-900/98 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col gap-1.5">
									<div class="flex items-center justify-between px-1">
										<span class="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">Snap Layout</span>
										<span class="text-[9px] text-indigo-400 font-semibold">VeilOS Snap</span>
									</div>
									<div class="grid grid-cols-2 gap-1.5">
										<button class="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-emerald-600/30 hover:border-emerald-500/50 border border-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all cursor-pointer group/btn"
											on:mousedown=${(e) => e.stopPropagation()}
											on:click=${(e) => { e.stopPropagation(); osInstance.snapWindow(win.id, 'maximize'); }}>
											<i class="fa-solid fa-window-maximize text-emerald-400 text-xs group-hover/btn:scale-110 transition-transform"></i>
											<span>Full Screen</span>
										</button>
										<button class="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all cursor-pointer group/btn"
											on:mousedown=${(e) => e.stopPropagation()}
											on:click=${(e) => { e.stopPropagation(); osInstance.snapWindow(win.id, 'center'); }}>
											<i class="fa-solid fa-expand text-indigo-400 text-xs group-hover/btn:scale-110 transition-transform"></i>
											<span>Center</span>
										</button>
										<button class="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-sky-600/30 hover:border-sky-500/50 border border-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all cursor-pointer group/btn"
											on:mousedown=${(e) => e.stopPropagation()}
											on:click=${(e) => { e.stopPropagation(); osInstance.snapWindow(win.id, 'left'); }}>
											<i class="fa-solid fa-table-columns text-sky-400 text-xs group-hover/btn:scale-110 transition-transform"></i>
											<span>Left Half</span>
										</button>
										<button class="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-sky-600/30 hover:border-sky-500/50 border border-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all cursor-pointer group/btn"
											on:mousedown=${(e) => e.stopPropagation()}
											on:click=${(e) => { e.stopPropagation(); osInstance.snapWindow(win.id, 'right'); }}>
											<i class="fa-solid fa-table-columns fa-flip-horizontal text-sky-400 text-xs group-hover/btn:scale-110 transition-transform"></i>
											<span>Right Half</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="flex items-center gap-2 text-xs font-semibold text-neutral-300 truncate max-w-[280px]">
						${win.logoUrl ? html`<img src="${win.logoUrl}" class="w-3.5 h-3.5 object-contain rounded shrink-0 pointer-events-none" />` : html`<i class="${win.iconClass || 'fa-solid fa-window-maximize'} ${win.iconColor || 'text-neutral-400'} text-xs"></i>`}
						<span>${win.title}</span>
					</div>

					<div class="w-12"></div>
				</div>

				<div data-win-body="1" class="flex-1 w-full h-full relative overflow-hidden bg-neutral-950">
					${contentEl}
				</div>

				<div class="resize-grip"
					on:mousedown=${(e) => osInstance.startResize(win.id, e)}
					title="Drag to resize window"></div>
			</div>
		`;

		win.domEl = winEl;
		if (osInstance && osInstance.windowsContainer && !osInstance.windowsContainer.contains(winEl)) {
			osInstance.windowsContainer.appendChild(winEl);
		}
		return winEl;
	}

	function renderAppContent(win, scramjet, osInstance) {
		const appId = win.appId;
		const isGated = VIP_GATED_APPS.has(appId);
		const unlocked = !isGated || hasVipAccess();
		if (win.contentEl && Boolean(win.__vipLocked) === !unlocked) {
			return win.contentEl;
		}
		if (isGated && !unlocked) {
			win.__vipLocked = true;
			const gateEl = renderVipGateView(appId, win, osInstance);
			win.contentEl = gateEl;
			return gateEl;
		}
		win.__vipLocked = false;
		let el;
		if (appId === "browser") {
			el = renderBrowserApp(win, scramjet, osInstance);
		} else if (appId === "ai") {
			el = renderOnyxAIApp(win, scramjet, osInstance);
		} else if (appId === "activity") {
			el = window.renderActivityApp ? window.renderActivityApp(win, scramjet, osInstance) : html`<div>Loading Task Manager...</div>`;
		} else if (appId === "terminal") {
			el = window.renderTerminalApp ? window.renderTerminalApp(win, scramjet, osInstance) : html`<div>Loading Terminal...</div>`;
		} else if (appId === "files") {
			el = window.renderFilesApp ? window.renderFilesApp(win, scramjet, osInstance) : html`<div>Loading Files...</div>`;
		} else if (appId === "vault") {
			el = html`<iframe src="/vault.html" class="w-full h-full border-0 outline-none bg-[#09090b]" allow="fullscreen; autoplay; encrypted-media; picture-in-picture"></iframe>`;
		} else if (appId === "movies") {
			el = html`<iframe src="/movies.html" class="w-full h-full border-0 outline-none bg-[#09090b]" allow="fullscreen; autoplay; encrypted-media; picture-in-picture"></iframe>`;
		} else if (appId === "games") {
			el = html`<iframe src="/games.html" class="w-full h-full border-0 outline-none bg-[#09090b]"></iframe>`;
		} else if (appId === "chat") {
			el = html`<iframe src="/chat.html" class="w-full h-full border-0 outline-none bg-[#09090b]"></iframe>`;
		} else if (appId === "cloudgaming") {
			el = renderCloudGamingApp(win, scramjet, osInstance);
		} else if (appId === "music") {
			el = renderMusicApp(win, scramjet, osInstance);
		} else if (appId === "changelog") {
			el = window.renderChangelogApp ? window.renderChangelogApp(win, scramjet, osInstance) : html`<div>Loading Changelog...</div>`;
		} else {
			el = html`<div class="p-6 text-center text-neutral-400">Application loading...</div>`;
		}
		win.contentEl = el;
		return el;
	}

	function renderMusicApp(win, scramjet, osInstance) {
		const SONORA_TARGET_URL = "https://cherrion.top/music";
		const getProxiedSonoraUrl = () => {
			try {
				if (scramjet && typeof scramjet.encodeUrl === "function") {
					return scramjet.encodeUrl(SONORA_TARGET_URL);
				}
			} catch (e) {}
			return "/scramjet/" + encodeURIComponent(SONORA_TARGET_URL);
		};

		if (!win.customState) {
			win.customState = {};
		}

		if (!win.customState.frameObj && !win.customState.iframe) {
			const frameObj = (scramjet && typeof scramjet.createFrame === "function")
				? scramjet.createFrame()
				: null;
			const iframe = frameObj ? frameObj.frame : document.createElement("iframe");
			iframe.className = "w-full h-full border-0 outline-none bg-[#09090b] block";
			iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; microphone";

			const navigateSonora = () => {
				if (frameObj && typeof frameObj.go === "function") {
					frameObj.go(SONORA_TARGET_URL);
				} else {
					iframe.src = getProxiedSonoraUrl();
				}
			};

			if ("serviceWorker" in navigator && !navigator.serviceWorker.controller) {
				Promise.race([
					navigator.serviceWorker.ready,
					new Promise((resolve) => setTimeout(resolve, 3000))
				]).then(() => {
					navigateSonora();
				}).catch(() => {
					navigateSonora();
				});
			} else {
				navigateSonora();
			}

			win.customState.frameObj = frameObj;
			win.customState.iframe = iframe;
			win.customState.navigateSonora = navigateSonora;
		}

		const frameObj = win.customState.frameObj;
		const iframe = win.customState.iframe;
		const navigateSonora = win.customState.navigateSonora || (() => {
			if (frameObj && typeof frameObj.go === "function") {
				frameObj.go(SONORA_TARGET_URL);
			} else {
				iframe.src = getProxiedSonoraUrl();
			}
		});

		return html`
			<div class="w-full h-full relative bg-[#09090b] overflow-hidden select-text flex flex-col">
				<div class="h-8 bg-neutral-900/90 border-b border-white/10 px-3 flex items-center justify-between text-xs text-neutral-300 shrink-0">
					<div class="flex items-center gap-2">
						<button class="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors text-neutral-400 hover:text-white"
							on:click=${() => { try { if (frameObj && typeof frameObj.back === "function") frameObj.back(); else iframe.contentWindow.history.back(); } catch(e){} }} title="Back">
							<i class="fa-solid fa-arrow-left text-[10px]"></i>
						</button>
						<button class="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors text-neutral-400 hover:text-white"
							on:click=${() => { try { if (frameObj && typeof frameObj.forward === "function") frameObj.forward(); else iframe.contentWindow.history.forward(); } catch(e){} }} title="Forward">
							<i class="fa-solid fa-arrow-right text-[10px]"></i>
						</button>
						<button class="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors text-neutral-400 hover:text-white"
							on:click=${() => { navigateSonora(); }} title="Reload Home">
							<i class="fa-solid fa-rotate-right text-[10px]"></i>
						</button>
						<span class="text-[11px] text-neutral-300 font-semibold ml-1 flex items-center gap-1.5">
							<i class="fa-solid fa-music text-rose-400 text-[10px]"></i>
							<span>Sonora</span>
						</span>
					</div>
					<div class="flex items-center gap-2">
						<button class="text-[10px] text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
							on:click=${() => {
								osInstance.openApp("browser", "Sonora", { url: SONORA_TARGET_URL });
							}} title="Open in Onyx Browser">
							<i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
							<span>Open in Browser</span>
						</button>
					</div>
				</div>
				<div class="flex-1 w-full h-full relative overflow-hidden">
					${iframe}
				</div>
			</div>
		`;
	}

	function renderOnyxAIApp(win, scramjet, osInstance) {
		const SCENARIO_TARGET_URL = "https://scenario-wheat.vercel.app/";
		const getProxiedScenarioUrl = () => {
			try {
				if (scramjet && typeof scramjet.encodeUrl === "function") {
					return scramjet.encodeUrl(SCENARIO_TARGET_URL);
				}
			} catch (e) {}
			return "/scramjet/" + encodeURIComponent(SCENARIO_TARGET_URL);
		};

		if (!win.customState) {
			win.customState = {};
		}

		if (!win.customState.frameObj && !win.customState.iframe) {
			const frameObj = (scramjet && typeof scramjet.createFrame === "function")
				? scramjet.createFrame()
				: null;
			const iframe = frameObj ? frameObj.frame : document.createElement("iframe");
			iframe.className = "w-full h-full border-0 outline-none bg-[#09090d] block";
			iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; microphone; camera";

			const navigateScenario = () => {
				if (frameObj && typeof frameObj.go === "function") {
					frameObj.go(SCENARIO_TARGET_URL);
				} else {
					iframe.src = getProxiedScenarioUrl();
				}
			};

			if ("serviceWorker" in navigator && !navigator.serviceWorker.controller) {
				Promise.race([
					navigator.serviceWorker.ready,
					new Promise((resolve) => setTimeout(resolve, 3000))
				]).then(() => {
					navigateScenario();
				}).catch(() => {
					navigateScenario();
				});
			} else {
				navigateScenario();
			}

			win.customState.frameObj = frameObj;
			win.customState.iframe = iframe;
			win.customState.navigateScenario = navigateScenario;
		}

		const frameObj = win.customState.frameObj;
		const iframe = win.customState.iframe;
		const navigateScenario = win.customState.navigateScenario || (() => {
			if (frameObj && typeof frameObj.go === "function") {
				frameObj.go(SCENARIO_TARGET_URL);
			} else {
				iframe.src = getProxiedScenarioUrl();
			}
		});

		return html`
			<div class="w-full h-full relative bg-[#09090d] overflow-hidden select-text flex flex-col">
				<div class="h-8 bg-neutral-900/90 border-b border-white/10 px-3 flex items-center justify-between text-xs text-neutral-300 shrink-0">
					<div class="flex items-center gap-2">
						<button class="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors text-neutral-400 hover:text-white"
							on:click=${() => { try { if (frameObj && typeof frameObj.back === "function") frameObj.back(); else iframe.contentWindow.history.back(); } catch(e){} }} title="Back">
							<i class="fa-solid fa-arrow-left text-[10px]"></i>
						</button>
						<button class="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors text-neutral-400 hover:text-white"
							on:click=${() => { try { if (frameObj && typeof frameObj.forward === "function") frameObj.forward(); else iframe.contentWindow.history.forward(); } catch(e){} }} title="Forward">
							<i class="fa-solid fa-arrow-right text-[10px]"></i>
						</button>
						<button class="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors text-neutral-400 hover:text-white"
							on:click=${() => { navigateScenario(); }} title="Reload Home">
							<i class="fa-solid fa-rotate-right text-[10px]"></i>
						</button>
						<span class="text-[11px] text-neutral-300 font-semibold ml-1 flex items-center gap-1.5">
							<i class="fa-solid fa-diamond text-purple-400 text-[10px]"></i>
							<span>Scenario</span>
						</span>
					</div>
					<div class="flex items-center gap-2">
						<button class="text-[10px] text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
							on:click=${() => {
								osInstance.openApp("browser", "Scenario", { url: SCENARIO_TARGET_URL });
							}} title="Open in Onyx Browser">
							<i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
							<span>Open in Browser</span>
						</button>
					</div>
				</div>
				<div class="flex-1 w-full h-full relative overflow-hidden">
					${iframe}
				</div>
			</div>
		`;
	}

	function renderCloudGamingApp(win, scramjet, osInstance) {
		if (!win.customState) {
			win.customState = {};
		}

		if (!win.customState.frameObj) {
			const frameObj = scramjet.createFrame();
			frameObj.frame.className = "w-full h-full border-0 outline-none bg-black block";
			frameObj.go("https://nowgg.fun");
			win.customState.frameObj = frameObj;
		}

		const frameObj = win.customState.frameObj;

		return html`
			<div class="w-full h-full relative bg-black overflow-hidden select-text">
				${frameObj.frame}
			</div>
		`;
	}

	function renderBrowserApp(win, scramjet, osInstance) {
		if (!win.customState) {
			win.customState = {};
		}
		if (win.customState.rootEl) {
			return win.customState.rootEl;
		}

		if (!win.customState.windowNumericId) {
			win.customState.windowNumericId = globalNextWindowNumericId++;
		}

		const normalizeBrowserUrl = (rawUrl) => {
			if (!rawUrl || typeof rawUrl !== "string") return rawUrl || "";
			let str = rawUrl.trim();
			if (!str || str === "about:blank" || str.startsWith("blob:") || str.startsWith("data:")) {
				return str;
			}
			let depth = 0;
			while (depth < 5) {
				const qIndex = str.indexOf("?");
				const scramjetIdx = str.indexOf("/scramjet/");
				if (scramjetIdx === -1 || (qIndex !== -1 && scramjetIdx > qIndex)) {
					break;
				}
				depth++;
				const after = str.slice(scramjetIdx + "/scramjet/".length);
				if (!after) break;
				let decoded = null;
				try {
					decoded = decodeURIComponent(after);
				} catch (e1) {
					try {
						decoded = decodeURI(after);
					} catch (e2) {
						try {
							decoded = unescape(after);
						} catch (e3) {
							try {
								decoded = decodeURIComponent(after.replace(/%(?![0-9a-fA-F]{2})/g, "%25"));
							} catch (e4) {
								decoded = after;
							}
						}
					}
				}
				if (!decoded) break;
				str = decoded;
			}
			if (window.sapphire && typeof window.sapphire.displayUrl === "function") {
				str = window.sapphire.displayUrl(str);
			}
			return str;
		};

		const formatUrl = (targetUrl) => {
			if (!targetUrl) return "https://google.com";
			let clean = ("" + targetUrl).trim();
			clean = normalizeBrowserUrl(clean);
			const lower = clean.toLowerCase();

			if (lower === "onyx://chat" || lower === "spade://chat" || lower === "veil://chat" || lower === "chrome://chat" || lower === "about:chat" || lower === "onyx:chat" || lower === "spade:chat" || lower === "veil:chat" || lower === "chrome:chat") {
				return "onyx://chat";
			}
			if (lower === "onyx://bookmarks" || lower === "spade://bookmarks" || lower === "veil://bookmarks" || lower === "chrome://bookmarks" || lower === "about:bookmarks" || lower === "onyx:bookmarks" || lower === "spade:bookmarks" || lower === "veil:bookmarks" || lower === "chrome:bookmarks") {
				return "onyx://bookmarks";
			}
			if (lower === "onyx://history" || lower === "spade://history" || lower === "veil://history" || lower === "chrome://history" || lower === "about:history" || lower === "onyx:history" || lower === "spade:history" || lower === "veil:history" || lower === "chrome:history") {
				return "onyx://history";
			}
			if (lower === "onyx://extensions" || lower === "spade://extensions" || lower === "veil://extensions" || lower === "chrome://extensions" || lower === "about:extensions" || lower === "onyx:extensions" || lower === "spade:extensions" || lower === "veil:extensions" || lower === "chrome:extensions") {
				return "onyx://extensions";
			}
			if (lower === "onyx://settings" || lower === "spade://settings" || lower === "veil://settings" || lower === "chrome://settings" || lower === "about:settings" || lower === "onyx:settings" || lower === "spade:settings" || lower === "veil:settings" || lower === "chrome:settings") {
				return "onyx://settings";
			}
			if (lower === "onyx://newtab" || lower === "spade://newtab" || lower === "veil://newtab" || lower === "chrome://newtab" || lower === "about:newtab" || lower === "onyx:newtab" || lower === "spade:newtab" || lower === "veil:newtab" || lower === "chrome:newtab") {
				return "onyx://newtab";
			}

			if (clean.startsWith("onyx://") || clean.startsWith("spade://") || clean.startsWith("veil://")) {
				return clean.replace(/^(veil|spade):\/\//i, "onyx://");
			}
			if (clean.startsWith("chrome-extension://") || clean.startsWith("moz-extension://")) {
				return clean;
			}
			if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("about:") || clean.startsWith("data:") || clean.startsWith("blob:")) {
				return clean;
			}
			if (clean.startsWith("/~/sx/")) {
				return window.location.origin + clean;
			}
			if (!clean.includes(".") || clean.includes(" ")) {
				const engine = (store.searchEngine || "google").toLowerCase();
				if (engine === "duckduckgo") {
					return "https://duckduckgo.com/?q=" + encodeURIComponent(clean);
				} else if (engine === "bing") {
					return "https://www.bing.com/search?q=" + encodeURIComponent(clean);
				} else if (engine === "brave") {
					return "https://search.brave.com/search?q=" + encodeURIComponent(clean);
				}
				return "https://www.google.com/search?q=" + encodeURIComponent(clean);
			}
			return "https://" + clean;
		};

		const getTitleFromUrl = (urlStr) => {
			if (!urlStr) return "New Tab";
			const clean = normalizeBrowserUrl(urlStr);
			if (clean === "spade://chat" || clean === "veil://chat" || clean === "onyx://chat") return "Onyx Chat";
			if (clean === "spade://bookmarks" || clean === "veil://bookmarks" || clean === "onyx://bookmarks") return "Bookmarks";
			if (clean === "spade://history" || clean === "veil://history" || clean === "onyx://history") return "History";
			if (clean === "spade://extensions" || clean === "veil://extensions" || clean === "onyx://extensions") return "Extensions";
			if (clean === "spade://settings" || clean === "veil://settings" || clean === "onyx://settings") return "Settings";
			if (clean === "spade://newtab" || clean === "veil://newtab" || clean === "onyx://newtab") return "New Tab";
			if (clean.startsWith("spade://") || clean.startsWith("veil://") || clean.startsWith("onyx://")) {
				const prefix = clean.startsWith("spade://") ? "spade://" : (clean.startsWith("veil://") ? "veil://" : "onyx://");
				const part = clean.slice(prefix.length).replace(/\/$/, "");
				return part.charAt(0).toUpperCase() + part.slice(1);
			}
			try {
				const u = new URL(clean);
				let host = u.hostname.replace(/^www\./, "");
				return host.charAt(0).toUpperCase() + host.slice(1);
			} catch (e) {
				return clean || "New Tab";
			}
		};

		const getIconFromUrl = (urlStr) => {
			if (!urlStr) return '<i class="fa-solid fa-globe"></i>';
			if (urlStr.includes("bookmarks")) return '<i class="fa-solid fa-bookmark text-amber-400"></i>';
			if (urlStr.includes("history")) return '<i class="fa-solid fa-clock-rotate-left text-purple-400"></i>';
			if (urlStr.includes("extensions")) return '<i class="fa-solid fa-puzzle-piece text-emerald-400"></i>';
			if (urlStr.includes("settings")) return '<i class="fa-solid fa-gear text-sky-400"></i>';
			if (urlStr.includes("changelog")) return '<i class="fa-solid fa-scroll text-emerald-400"></i>';
			if (urlStr.includes("/~/sx/") || urlStr.startsWith("chrome-extension://")) return '<i class="fa-solid fa-puzzle-piece text-emerald-400"></i>';
			return '<i class="fa-solid fa-globe"></i>';
		};

		const isBookmarked = (url) => {
			if (!url) return false;
			const clean = normalizeBrowserUrl(url);
			const list = Array.isArray(store.bookmarks) ? store.bookmarks : [];
			return list.some(b => normalizeBrowserUrl(b.url) === clean);
		};

		const addHistory = (title, url) => {
			if (!url || url.startsWith("data:") || url === "about:blank" || url.startsWith("blob:")) return;
			const cleanUrl = normalizeBrowserUrl(url);
			const list = Array.isArray(store.history) ? [...store.history] : [];
			if (list.length > 0 && normalizeBrowserUrl(list[0].url) === cleanUrl) return;
			const entry = {
				id: "hist_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
				name: title || getTitleFromUrl(cleanUrl),
				url: cleanUrl,
				visitedAt: Date.now()
			};
			store.history = [entry, ...list].slice(0, 100);
		};

		const browserRoot = document.createElement("div");
		browserRoot.className = "flex flex-col w-full h-full bg-neutral-950 text-white font-sans overflow-hidden select-text";

		if (!win.customState.viewportEl) {
			const vp = document.createElement("div");
			vp.className = "flex-1 w-full h-full relative bg-white overflow-hidden";
			win.customState.viewportEl = vp;
		}

		if (!win.customState.tabs) {
			win.customState.tabs = [];
		}

		if (win.customState.activePanel === undefined) {
			win.customState.activePanel = "none";
		}
		if (win.customState.showQuickBookmarks === undefined) {
			win.customState.showQuickBookmarks = (store.showBookmarksBar !== undefined) ? store.showBookmarksBar : true;
		}

		const tabStrip = document.createElement("div");
		tabStrip.className = "flex items-center justify-between bg-[#111118] border-b border-white/10 px-2 pt-1.5 gap-2 shrink-0 overflow-x-auto custom-scrollbar";

		const tabsListContainer = document.createElement("div");
		tabsListContainer.className = "flex items-center gap-1 overflow-x-auto min-w-0";

		const panelToggles = document.createElement("div");
		panelToggles.className = "flex items-center gap-1 shrink-0 pb-1";

		const extensionsToggleBtn = document.createElement("button");
		extensionsToggleBtn.title = "Extensions (onyx://extensions)";
		extensionsToggleBtn.className = "w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center cursor-pointer bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white";
		extensionsToggleBtn.innerHTML = '<i class="fa-solid fa-puzzle-piece text-emerald-400"></i>';

		const historyToggleBtn = document.createElement("button");
		historyToggleBtn.title = "History (onyx://history)";
		historyToggleBtn.className = "w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center cursor-pointer bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white";
		historyToggleBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left text-purple-400"></i>';

		panelToggles.appendChild(extensionsToggleBtn);
		panelToggles.appendChild(historyToggleBtn);
		tabStrip.appendChild(tabsListContainer);
		tabStrip.appendChild(panelToggles);

		const urlBar = document.createElement("div");
		urlBar.className = "flex items-center p-2 gap-2 bg-[#111118] border-b border-white/10 shrink-0 relative";

		const backBtn = document.createElement("button");
		backBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer";
		backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
		backBtn.title = "Back";

		const fwdBtn = document.createElement("button");
		fwdBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer";
		fwdBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
		fwdBtn.title = "Forward";

		const reloadBtn = document.createElement("button");
		reloadBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer";
		reloadBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
		reloadBtn.title = "Reload";

		const homeBtn = document.createElement("button");
		homeBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors";
		homeBtn.innerHTML = '<i class="fa-solid fa-house text-xs"></i>';
		homeBtn.title = "Home (New Tab)";

		const urlInputBox = document.createElement("div");
		urlInputBox.className = "flex-1 flex items-center bg-black/60 border border-white/10 focus-within:border-indigo-400 rounded-xl px-3 py-1 gap-2";

		const lockSpan = document.createElement("span");
		lockSpan.className = "text-xs text-emerald-400 flex items-center";
		lockSpan.innerHTML = '<i class="fa-solid fa-lock text-emerald-400 text-xs"></i>';

		const urlInput = document.createElement("input");
		urlInput.className = "flex-1 bg-transparent text-xs text-white font-mono outline-none placeholder-neutral-500";
		urlInput.placeholder = "Search with " + ((store.searchEngine || "Google").charAt(0).toUpperCase() + (store.searchEngine || "Google").slice(1)) + " or enter web address...";

		const starBtn = document.createElement("button");
		starBtn.className = "text-xs hover:scale-125 transition-transform cursor-pointer flex items-center";
		starBtn.innerHTML = '<i class="fa-regular fa-star text-neutral-400"></i>';

		urlInputBox.appendChild(lockSpan);
		urlInputBox.appendChild(urlInput);
		urlInputBox.appendChild(starBtn);

		const goBtn = document.createElement("button");
		goBtn.className = "px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center";
		goBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
		goBtn.title = "Go to URL";

		const extToolbar = document.createElement("div");
		extToolbar.className = "flex items-center gap-1 shrink-0";

		const floatingPopover = document.createElement("div");
		floatingPopover.className = "hidden absolute top-2 right-2 z-50 w-[380px] h-[520px] max-w-[92%] max-h-[92%] bg-[#111118] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col";

		const unmountActivePopup = () => {
			const prevIframe = floatingPopover.querySelector("iframe[data-sapphire-popup='1']");
			if (prevIframe && window.sapphire && typeof window.sapphire.unmountExtensionPopup === "function") {
				try { window.sapphire.unmountExtensionPopup(prevIframe); } catch (_) {}
			}
			floatingPopover.innerHTML = "";
		};

		const hideExtensionPopover = () => {
			unmountActivePopup();
			floatingPopover.classList.add("hidden");
			win.customState.activePopup = null;
			win.customState.activePopupExtId = null;
		};

		const showExtensionPopover = async (extId, fallbackPopupUrl) => {
			if (!extId) return;
			const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
			if (!sEngine) return;

			if (win.customState.activePopupExtId === extId && !floatingPopover.classList.contains("hidden")) {
				hideExtensionPopover();
				return;
			}

			unmountActivePopup();
			const activeTab = getActiveTab();
			const tabId = activeTab ? activeTab.numericId : null;
			const exts = typeof sEngine.getInstalledExtensions === "function" ? sEngine.getInstalledExtensions(tabId) : [];
			const extInfo = exts.find((x) => x.id === extId);

			const popHeader = document.createElement("div");
			popHeader.className = "flex items-center justify-between px-3 py-2 bg-[#161622] border-b border-white/10 shrink-0";
			const titleRow = document.createElement("div");
			titleRow.className = "flex items-center gap-2 min-w-0";
			titleRow.innerHTML = `
				${extInfo?.iconUrl ? `<img src="${extInfo.iconUrl}" class="w-4 h-4 rounded object-contain shrink-0" />` : '<span class="text-xs">🧩</span>'}
				<span class="text-xs font-bold text-white truncate">${escapeHtml(extInfo?.name || "Extension Popup")}</span>
			`;
			const popActions = document.createElement("div");
			popActions.className = "flex items-center gap-1 shrink-0";

			const closePopBtn = document.createElement("button");
			closePopBtn.className = "w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white text-xs flex items-center justify-center cursor-pointer";
			closePopBtn.textContent = "✕";
			closePopBtn.title = "Close Popup";
			closePopBtn.onclick = () => hideExtensionPopover();
			popActions.appendChild(closePopBtn);

			popHeader.appendChild(titleRow);
			popHeader.appendChild(popActions);

			const popupFrame = document.createElement("iframe");
			popupFrame.dataset.sapphirePopup = "1";
			popupFrame.className = "flex-1 w-full h-full border-0 bg-white";

			floatingPopover.appendChild(popHeader);
			floatingPopover.appendChild(popupFrame);
			floatingPopover.classList.remove("hidden");
			win.customState.activePopup = popupFrame;
			win.customState.activePopupExtId = extId;

			let mounted = false;
			try {
				if (typeof sEngine.mountExtensionPopup === "function") {
					mounted = await sEngine.mountExtensionPopup(popupFrame, extId, tabId);
				}
			} catch (mountErr) {
				console.warn("[ExtensionPopup] mountExtensionPopup failed:", mountErr);
			}

			if (!mounted) {
				hideExtensionPopover();
				const pageUrl = fallbackPopupUrl || extInfo?.popupUrl;
				if (pageUrl) {
					createNewTab(pageUrl);
				}
			}
		};

		const renderToolbarExtensions = () => {
			extToolbar.innerHTML = "";
			const sEngine = window.sapphire;
			if (!sEngine) {
				if (window.ensureSapphire && !win.customState.__waitingSapphireToolbar) {
					win.customState.__waitingSapphireToolbar = true;
					window.ensureSapphire()
						.then(() => {
							win.customState.__waitingSapphireToolbar = false;
							renderToolbarExtensions();
						})
						.catch(() => {
							win.customState.__waitingSapphireToolbar = false;
						});
				}
				return;
			}
			const activeTab = getActiveTab();
			const tabId = activeTab ? activeTab.numericId : null;
			const exts = (typeof sEngine.getInstalledExtensions === "function" ? sEngine.getInstalledExtensions(tabId) : [])
				.filter((ext) => ext.enabled);

			exts.forEach((ext) => {
				const btn = document.createElement("button");
				btn.className = "relative w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs transition-all cursor-pointer shrink-0";
				btn.title = ext.title || ext.name || "Extension";
				if (ext.iconUrl) {
					const img = document.createElement("img");
					img.src = ext.iconUrl;
					img.alt = ext.name || "Extension";
					img.className = "w-4 h-4 rounded object-contain pointer-events-none";
					btn.appendChild(img);
				} else {
					btn.innerHTML = '<i class="fa-solid fa-puzzle-piece text-emerald-400 text-[11px]"></i>';
				}
				if (ext.badgeText) {
					const badge = document.createElement("span");
					badge.className = "absolute -bottom-0.5 -right-0.5 px-1 rounded text-[8px] font-bold leading-tight text-white bg-indigo-600 pointer-events-none";
					badge.textContent = ext.badgeText;
					if (ext.badgeColor) badge.style.backgroundColor = ext.badgeColor;
					if (ext.badgeTextColor) badge.style.color = ext.badgeTextColor;
					btn.appendChild(badge);
				}
				btn.onclick = () => {
					const curTab = getActiveTab();
					const curTabId = curTab ? curTab.numericId : null;
					if (typeof sEngine.clickAction === "function") {
						sEngine.clickAction(ext.id, curTabId);
					} else if (ext.hasPopup) {
						showExtensionPopover(ext.id, ext.popupUrl);
					}
				};
				extToolbar.appendChild(btn);
			});
		};

		win.customState.renderExtensionPopup = showExtensionPopover;
		win.customState.showExtensionPopover = showExtensionPopover;
		win.customState.renderToolbarExtensions = renderToolbarExtensions;

		urlBar.appendChild(backBtn);
		urlBar.appendChild(fwdBtn);
		urlBar.appendChild(reloadBtn);
		urlBar.appendChild(homeBtn);
		urlBar.appendChild(urlInputBox);
		urlBar.appendChild(goBtn);
		urlBar.appendChild(extToolbar);

		const quickBmBar = document.createElement("div");
		quickBmBar.className = "flex items-center gap-1.5 px-3 py-1.5 bg-[#09090b] border-b border-white/10 overflow-x-auto text-xs shrink-0 custom-scrollbar";

		const mainContent = document.createElement("div");
		mainContent.className = "flex-1 w-full h-full relative flex overflow-hidden";

		const drawerContainer = document.createElement("div");
		drawerContainer.className = "h-full flex shrink-0";

		mainContent.appendChild(win.customState.viewportEl);
		mainContent.appendChild(drawerContainer);
		mainContent.appendChild(floatingPopover);

		browserRoot.appendChild(tabStrip);
		browserRoot.appendChild(urlBar);
		browserRoot.appendChild(quickBmBar);
		browserRoot.appendChild(mainContent);

		const getActiveTab = () => {
			return win.customState.tabs.find(t => t.id === win.customState.activeTabId) || win.customState.tabs[0];
		};

		const syncActiveTabUrl = (url) => {
			const clean = normalizeBrowserUrl(url);
			if (document.activeElement !== urlInput) {
				urlInput.value = clean || "";
			}
			const isBm = isBookmarked(clean);
			starBtn.innerHTML = isBm ? '<i class="fa-solid fa-star text-amber-400"></i>' : '<i class="fa-regular fa-star text-neutral-400"></i>';
			starBtn.title = isBm ? "Remove Bookmark" : "Bookmark this Page";
		};

		if (window.ensureSapphire && !win.customState.__sapphireUnsub) {
			window.ensureSapphire()
				.then((sEngine) => {
					if (sEngine && typeof sEngine.onChange === "function" && !win.customState.__sapphireUnsub) {
						win.customState.__sapphireUnsub = sEngine.onChange(() => {
							renderToolbarExtensions();
							if (win.customState.activePanel === "extensions") {
								renderDrawer();
							}
						});
					}
					renderToolbarExtensions();
				})
				.catch(() => {});
		}

		const renderInternalPageView = (tabObj, targetUrl) => {
			const container = tabObj.internalEl;
			if (!container) return;
			container.innerHTML = "";

			const lower = (targetUrl || "").toLowerCase();

			let currentSection = "bookmarks";
			if (lower.startsWith("onyx://newtab") || lower.startsWith("onyx://home")) {
				currentSection = "newtab";
			} else if (lower.startsWith("onyx://chat")) {
				currentSection = "chat";
			} else if (lower.startsWith("onyx://history")) {
				currentSection = "history";
			} else if (lower.startsWith("onyx://extensions")) {
				currentSection = "extensions";
			} else if (lower.startsWith("onyx://settings")) {
				currentSection = "settings";
			}

			if (currentSection === "chat") {
				const chatFrame = document.createElement("iframe");
				chatFrame.className = "w-full h-full border-0 outline-none bg-[#09090b]";
				chatFrame.src = "/chat.html";
				container.appendChild(chatFrame);
				return;
			}

			if (currentSection === "newtab") {
				const homeContainer = document.createElement("div");
				homeContainer.className = "w-full h-full flex flex-col items-center justify-center bg-[#09090b] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_60%)] select-none p-6 text-white min-h-[65vh]";

				const homeWrap = document.createElement("div");
				homeWrap.className = "flex flex-col items-center justify-center max-w-xl w-full gap-7";

				const titleEl = document.createElement("h1");
				titleEl.className = "text-6xl font-extrabold tracking-[0.16em] uppercase bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent select-none";
				titleEl.textContent = "VEILOS";
				homeWrap.appendChild(titleEl);

				const searchCard = document.createElement("div");
				searchCard.className = "w-full flex items-center bg-[#111118] border border-white/15 hover:border-white/25 focus-within:border-indigo-400 rounded-full px-4 py-2.5 gap-3 shadow-2xl transition-all";

				const searchIcon = document.createElement("span");
				searchIcon.className = "text-neutral-400 text-sm pl-1";
				searchIcon.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
				searchCard.appendChild(searchIcon);

				const searchInp = document.createElement("input");
				searchInp.className = "flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none font-sans";
				searchInp.placeholder = "search here...";
				searchInp.onkeydown = (e) => {
					if (e.key === "Enter") {
						const q = searchInp.value.trim();
						if (q) handleNav(q);
					}
				};
				searchCard.appendChild(searchInp);

				const engineChip = document.createElement("button");
				const getEngineInfo = (eng) => {
					const e = (eng || store.searchEngine || "duckduckgo").toLowerCase();
					if (e === "google") return { name: "Google", icon: "🔍" };
					if (e === "bing") return { name: "Bing", icon: "🌐" };
					if (e === "brave") return { name: "Brave", icon: "🛡️" };
					return { name: "DuckDuckGo", icon: "🦆" };
				};

				const updateEngineChip = () => {
					const info = getEngineInfo(store.searchEngine);
					engineChip.innerHTML = `<span>${info.icon}</span><span>${info.name}</span>`;
					engineChip.title = `Search engine: ${info.name}. Click to switch.`;
				};

				engineChip.className = "flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/10 hover:border-white/25 text-xs text-neutral-300 hover:text-white cursor-pointer transition-all shrink-0 font-medium";
				updateEngineChip();

				engineChip.onclick = () => {
					const engines = ["duckduckgo", "google", "bing", "brave"];
					const curIdx = engines.indexOf((store.searchEngine || "duckduckgo").toLowerCase());
					const nextEngine = engines[(curIdx + 1) % engines.length];
					store.searchEngine = nextEngine;
					updateEngineChip();
					searchInp.focus();
				};
				searchCard.appendChild(engineChip);

				const submitBtn = document.createElement("button");
				submitBtn.className = "w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-all shrink-0";
				submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right text-[11px]"></i>';
				submitBtn.title = "Search or Navigate";
				submitBtn.onclick = () => {
					const q = searchInp.value.trim();
					if (q) handleNav(q);
				};
				searchCard.appendChild(submitBtn);

				homeWrap.appendChild(searchCard);

				const quickNav = document.createElement("div");
				quickNav.className = "flex flex-wrap items-center justify-center gap-2 pt-1";
				const quickItems = [
					{ name: "Onyx Chat", url: "onyx://chat", icon: "💬" },
					{ name: "Extensions", url: "onyx://extensions", icon: "🧩" },
					{ name: "Settings", url: "onyx://settings", icon: "⚙️" },
					{ name: "Bookmarks", url: "onyx://bookmarks", icon: "⭐" },
					{ name: "History", url: "onyx://history", icon: "🕒" }
				];
				quickItems.forEach(item => {
					const btn = document.createElement("button");
					btn.className = "px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer";
					btn.innerHTML = `<span>${item.icon}</span><span>${item.name}</span>`;
					btn.onclick = () => handleNav(item.url);
					quickNav.appendChild(btn);
				});
				homeWrap.appendChild(quickNav);

				homeContainer.appendChild(homeWrap);
				container.appendChild(homeContainer);
				return;
			}

			const headerWrap = document.createElement("div");
			headerWrap.className = "w-full border-b border-white/10 bg-neutral-900/90 backdrop-blur sticky top-0 z-20 px-6 py-4";

			const headerInner = document.createElement("div");
			headerInner.className = "max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap";

			const titleBox = document.createElement("div");
			titleBox.className = "flex items-center gap-3";

			let pageIcon = "⭐";
			let pageTitle = "Bookmarks";
			let pageSub = "Manage and search your saved sites";

			if (currentSection === "history") {
				pageIcon = "🕒";
				pageTitle = "History";
				pageSub = "View and manage visited pages";
			} else if (currentSection === "extensions") {
				pageIcon = "🧩";
				pageTitle = "Extensions";
				pageSub = "Manage, install, and configure browser extensions";
			} else if (currentSection === "settings") {
				pageIcon = "⚙️";
				pageTitle = "Settings";
				pageSub = "Browser preferences and cloak options";
			}

			titleBox.innerHTML = `
				<div class="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner">${pageIcon}</div>
				<div>
					<div class="flex items-center gap-2">
						<span class="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">onyx://${currentSection}</span>
					</div>
					<h1 class="text-lg font-bold text-white tracking-tight">${pageTitle}</h1>
				</div>
			`;

			const navTabs = document.createElement("div");
			navTabs.className = "flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10";

			const internalTabs = [
				{ id: "newtab", url: "onyx://newtab", label: "Home", icon: "🏠" },
				{ id: "chat", url: "onyx://chat", label: "Chat", icon: "💬" },
				{ id: "extensions", url: "onyx://extensions", label: "Extensions", icon: "🧩" },
				{ id: "bookmarks", url: "onyx://bookmarks", label: "Bookmarks", icon: "⭐" },
				{ id: "history", url: "onyx://history", label: "History", icon: "🕒" },
				{ id: "settings", url: "onyx://settings", label: "Settings", icon: "⚙️" }
			];

			internalTabs.forEach(it => {
				const isCurrent = currentSection === it.id;
				const tabBtn = document.createElement("button");
				tabBtn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
					isCurrent ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'
				}`;
				tabBtn.innerHTML = `<span>${it.icon}</span><span>${it.label}</span>`;
				tabBtn.onclick = () => handleNav(it.url);
				navTabs.appendChild(tabBtn);
			});

			headerInner.appendChild(titleBox);
			headerInner.appendChild(navTabs);
			headerWrap.appendChild(headerInner);
			container.appendChild(headerWrap);

			const contentArea = document.createElement("div");
			contentArea.className = "max-w-5xl mx-auto p-6 flex flex-col gap-6";

			if (currentSection === "bookmarks") {
				const bms = Array.isArray(store.bookmarks) ? store.bookmarks : [];
				let searchVal = (win.customState.bookmarkPageSearch || "").toLowerCase();

				const toolbarCard = document.createElement("div");
				toolbarCard.className = "flex items-center justify-between gap-3 flex-wrap bg-neutral-900/60 border border-white/10 p-3.5 rounded-2xl";

				const searchInput = document.createElement("input");
				searchInput.className = "flex-1 min-w-[220px] bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-amber-400 transition-colors";
				searchInput.placeholder = "Search saved bookmarks...";
				searchInput.value = win.customState.bookmarkPageSearch || "";
				searchInput.oninput = (e) => {
					win.customState.bookmarkPageSearch = e.target.value;
					renderInternalPageView(tabObj, targetUrl);
				};

				const actionsBox = document.createElement("div");
				actionsBox.className = "flex items-center gap-2 shrink-0 flex-wrap";

				const isBarVisible = win.customState.showQuickBookmarks !== false;
				const toggleBarBtn = document.createElement("button");
				toggleBarBtn.id = "toggle_bookmarks_bar_btn";
				toggleBarBtn.className = isBarVisible
					? "px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
					: "px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0";
				toggleBarBtn.title = isBarVisible ? "Hide the bookmarks bar under the navigation address bar" : "Show the bookmarks bar under the navigation address bar";
				toggleBarBtn.innerHTML = isBarVisible
					? `<span>🔖</span><span>Hide Bookmarks Bar</span>`
					: `<span>🔖</span><span>Show Bookmarks Bar</span>`;
				toggleBarBtn.onclick = () => {
					win.customState.showQuickBookmarks = !win.customState.showQuickBookmarks;
					store.showBookmarksBar = win.customState.showQuickBookmarks;
					renderQuickBookmarks();
					renderInternalPageView(tabObj, targetUrl);
				};

				const addBtn = document.createElement("button");
				addBtn.className = "px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shrink-0";
				addBtn.innerHTML = `<span>＋</span><span>Add Bookmark</span>`;

				actionsBox.appendChild(toggleBarBtn);
				actionsBox.appendChild(addBtn);

				toolbarCard.appendChild(searchInput);
				toolbarCard.appendChild(actionsBox);
				contentArea.appendChild(toolbarCard);

				const addForm = document.createElement("div");
				addForm.className = "p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col gap-3 hidden animate-fade";
				addForm.innerHTML = `
					<div class="text-xs font-bold text-amber-300 flex items-center gap-2">
						<span>⭐</span><span>New Bookmark Details</span>
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<input id="bm_name_input" class="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-amber-400" placeholder="Bookmark Title (e.g. Google)" />
						<input id="bm_url_input" class="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-amber-400" placeholder="Bookmark URL (e.g. https://google.com)" />
					</div>
					<div class="flex items-center justify-end gap-2 pt-1">
						<button id="bm_cancel_btn" class="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white bg-white/5 cursor-pointer">Cancel</button>
						<button id="bm_save_btn" class="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 cursor-pointer">Save Bookmark</button>
					</div>
				`;
				addBtn.onclick = () => {
					addForm.classList.toggle("hidden");
					if (!addForm.classList.contains("hidden")) {
						const nameEl = addForm.querySelector("#bm_name_input");
						if (nameEl) nameEl.focus();
					}
				};
				const cancelBtn = addForm.querySelector("#bm_cancel_btn");
				if (cancelBtn) cancelBtn.onclick = () => addForm.classList.add("hidden");

				const saveBtn = addForm.querySelector("#bm_save_btn");
				if (saveBtn) {
					saveBtn.onclick = () => {
						const nameEl = addForm.querySelector("#bm_name_input");
						const urlEl = addForm.querySelector("#bm_url_input");
						const nameVal = nameEl ? nameEl.value.trim() : "";
						const rawUrl = urlEl ? urlEl.value.trim() : "";
						if (!rawUrl) return;
						const cleanUrl = formatUrl(rawUrl);
						const newBm = {
							id: "bm_" + Date.now(),
							name: nameVal || getTitleFromUrl(cleanUrl),
							url: cleanUrl,
							icon: "⭐",
							addedAt: Date.now()
						};
						store.bookmarks = [newBm, ...bms];
						renderQuickBookmarks();
						renderInternalPageView(tabObj, targetUrl);
					};
				}
				contentArea.appendChild(addForm);

				const filtered = bms.filter(b => !searchVal || (b.name && b.name.toLowerCase().includes(searchVal)) || (b.url && b.url.toLowerCase().includes(searchVal)));

				const grid = document.createElement("div");
				grid.className = "grid grid-cols-1 md:grid-cols-2 gap-3";

				filtered.forEach(bm => {
					const card = document.createElement("div");
					card.className = "group flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-white/10 hover:border-amber-400/40 transition-all shadow-sm";

					const info = document.createElement("div");
					info.className = "flex items-center gap-3 min-w-0 flex-1 cursor-pointer pr-3";
					info.innerHTML = `
						<div class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0 group-hover:bg-amber-500/20 transition-colors">${bm.icon || '⭐'}</div>
						<div class="flex flex-col min-w-0 flex-1">
							<span class="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">${bm.name}</span>
							<span class="text-[11px] font-mono text-neutral-400 truncate mt-0.5">${bm.url}</span>
						</div>
					`;
					info.onclick = () => handleNav(bm.url);

					const actions = document.createElement("div");
					actions.className = "flex items-center gap-1.5 shrink-0";

					const openTabBtn = document.createElement("button");
					openTabBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer";
					openTabBtn.title = "Open in New Tab";
					openTabBtn.textContent = "↗";
					openTabBtn.onclick = () => createNewTab(bm.url);

					const copyBtn = document.createElement("button");
					copyBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer";
					copyBtn.title = "Copy URL";
					copyBtn.textContent = "📋";
					copyBtn.onclick = () => {
						navigator.clipboard?.writeText(bm.url);
						copyBtn.textContent = "✓";
						setTimeout(() => { copyBtn.textContent = "📋"; }, 1200);
					};

					const delBtn = document.createElement("button");
					delBtn.className = "w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center text-xs cursor-pointer";
					delBtn.title = "Delete Bookmark";
					delBtn.textContent = "🗑️";
					delBtn.onclick = () => {
						store.bookmarks = bms.filter(b => b.id !== bm.id);
						renderQuickBookmarks();
						renderInternalPageView(tabObj, targetUrl);
					};

					actions.appendChild(openTabBtn);
					actions.appendChild(copyBtn);
					actions.appendChild(delBtn);

					card.appendChild(info);
					card.appendChild(actions);
					grid.appendChild(card);
				});

				if (filtered.length === 0) {
					const emptyBox = document.createElement("div");
					emptyBox.className = "col-span-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-neutral-900/30";
					emptyBox.innerHTML = `
						<span class="text-3xl mb-2">⭐</span>
						<h3 class="text-sm font-bold text-white mb-1">${bms.length === 0 ? 'No Bookmarks Saved Yet' : 'No Matching Bookmarks Found'}</h3>
						<p class="text-xs text-neutral-400 max-w-sm mb-4">Click "Add Bookmark" above or click the star button in the URL bar while browsing any page.</p>
					`;
					grid.appendChild(emptyBox);
				}

				contentArea.appendChild(grid);
			}

			else if (currentSection === "history") {
				const hists = Array.isArray(store.history) ? store.history : [];
				let searchVal = (win.customState.historyPageSearch || "").toLowerCase();

				const toolbarCard = document.createElement("div");
				toolbarCard.className = "flex items-center justify-between gap-3 flex-wrap bg-neutral-900/60 border border-white/10 p-3.5 rounded-2xl";

				const searchInput = document.createElement("input");
				searchInput.className = "flex-1 min-w-[220px] bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-purple-400 transition-colors";
				searchInput.placeholder = "Search browsing history...";
				searchInput.value = win.customState.historyPageSearch || "";
				searchInput.oninput = (e) => {
					win.customState.historyPageSearch = e.target.value;
					renderInternalPageView(tabObj, targetUrl);
				};

				const clearAllBtn = document.createElement("button");
				clearAllBtn.className = "px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shrink-0";
				clearAllBtn.innerHTML = `<span>🗑️</span><span>Clear Browsing Data</span>`;
				clearAllBtn.onclick = () => {
					if (confirm("Clear all recorded browsing history?")) {
						store.history = [];
						renderInternalPageView(tabObj, targetUrl);
					}
				};

				toolbarCard.appendChild(searchInput);
				toolbarCard.appendChild(clearAllBtn);
				contentArea.appendChild(toolbarCard);

				const filtered = hists.filter(h => !searchVal || (h.name && h.name.toLowerCase().includes(searchVal)) || (h.url && h.url.toLowerCase().includes(searchVal)));

				const listContainer = document.createElement("div");
				listContainer.className = "flex flex-col gap-2";

				filtered.forEach(h => {
					const row = document.createElement("div");
					row.className = "group flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-white/10 hover:border-purple-500/40 transition-all shadow-sm";

					const timeStr = h.visitedAt ? new Date(h.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

					const info = document.createElement("div");
					info.className = "flex items-center gap-3 min-w-0 flex-1 cursor-pointer pr-3";
					info.innerHTML = `
						<span class="text-xs text-neutral-400 font-mono shrink-0 w-16">${timeStr}</span>
						<div class="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs shrink-0">${getIconFromUrl(h.url)}</div>
						<div class="flex flex-col min-w-0 flex-1">
							<span class="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">${h.name}</span>
							<span class="text-[11px] font-mono text-neutral-400 truncate mt-0.5">${h.url}</span>
						</div>
					`;
					info.onclick = () => handleNav(h.url);

					const actions = document.createElement("div");
					actions.className = "flex items-center gap-1.5 shrink-0";

					const openTabBtn = document.createElement("button");
					openTabBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer";
					openTabBtn.title = "Open in New Tab";
					openTabBtn.textContent = "↗";
					openTabBtn.onclick = () => createNewTab(h.url);

					const copyBtn = document.createElement("button");
					copyBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center text-xs cursor-pointer";
					copyBtn.title = "Copy URL";
					copyBtn.textContent = "📋";
					copyBtn.onclick = () => {
						navigator.clipboard?.writeText(h.url);
						copyBtn.textContent = "✓";
						setTimeout(() => { copyBtn.textContent = "📋"; }, 1200);
					};

					const delBtn = document.createElement("button");
					delBtn.className = "w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center text-xs cursor-pointer";
					delBtn.title = "Remove from history";
					delBtn.textContent = "✕";
					delBtn.onclick = () => {
						store.history = hists.filter(item => item.id !== h.id);
						renderInternalPageView(tabObj, targetUrl);
					};

					actions.appendChild(openTabBtn);
					actions.appendChild(copyBtn);
					actions.appendChild(delBtn);

					row.appendChild(info);
					row.appendChild(actions);
					listContainer.appendChild(row);
				});

				if (filtered.length === 0) {
					const emptyBox = document.createElement("div");
					emptyBox.className = "flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-neutral-900/30";
					emptyBox.innerHTML = `
						<span class="text-3xl mb-2">🕒</span>
						<h3 class="text-sm font-bold text-white mb-1">${hists.length === 0 ? 'No Browsing History Yet' : 'No Matching History Found'}</h3>
						<p class="text-xs text-neutral-400 max-w-sm">Web pages you visit will automatically appear here.</p>
					`;
					listContainer.appendChild(emptyBox);
				}

				contentArea.appendChild(listContainer);
			}

			else if (currentSection === "extensions") {
				if (!window.sapphire && window.ensureSapphire) {
					window.ensureSapphire()
						.then(() => {
							if ((tabObj.url || "").toLowerCase().startsWith("onyx://extensions")) {
								renderInternalPageView(tabObj, targetUrl);
							}
						})
						.catch(() => {});
				}
				const exts = window.sapphire ? window.sapphire.getInstalledExtensions() : [];
				const activeTab = win.customState.extensionPageTab || "store";

				const tabsContainer = document.createElement("div");
				tabsContainer.className = "flex items-center gap-2 border-b border-white/10 pb-3 flex-wrap";

				const createTabBtn = (id, label, icon, badge) => {
					const btn = document.createElement("button");
					const isActive = activeTab === id;
					btn.className = `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
						isActive
							? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 border border-emerald-400/40"
							: "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
					}`;
					btn.innerHTML = `<span>${icon}</span><span>${label}</span>${
						badge !== undefined
							? `<span class="px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-neutral-400'}">${badge}</span>`
							: ""
					}`;
					btn.onclick = () => {
						win.customState.extensionPageTab = id;
						renderInternalPageView(tabObj, targetUrl);
					};
					return btn;
				};

				tabsContainer.appendChild(createTabBtn("store", "Chrome Web Store", "🛒"));
				tabsContainer.appendChild(createTabBtn("installed", "Installed Extensions", "🧩", exts.length));
				tabsContainer.appendChild(createTabBtn("upload", "Upload Archive", "📦"));
				contentArea.appendChild(tabsContainer);

				if (win.customState.extensionBanner) {
					const banner = document.createElement("div");
					banner.className = "p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-3 shadow-md animate-fade-in";
					banner.innerHTML = `
						<div class="flex items-center gap-2">
							<span class="text-base">🎉</span>
							<span>${win.customState.extensionBanner}</span>
						</div>
					`;
					const closeBannerBtn = document.createElement("button");
					closeBannerBtn.className = "text-emerald-400 hover:text-emerald-200 text-xs font-bold px-2 py-1 rounded cursor-pointer";
					closeBannerBtn.textContent = "✕";
					closeBannerBtn.onclick = () => {
						win.customState.extensionBanner = null;
						banner.remove();
					};
					banner.appendChild(closeBannerBtn);
					contentArea.appendChild(banner);
				}

				if (activeTab === "store") {
					const storeWrap = document.createElement("div");
					storeWrap.className = "flex flex-col gap-5";

					const searchHero = document.createElement("div");
					searchHero.className = "p-6 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-emerald-950/30 border border-white/10 shadow-xl flex flex-col gap-4";

					const heroHeader = document.createElement("div");
					heroHeader.className = "flex flex-col gap-1";
					heroHeader.innerHTML = `
						<div class="flex items-center gap-2">
							<span class="text-base">🔍</span>
							<h2 class="text-sm font-bold text-white uppercase tracking-wider">Search Chrome Web Store</h2>
						</div>
						<p class="text-xs text-neutral-400">Search by extension name, keyword, Chrome Web Store URL, or 32-character extension ID.</p>
					`;
					searchHero.appendChild(heroHeader);

					const searchBarWrap = document.createElement("div");
					searchBarWrap.className = "flex items-center gap-2";

					const searchInput = document.createElement("input");
					searchInput.className = "flex-1 bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-400 outline-none focus:border-emerald-400 transition-all shadow-inner";
					searchInput.placeholder = "e.g. Dark Reader, uBlock Origin Lite, SponsorBlock, React DevTools, or paste CWS link / ID...";
					searchInput.value = win.customState.webStoreQuery || "";

					const searchBtn = document.createElement("button");
					searchBtn.className = "px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0";
					searchBtn.innerHTML = `<span>🔍</span><span>Search</span>`;

					const clearBtn = document.createElement("button");
					clearBtn.className = `px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white font-bold text-xs transition-all cursor-pointer ${
						searchInput.value ? "" : "hidden"
					}`;
					clearBtn.textContent = "Clear";

					searchBarWrap.appendChild(searchInput);
					searchBarWrap.appendChild(clearBtn);
					searchBarWrap.appendChild(searchBtn);
					searchHero.appendChild(searchBarWrap);

					const pillsRow = document.createElement("div");
					pillsRow.className = "flex items-center gap-1.5 flex-wrap text-xs";

					const pills = [
						{ label: "Popular", query: "popular", icon: "⭐" },
						{ label: "Ad Blockers", query: "adblock", icon: "🛡️" },
						{ label: "Dark Mode", query: "dark mode", icon: "🌙" },
						{ label: "Developer Tools", query: "developer tools", icon: "🛠️" },
						{ label: "Productivity", query: "productivity", icon: "⚡" },
						{ label: "Media & YouTube", query: "youtube", icon: "▶️" },
					];

					pills.forEach(p => {
						const pillBtn = document.createElement("button");
						pillBtn.className = "px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-medium border border-white/5 transition-all flex items-center gap-1.5 cursor-pointer";
						pillBtn.innerHTML = `<span>${p.icon}</span><span>${p.label}</span>`;
						pillBtn.onclick = () => {
							searchInput.value = p.query;
							clearBtn.classList.remove("hidden");
							triggerSearch(p.query);
						};
						pillsRow.appendChild(pillBtn);
					});
					searchHero.appendChild(pillsRow);
					storeWrap.appendChild(searchHero);

					const resultsWrap = document.createElement("div");
					resultsWrap.className = "flex flex-col gap-3";

					const resultsHeader = document.createElement("div");
					resultsHeader.className = "flex items-center justify-between px-1";
					resultsHeader.innerHTML = `
						<span class="text-xs font-bold text-neutral-300 uppercase tracking-wider" id="cws-results-title">Extensions</span>
						<span class="text-[11px] text-neutral-400 font-mono" id="cws-results-count"></span>
					`;
					resultsWrap.appendChild(resultsHeader);

					const cardsGrid = document.createElement("div");
					cardsGrid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";
					resultsWrap.appendChild(cardsGrid);
					storeWrap.appendChild(resultsWrap);

					const triggerSearch = async (q) => {
						const query = (q !== undefined ? q : searchInput.value).trim();
						win.customState.webStoreQuery = query;

						cardsGrid.innerHTML = `
							<div class="col-span-full flex flex-col items-center justify-center p-12 text-center border border-white/10 rounded-2xl bg-neutral-900/40">
								<span class="text-2xl animate-spin mb-3">⏳</span>
								<div class="text-xs font-bold text-white mb-1">Searching Chrome Web Store...</div>
								<div class="text-[11px] text-neutral-400">Querying live extension repository</div>
							</div>
						`;
						try {
							const res = await safeApiFetch(`/api/webstore/search?q=${encodeURIComponent(query || "popular")}`);
							if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
							const data = await res.json();
							renderSearchResults(data.results || [], query);
						} catch (err) {
							console.error("[CWS Search Error]", err);
							cardsGrid.innerHTML = `
								<div class="col-span-full flex flex-col items-center justify-center p-10 text-center border border-rose-500/20 rounded-2xl bg-rose-950/20">
									<span class="text-2xl text-rose-400 mb-2">✕</span>
									<div class="text-xs font-bold text-rose-300 mb-1">Search Error</div>
									<div class="text-[11px] text-neutral-400 max-w-sm mb-3">${err.message || 'Unable to load extensions'}</div>
									<button class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-bold cursor-pointer" id="cws-retry-btn">Retry</button>
								</div>
							`;
							const retryBtn = cardsGrid.querySelector("#cws-retry-btn");
							if (retryBtn) retryBtn.onclick = () => triggerSearch(query);
						}
					};

					const renderSearchResults = (items, currentQuery) => {
						const countEl = resultsWrap.querySelector("#cws-results-count");
						const titleEl = resultsWrap.querySelector("#cws-results-title");
						if (countEl) countEl.textContent = `${items.length} Available`;
						if (titleEl) titleEl.textContent = currentQuery ? `Results for "${currentQuery}"` : "Featured & Popular";

						cardsGrid.innerHTML = "";

						if (items.length === 0) {
							cardsGrid.innerHTML = `
								<div class="col-span-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-neutral-900/30">
									<span class="text-3xl mb-2">🔍</span>
									<h3 class="text-sm font-bold text-white mb-1">No Extensions Found</h3>
									<p class="text-xs text-neutral-400 max-w-sm">Try searching for a different keyword or paste a direct Chrome Web Store link.</p>
								</div>
							`;
							return;
						}

						items.forEach(item => {
							const isInstalled = exts.some(e => e.id === item.id || (e.name && item.name && e.name.toLowerCase() === item.name.toLowerCase()));
							const card = document.createElement("div");
							card.className = "p-4 rounded-2xl bg-neutral-900/70 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 shadow-md";

							const topSection = document.createElement("div");
							topSection.className = "flex flex-col gap-2.5";

							const headerRow = document.createElement("div");
							headerRow.className = "flex items-start justify-between gap-3";

							const iconImg = item.icon
								? `<img src="${item.icon}" class="w-11 h-11 rounded-xl object-contain bg-black/50 p-1.5 border border-white/10 shrink-0" onerror="this.src='';this.className='hidden'" />`
								: `<div class="w-11 h-11 rounded-xl bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-xl shrink-0 font-bold">${item.name.charAt(0)}</div>`;

							const titleBlock = document.createElement("div");
							titleBlock.className = "flex flex-col min-w-0 flex-1";

							const starStr = item.rating
								? `★ ${item.rating}${item.ratingCount ? ` (${item.ratingCount > 999 ? (item.ratingCount / 1000).toFixed(1) + 'k' : item.ratingCount})` : ''}`
								: "Chrome Extension";

							const userStr = item.users
								? `👥 ${item.users >= 1000000 ? (item.users / 1000000).toFixed(0) + 'M+' : (item.users / 1000).toFixed(0) + 'k+'} users`
								: "";

							titleBlock.innerHTML = `
								<div class="flex items-center gap-1.5">
									<h3 class="text-xs font-bold text-white truncate" title="${item.name}">${item.name}</h3>
									<span class="text-[10px] text-emerald-400">✓</span>
								</div>
								<div class="flex items-center gap-2 flex-wrap mt-0.5">
									<span class="text-[10px] font-semibold text-amber-400">${starStr}</span>
									${userStr ? `<span class="text-[10px] text-neutral-400 font-mono">${userStr}</span>` : ""}
								</div>
							`;

							headerRow.innerHTML = iconImg;
							headerRow.appendChild(titleBlock);
							topSection.appendChild(headerRow);

							if (item.description) {
								const descEl = document.createElement("p");
								descEl.className = "text-xs text-neutral-300 line-clamp-2 leading-relaxed";
								descEl.textContent = item.description;
								topSection.appendChild(descEl);
							}

							card.appendChild(topSection);

							const actionRow = document.createElement("div");
							actionRow.className = "flex items-center justify-between pt-2.5 border-t border-white/10 gap-2";

							const idBadge = document.createElement("span");
							idBadge.className = "text-[10px] font-mono text-neutral-400 truncate max-w-[140px]";
							idBadge.textContent = item.id.substring(0, 16) + "...";
							idBadge.title = `Extension ID: ${item.id}`;

							actionRow.appendChild(idBadge);

							if (isInstalled) {
								const installedBadge = document.createElement("div");
								installedBadge.className = "flex items-center gap-2";
								installedBadge.innerHTML = `
									<span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
										<span>✓</span><span>Installed</span>
									</span>
								`;
								actionRow.appendChild(installedBadge);
							} else {
								const installBtn = document.createElement("button");
								installBtn.className = "px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0";
								installBtn.innerHTML = `<span>➕</span><span>Add to Browser</span>`;

								installBtn.onclick = async () => {
									installBtn.disabled = true;
									installBtn.className = "px-3.5 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold flex items-center gap-1.5 cursor-wait shrink-0";
									installBtn.innerHTML = `<span class="animate-spin">⏳</span><span>Downloading...</span>`;

									try {
										const res = await safeApiFetch(`/api/webstore/download?id=${encodeURIComponent(item.id)}`);
										if (!res.ok) {
											const errJson = await res.json().catch(() => ({}));
											throw new Error(errJson.error || `Download failed (HTTP ${res.status})`);
										}

										installBtn.innerHTML = `<span class="animate-spin">⚙️</span><span>Installing...</span>`;
										let buffer = await res.arrayBuffer();

										if (window.normalizeExtensionBuffer) {
											buffer = await window.normalizeExtensionBuffer(buffer, `${item.id}.crx`);
										}

										const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire() : null);
										if (!sEngine || typeof sEngine.installExtension !== "function") {
											throw new Error("Sapphire extension engine is initializing. Please try again in a moment.");
										}

										await sEngine.installExtension(buffer, `${item.id}.crx`);

										installBtn.className = "px-3.5 py-1.5 rounded-xl bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 shrink-0";
										installBtn.innerHTML = `<span>✓</span><span>Installed!</span>`;

										win.customState.extensionBanner = `Installed "${item.name}"! The extension is now active.`;

										if (typeof win.customState.renderToolbarExtensions === "function") {
											win.customState.renderToolbarExtensions();
										}

										setTimeout(() => {
											renderInternalPageView(tabObj, targetUrl);
										}, 800);
									} catch (err) {
										console.error("[Extension Install Error]", err);
										installBtn.disabled = false;
										installBtn.className = "px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0";
										installBtn.innerHTML = `<span>✕</span><span>Retry</span>`;
										alert(`Installation failed for "${item.name}":\n${err.message || 'Unknown error'}`);
									}
								};

								actionRow.appendChild(installBtn);
							}

							card.appendChild(actionRow);
							cardsGrid.appendChild(card);
						});
					};

					searchBtn.onclick = () => triggerSearch();
					searchInput.onkeydown = (e) => {
						if (e.key === "Enter") triggerSearch();
					};
					searchInput.oninput = (e) => {
						if (e.target.value) {
							clearBtn.classList.remove("hidden");
						} else {
							clearBtn.classList.add("hidden");
						}
					};
					clearBtn.onclick = () => {
						searchInput.value = "";
						clearBtn.classList.add("hidden");
						triggerSearch("popular");
					};

					contentArea.appendChild(storeWrap);

					triggerSearch(win.customState.webStoreQuery || "popular");
				}

				else if (activeTab === "installed") {
					const installedWrap = document.createElement("div");
					installedWrap.className = "flex flex-col gap-4";

					const filterRow = document.createElement("div");
					filterRow.className = "flex items-center justify-between gap-3 flex-wrap bg-neutral-900/60 border border-white/10 p-3 rounded-2xl";

					const searchInput = document.createElement("input");
					searchInput.className = "flex-1 min-w-[220px] bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-emerald-400 transition-colors";
					searchInput.placeholder = "Search installed extensions...";
					searchInput.value = win.customState.extensionPageSearch || "";
					searchInput.oninput = (e) => {
						win.customState.extensionPageSearch = e.target.value;
						renderInternalPageView(tabObj, targetUrl);
					};

					const countBadge = document.createElement("span");
					countBadge.className = "text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
					countBadge.textContent = `${exts.length} Installed`;

					filterRow.appendChild(searchInput);
					filterRow.appendChild(countBadge);
					installedWrap.appendChild(filterRow);

					const searchVal = (win.customState.extensionPageSearch || "").toLowerCase();
					const filtered = exts.filter(ex => !searchVal || (ex.name && ex.name.toLowerCase().includes(searchVal)) || (ex.id && ex.id.toLowerCase().includes(searchVal)));

					const extGrid = document.createElement("div");
					extGrid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

					filtered.forEach(ext => {
						const card = document.createElement("div");
						card.className = `p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
							ext.enabled ? 'bg-neutral-900/70 border-white/15' : 'bg-neutral-950/40 border-white/5 opacity-60'
						}`;

						const topRow = document.createElement("div");
						topRow.className = "flex items-start justify-between gap-3";

						const iconEl = ext.iconUrl
							? `<img src="${ext.iconUrl}" class="w-10 h-10 rounded-xl object-contain bg-black/40 p-1 border border-white/10 shrink-0" />`
							: `<div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">🧩</div>`;

						const titleDiv = document.createElement("div");
						titleDiv.className = "flex items-center gap-3 min-w-0 flex-1";
						titleDiv.innerHTML = `
							${iconEl}
							<div class="flex flex-col min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-xs font-bold text-white truncate">${ext.name || 'Extension'}</span>
									${ext.version ? `<span class="text-[10px] text-neutral-400 font-mono bg-white/5 px-1.5 py-0.5 rounded">v${ext.version}</span>` : ''}
								</div>
								<span class="text-[10px] font-mono text-neutral-400 truncate mt-0.5">ID: ${ext.id}</span>
							</div>
						`;

						const toggleLabel = document.createElement("label");
						toggleLabel.className = "relative inline-flex items-center cursor-pointer shrink-0";
						const toggleInput = document.createElement("input");
						toggleInput.type = "checkbox";
						toggleInput.checked = Boolean(ext.enabled);
						toggleInput.className = "sr-only peer";
						toggleInput.onchange = async (e) => {
							const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
							if (sEngine) {
								await sEngine.setExtensionEnabled(ext.id, e.target.checked);
								renderInternalPageView(tabObj, targetUrl);
								if (typeof win.customState.renderToolbarExtensions === "function") {
									win.customState.renderToolbarExtensions();
								}
							}
						};
						const toggleBg = document.createElement("div");
						toggleBg.className = "w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600";
						toggleLabel.appendChild(toggleInput);
						toggleLabel.appendChild(toggleBg);

						topRow.appendChild(titleDiv);
						topRow.appendChild(toggleLabel);
						card.appendChild(topRow);

						if (ext.manifest?.description) {
							const descEl = document.createElement("p");
							descEl.className = "text-xs text-neutral-300 line-clamp-2 leading-relaxed";
							descEl.textContent = ext.manifest.description;
							card.appendChild(descEl);
						}

						const actionRow = document.createElement("div");
						actionRow.className = "flex items-center justify-between pt-2 border-t border-white/10";

						const leftBtns = document.createElement("div");
						leftBtns.className = "flex items-center gap-2";

						if (ext.hasPopup) {
							const popupBtn = document.createElement("button");
							popupBtn.className = "px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer";
							popupBtn.innerHTML = `<span>🪄</span><span>Popup</span>`;
							popupBtn.onclick = async () => {
								try {
									const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
									if (!sEngine) return;
									const page = typeof sEngine.getExtensionPopupPage === "function" ? sEngine.getExtensionPopupPage(ext.id) : null;
									const popupUrl = ext.popupUrl || (page && typeof sEngine.extensionUrl === "function" ? sEngine.extensionUrl(ext.id, page) : null);
									if (typeof win.customState.showExtensionPopover === "function") {
										win.customState.showExtensionPopover(ext.id, popupUrl);
									} else if (popupUrl) {
										createNewTab(popupUrl);
									}
								} catch (e) {
									console.error(e);
								}
							};
							leftBtns.appendChild(popupBtn);
						}

						const delBtn = document.createElement("button");
						delBtn.className = "px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto";
						delBtn.innerHTML = `<span>🗑️</span><span>Remove</span>`;
						delBtn.onclick = async () => {
							if (confirm(`Remove extension "${ext.name}"?`)) {
								const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
								if (sEngine) {
									await sEngine.uninstallExtension(ext.id);
									renderInternalPageView(tabObj, targetUrl);
									if (typeof win.customState.renderToolbarExtensions === "function") {
										win.customState.renderToolbarExtensions();
									}
								}
							}
						};

						actionRow.appendChild(leftBtns);
						actionRow.appendChild(delBtn);
						card.appendChild(actionRow);

						extGrid.appendChild(card);
					});

					if (filtered.length === 0) {
						const emptyBox = document.createElement("div");
						emptyBox.className = "col-span-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-neutral-900/30";
						emptyBox.innerHTML = `
							<span class="text-3xl mb-2">🧩</span>
							<h3 class="text-sm font-bold text-white mb-1">${exts.length === 0 ? 'No Extensions Installed Yet' : 'No Matching Extensions Found'}</h3>
							<p class="text-xs text-neutral-400 max-w-sm mb-3">Browse and install extensions directly from the Chrome Web Store.</p>
						`;
						const browseStoreBtn = document.createElement("button");
						browseStoreBtn.className = "px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md";
						browseStoreBtn.innerHTML = `<span>🛒</span><span>Browse Chrome Web Store</span>`;
						browseStoreBtn.onclick = () => {
							win.customState.extensionPageTab = "store";
							renderInternalPageView(tabObj, targetUrl);
						};
						emptyBox.appendChild(browseStoreBtn);
						extGrid.appendChild(emptyBox);
					}

					installedWrap.appendChild(extGrid);
					contentArea.appendChild(installedWrap);
				}

				else if (activeTab === "upload") {
					const uploadCard = document.createElement("div");
					uploadCard.className = "p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-neutral-900 border border-emerald-500/30 flex flex-col gap-4 shadow-lg";

					const uploadHeader = document.createElement("div");
					uploadHeader.className = "flex items-center justify-between";
					uploadHeader.innerHTML = `
						<div class="flex items-center gap-2">
							<span class="text-base">📦</span>
							<h3 class="text-xs font-bold text-emerald-300 uppercase tracking-wider">Manual Extension Package Upload</h3>
						</div>
						<span class="text-[11px] text-neutral-400 font-mono">Supports .CRX & .ZIP</span>
					`;

					const fileInput = document.createElement("input");
					fileInput.type = "file";
					fileInput.accept = ".crx,.zip";
					fileInput.className = "hidden";

					const dropArea = document.createElement("div");
					dropArea.className = "border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 rounded-xl p-8 text-center cursor-pointer transition-all bg-emerald-950/20 hover:bg-emerald-900/30 flex flex-col items-center justify-center gap-2.5";
					dropArea.innerHTML = `
						<span class="text-3xl">📦</span>
						<div class="text-xs font-bold text-emerald-200">Drag & Drop Chrome Extension Archive (.CRX or .ZIP)</div>
						<div class="text-[11px] text-neutral-400">or click to browse your computer</div>
					`;

					const statusBox = document.createElement("div");
					statusBox.className = "text-xs text-neutral-400 hidden p-3 rounded-xl bg-black/40 border border-white/10";

					const handleExtUpload = async (file) => {
						if (!file) return;
						const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire() : null);
						if (!sEngine || typeof sEngine.installExtension !== "function") {
							alert("Extensions engine is initializing. Please try again in a moment.");
							return;
						}
						statusBox.className = "text-xs text-emerald-300 flex items-center gap-2 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30";
						statusBox.innerHTML = `<span class="animate-spin">⏳</span><span>Installing "${file.name}"...</span>`;
						statusBox.classList.remove("hidden");
						try {
							let buffer = await file.arrayBuffer();
							if (window.normalizeExtensionBuffer) {
								buffer = await window.normalizeExtensionBuffer(buffer, file.name);
							}
							await sEngine.installExtension(buffer, file.name);
							statusBox.className = "text-xs text-emerald-300 flex items-center gap-2 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30";
							statusBox.innerHTML = `<span>✓</span><span>Successfully installed "${file.name}"!</span>`;
							setTimeout(() => {
								win.customState.extensionPageTab = "installed";
								renderInternalPageView(tabObj, targetUrl);
								if (typeof win.customState.renderToolbarExtensions === "function") {
									win.customState.renderToolbarExtensions();
								}
							}, 800);
						} catch (err) {
							console.error("[Extension Install Error]", err);
							statusBox.className = "text-xs text-rose-300 flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30";
							statusBox.innerHTML = `<span>✕</span><span>Install failed: ${err.message || 'Invalid format'}</span>`;
						}
					};

					dropArea.onclick = () => fileInput.click();
					fileInput.onchange = (e) => {
						const file = e.target.files && e.target.files[0];
						if (file) handleExtUpload(file);
					};
					dropArea.ondragover = (e) => {
						e.preventDefault();
						dropArea.classList.add("border-emerald-400", "bg-emerald-900/40");
					};
					dropArea.ondragleave = () => {
						dropArea.classList.remove("border-emerald-400", "bg-emerald-900/40");
					};
					dropArea.ondrop = (e) => {
						e.preventDefault();
						dropArea.classList.remove("border-emerald-400", "bg-emerald-900/40");
						const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
						if (file) handleExtUpload(file);
					};

					uploadCard.appendChild(uploadHeader);
					uploadCard.appendChild(fileInput);
					uploadCard.appendChild(dropArea);
					uploadCard.appendChild(statusBox);
					contentArea.appendChild(uploadCard);
				}
			}

			else if (currentSection === "settings") {
				const settingsWrap = document.createElement("div");
				settingsWrap.className = "flex flex-col gap-6 max-w-3xl";

				const vipSec = document.createElement("div");
				vipSec.className = "p-5 rounded-2xl bg-[#111118]/90 border border-amber-500/25 flex flex-col gap-3";
				const aState = getVeilAuthState();
				const isOwn = Boolean(aState.isOwner);
				const isVip = Boolean(isOwn || hasVipAccess());
				vipSec.innerHTML = `
					<div class="flex items-center justify-between gap-2 flex-wrap">
						<div class="flex items-center gap-2.5">
							<i class="fa-solid fa-crown text-amber-400 text-lg"></i>
							<div>
								<h3 class="text-sm font-bold text-white">Account &amp; VIP Membership</h3>
								<p class="text-xs text-neutral-400">
									${aState.mode === "account"
										? `Signed in as @${escapeHtml(aState.username)} (${escapeHtml(aState.email || "")})`
										: aState.mode === "guest"
										? "Currently browsing as Guest"
										: "Not signed in"}
								</p>
							</div>
						</div>
						<span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
							isOwn
								? "bg-amber-500/20 text-amber-300 border-amber-400/40"
								: isVip
								? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
								: "bg-white/10 text-neutral-300 border-white/10"
						}">
							${isOwn ? "Owner Mode" : isVip ? "VIP Active" : "Free / Guest"}
						</span>
					</div>
					<form id="onyx-vip-redeem-form" class="flex gap-2">
						<input id="onyx-vip-code-input" type="text" placeholder="Enter VIP code (e.g. VEIL-XXXX-XXXX)"
							class="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono uppercase placeholder-neutral-500 outline-none focus:border-amber-400" />
						<button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer">Redeem VIP</button>
						<button type="button" id="onyx-open-vip-cfg" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer">
							${isOwn ? "Owner Panel" : "Account"}
						</button>
					</form>
					<div id="onyx-vip-feedback" class="hidden text-xs p-2.5 rounded-xl border"></div>
				`;
				const oRedeemForm = vipSec.querySelector("#onyx-vip-redeem-form");
				const oFeedback = vipSec.querySelector("#onyx-vip-feedback");
				if (oRedeemForm) {
					oRedeemForm.onsubmit = async (ev) => {
						ev.preventDefault();
						const codeVal = vipSec.querySelector("#onyx-vip-code-input")?.value || "";
						try {
							const res = await window.VeilAuth.redeemVipCode(codeVal);
							if (oFeedback) {
								oFeedback.className = "text-xs p-2.5 rounded-xl border bg-emerald-500/15 border-emerald-500/35 text-emerald-200";
								oFeedback.textContent = `VIP activated (${res.code})! Expires: ${formatVipExpiry(res.expiresAt)}`;
							}
							setTimeout(() => renderInternalPageView(tabObj, targetUrl), 900);
						} catch (err) {
							if (oFeedback) {
								oFeedback.className = "text-xs p-2.5 rounded-xl border bg-rose-500/15 border-rose-500/35 text-rose-200";
								oFeedback.textContent = err.message || "Could not redeem VIP code.";
							}
						}
					};
				}
				const oCfgBtn = vipSec.querySelector("#onyx-open-vip-cfg");
				if (oCfgBtn) {
					oCfgBtn.onclick = () => window.openSettingsModal(isOwn ? "owner" : "vip");
				}
				settingsWrap.appendChild(vipSec);

				const themeSec = document.createElement("div");
				themeSec.className = "p-5 rounded-2xl bg-[#111118]/90 border border-white/15 flex flex-col gap-4";
				const curTheme = (store.theme || "default").toLowerCase();
				themeSec.innerHTML = `
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<span class="text-lg">🎨</span>
							<div>
								<h3 class="text-sm font-bold text-white">Theme & Desktop Style</h3>
								<p class="text-xs text-neutral-400">Select your active aesthetic theme for VeilOS and Onyx Browser.</p>
							</div>
						</div>
						<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
							Active
						</span>
					</div>
				`;
				const themesGrid = document.createElement("div");
				themesGrid.className = "grid grid-cols-1 sm:grid-cols-2 gap-2.5";
				const themeOptions = [
					{ id: "default", label: "Midnight Classic", icon: "🌌", wp: "assets/background.jpg", accent: "indigo", desc: "Classic sleek dark mode with high-resolution floral aesthetic wallpaper." },
					{ id: "midnight", label: "Obsidian Slate", icon: "🌑", wp: "gradient", accent: "sky", desc: "Minimalist obsidian slate surface with cool sapphire-indigo accents." },
					{ id: "cyber", label: "Cyber Matrix", icon: "⚡", wp: "gradient", accent: "emerald", desc: "High-tech emerald neon gradients and terminal aesthetic." },
					{ id: "crimson", label: "Deep Crimson", icon: "💎", wp: "gradient", accent: "rose", desc: "Refined frosted crimson red and obsidian styling." }
				];
				themeOptions.forEach(th => {
					const btn = document.createElement("button");
					const isSel = curTheme === th.id;
					btn.className = `p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
						isSel ? 'selected-item bg-indigo-500/15 border-indigo-400/60 text-white shadow-lg' : 'bg-white/5 border-transparent text-neutral-300 hover:bg-white/10'
					}`;
					btn.innerHTML = `
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span>${th.icon}</span>
								<span class="text-xs font-bold text-white">${th.label}</span>
							</div>
							${isSel ? '<span class="text-xs text-indigo-300 font-bold">✓</span>' : ''}
						</div>
						<p class="text-[10px] text-neutral-400 leading-snug">${th.desc}</p>
					`;
					btn.onclick = () => {
						store.theme = th.id;
						store.wallpaper = th.wp;
						store.accentColor = th.accent;
						try {
							localStorage.setItem("spade_user_theme", th.id);
							localStorage.setItem("veil_user_theme", th.id);
						} catch(e){}
						if (osInstance && osInstance.notify) {
							osInstance.notify("Theme Updated", `Switched to ${th.label}`, "fa-solid fa-wand-magic-sparkles");
							osInstance.windows = [...osInstance.windows];
						}
						renderInternalPageView(tabObj, targetUrl);
					};
					themesGrid.appendChild(btn);
				});
				themeSec.appendChild(themesGrid);
				settingsWrap.appendChild(themeSec);

				const searchSec = document.createElement("div");
				searchSec.className = "p-5 rounded-2xl bg-[#111118]/90 border border-white/10 flex flex-col gap-4";
				searchSec.innerHTML = `
					<div class="flex items-center gap-2.5">
						<span class="text-lg">🔍</span>
						<div>
							<h3 class="text-sm font-bold text-white">Default Search Engine</h3>
							<p class="text-xs text-neutral-400">Choose the search engine used for URL bar queries.</p>
						</div>
					</div>
				`;
				const enginesGrid = document.createElement("div");
				enginesGrid.className = "grid grid-cols-2 sm:grid-cols-4 gap-2.5";
				const engines = [
					{ id: "google", label: "Google", icon: "🔍" },
					{ id: "duckduckgo", label: "DuckDuckGo", icon: "🦆" },
					{ id: "bing", label: "Bing", icon: "🅱️" },
					{ id: "brave", label: "Brave", icon: "🦁" }
				];
				engines.forEach(eng => {
					const btn = document.createElement("button");
					const isSel = (store.searchEngine || "google") === eng.id;
					btn.className = `p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all ${
						isSel ? 'selected-item bg-indigo-500/20 border-2 border-indigo-400 text-white shadow-lg font-bold' : 'bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
					}`;
					btn.innerHTML = `<div class="flex items-center gap-2"><span>${eng.icon}</span><span>${eng.label}</span></div>${isSel ? '<i class="fa-solid fa-circle-check text-indigo-300 text-xs"></i>' : ''}`;
					btn.onclick = () => {
						store.searchEngine = eng.id;
						try {
							localStorage.setItem("spade_user_picked_engine", "true");
							localStorage.setItem("veil_user_picked_engine", "true");
						} catch(e){}
						renderInternalPageView(tabObj, targetUrl);
					};
					enginesGrid.appendChild(btn);
				});
				searchSec.appendChild(enginesGrid);
				settingsWrap.appendChild(searchSec);

				const cloakSec = document.createElement("div");
				cloakSec.className = "p-5 rounded-2xl bg-[#111118]/90 border border-white/10 flex flex-col gap-4";
				cloakSec.innerHTML = `
					<div class="flex items-center gap-2.5">
						<span class="text-lg">🎭</span>
						<div>
							<h3 class="text-sm font-bold text-white">Tab Cloaking & Stealth</h3>
							<p class="text-xs text-neutral-400">Disguise browser tab title and favicon as school or office apps.</p>
						</div>
					</div>
				`;
				const cloaksGrid = document.createElement("div");
				cloaksGrid.className = "grid grid-cols-2 sm:grid-cols-3 gap-2.5";
				const cloaks = [
					{ id: "veil", label: "VeilOS" },
					{ id: "google", label: "Google" },
					{ id: "classroom", label: "Google Classroom" },
					{ id: "drive", label: "Google Drive" },
					{ id: "canvas", label: "Canvas LMS" },
					{ id: "schoology", label: "Schoology" }
				];
				const curCloak = (!store.tabCloak || store.tabCloak === "default" || store.tabCloak === "spade") ? "veil" : store.tabCloak;
				cloaks.forEach(clk => {
					const btn = document.createElement("button");
					const isSel = curCloak === clk.id;
					btn.className = `p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all ${
						isSel ? 'selected-item bg-indigo-500/20 border-2 border-indigo-400 text-white shadow-lg font-bold' : 'bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
					}`;
					btn.innerHTML = `<div class="flex items-center gap-2"><span>🎭</span><span>${clk.label}</span></div>${isSel ? '<i class="fa-solid fa-circle-check text-indigo-300 text-xs"></i>' : ''}`;
					btn.onclick = () => {
						store.tabCloak = clk.id;
						if (window.applyTabCloak) window.applyTabCloak(clk.id, store.customCloakTitle, store.customCloakIcon);
						renderInternalPageView(tabObj, targetUrl);
					};
					cloaksGrid.appendChild(btn);
				});
				cloakSec.appendChild(cloaksGrid);

				const cloakActions = document.createElement("div");
				cloakActions.className = "flex items-center gap-3 pt-2 border-t border-white/10 flex-wrap";
				cloakActions.innerHTML = `
					<button id="about_blank_btn" class="px-4 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors">
						<span>↗️</span><span>Open in About:Blank</span>
					</button>
					<button id="blob_cloak_btn" class="px-4 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900 border border-sky-500/40 text-sky-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors">
						<span>🧊</span><span>Open in Blob Cloak</span>
					</button>
				`;
				cloakSec.appendChild(cloakActions);
				setTimeout(() => {
					const abBtn = cloakSec.querySelector("#about_blank_btn");
					const blBtn = cloakSec.querySelector("#blob_cloak_btn");
					if (abBtn) abBtn.onclick = () => { if (window.openAboutBlankCloak) window.openAboutBlankCloak(); };
					if (blBtn) blBtn.onclick = () => { if (window.openBlobCloak) window.openBlobCloak(); };
				}, 10);
				settingsWrap.appendChild(cloakSec);

				const systemModalBtn = document.createElement("button");
				systemModalBtn.className = "w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:opacity-90 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer";
				systemModalBtn.innerHTML = `<span>⚙️</span><span>Open VeilOS System Settings Dialog</span>`;
				systemModalBtn.onclick = () => {
					window.openSettingsModal();
				};
				settingsWrap.appendChild(systemModalBtn);

				contentArea.appendChild(settingsWrap);
			}

			container.appendChild(contentArea);
		};

		const loadTabUrl = (tabObj, rawTarget) => {
			let target = formatUrl(rawTarget || "https://google.com");
			if (target === "onyx://changelog" || target === "spade://changelog" || target === "veil://changelog") {
				if (osInstance && osInstance.openApp) {
					osInstance.openApp("changelog");
				}
				target = "onyx://newtab";
			}
			tabObj.url = target;
			tabObj.title = getTitleFromUrl(target);

			if (target.startsWith("onyx://") || target.startsWith("spade://") || target.startsWith("veil://")) {
				if (tabObj.frameObj && tabObj.frameObj.frame) {
					tabObj.frameObj.frame.style.visibility = "hidden";
					tabObj.frameObj.frame.style.pointerEvents = "none";
					tabObj.frameObj.frame.style.position = "absolute";
				}
				if (!tabObj.internalEl) {
					tabObj.internalEl = document.createElement("div");
					tabObj.internalEl.className = "w-full h-full bg-[#09090b] text-white overflow-y-auto custom-scrollbar select-text";
					tabObj.tabEl.appendChild(tabObj.internalEl);
				}
				tabObj.internalEl.style.display = "block";
				renderInternalPageView(tabObj, target);
				addHistory(tabObj.title, target);
				if (win.customState.activeTabId === tabObj.id) {
					syncActiveTabUrl(target);
				}
				renderTabStrip();
				return;
			}

			if (tabObj.internalEl) {
				tabObj.internalEl.style.display = "none";
			}
			if (tabObj.errorEl) {
				tabObj.errorEl.style.display = "none";
			}
			if (tabObj.frameObj && tabObj.frameObj.frame) {
				tabObj.frameObj.frame.style.visibility = "visible";
				tabObj.frameObj.frame.style.pointerEvents = "auto";
				tabObj.frameObj.frame.style.position = "";
			}

			const isExtensionPage = target.includes("/~/sx/") || target.startsWith("chrome-extension://") || target.startsWith("moz-extension://") || target.includes(".sapphire-extension.invalid");
			if (isExtensionPage) {
				let extId = null;
				let pagePath = "popup.html";
				if (target.startsWith("chrome-extension://") || target.startsWith("moz-extension://")) {
					const parts = target.replace(/^(chrome|moz)-extension:\/\//, "").split("/");
					extId = parts[0];
					pagePath = parts.slice(1).join("/") || "popup.html";
				} else if (target.includes(".sapphire-extension.invalid")) {
					try {
						const u = new URL(target);
						extId = u.hostname.split(".")[0];
						pagePath = u.pathname.replace(/^\/+/, "") || "popup.html";
					} catch (_) {}
				} else {
					const match = target.match(/\/~\/sx\/([^/]+)(?:\/(.*))?/);
					if (match) {
						extId = match[1];
						pagePath = match[2] || "popup.html";
					}
				}
				const displayTarget = normalizeBrowserUrl(target);
				tabObj.attemptedUrl = displayTarget;
				tabObj.url = displayTarget;
				tabObj.title = getTitleFromUrl(displayTarget);
				setTimeout(async () => {
					const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
					if (sEngine && extId) {
						const ext = sEngine.registry?.get ? sEngine.registry.get(extId) : null;
						if (ext) {
							tabObj.title = (ext.manifest?.name || "Extension") + (pagePath && pagePath !== "popup.html" ? ` - ${pagePath.replace(".html", "")}` : " Page");
							renderTabStrip();
						}
					}
					const resolved = sEngine && typeof sEngine.resolveUrl === "function" ? sEngine.resolveUrl(target) : target;
					tabObj.frameObj.go(resolved);
				}, 0);
				addHistory(tabObj.title, displayTarget);
				if (win.customState.activeTabId === tabObj.id) {
					syncActiveTabUrl(displayTarget);
				}
				renderTabStrip();
				return;
			}

			tabObj.frameObj.go(target);
			const cleanTarget = normalizeBrowserUrl(target);
			tabObj.attemptedUrl = cleanTarget;
			tabObj.url = cleanTarget;
			tabObj.title = getTitleFromUrl(cleanTarget);
			addHistory(tabObj.title, cleanTarget);
			if (win.customState.activeTabId === tabObj.id) {
				syncActiveTabUrl(cleanTarget);
			}
			renderTabStrip();
		};

		const showTabError = (tabObj, message, attemptedUrl) => {
			if (!tabObj || !tabObj.errorEl) return;
			const targetUrl = attemptedUrl || tabObj.attemptedUrl || tabObj.url || "https://google.com";
			tabObj.url = targetUrl;
			tabObj.title = getTitleFromUrl(targetUrl);
			if (win.customState.activeTabId === tabObj.id) {
				syncActiveTabUrl(targetUrl);
			}
			renderTabStrip();

			const errorText = message || "Multiplexor task ended: Wisp(MuxTaskEnded). Connection stream terminated.";
			const activeKind = (window.ScramjetHost && window.ScramjetHost.current && window.ScramjetHost.current.transportKind)
				|| (String((typeof store !== "undefined" && store.transport) || "/libcurl/index.mjs").includes("epoxy") ? "epoxy" : "libcurl");
			const alternateTransport = activeKind === "libcurl" ? "/epoxy/index.mjs" : "/libcurl/index.mjs";
			const alternateLabel = activeKind === "libcurl" ? "Try epoxy" : "Try libcurl";

			tabObj.errorEl.innerHTML = `
				<div class="max-w-md w-full bg-[#11131c] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-fade">
					<div class="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl shadow-inner">
						<i class="fa-solid fa-triangle-exclamation"></i>
					</div>
					<div class="flex flex-col gap-1">
						<h3 class="text-base font-bold text-white tracking-tight">Navigation Failed</h3>
						<p class="text-xs text-neutral-400">The proxy stream closed unexpectedly or could not reach destination.</p>
					</div>
					<div class="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-neutral-300 break-all select-all text-left">
						${escapeHtml(targetUrl)}
					</div>
					<div class="w-full p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/20 text-[11px] font-mono text-rose-300 text-left leading-relaxed">
						${escapeHtml(errorText)}
					</div>
					<div class="flex flex-col sm:flex-row gap-2 w-full pt-1">
						<button class="retry-reconnect-btn flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95">
							<i class="fa-solid fa-rotate"></i>
							<span>Reconnect & Retry</span>
						</button>
						<button class="retry-bare-btn py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95">
							<i class="fa-solid fa-shield"></i>
							<span>${alternateLabel}</span>
						</button>
					</div>
				</div>
			`;
			const retryBtn = tabObj.errorEl.querySelector(".retry-reconnect-btn");
			if (retryBtn) {
				retryBtn.onclick = async () => {
					retryBtn.disabled = true;
					retryBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Reconnecting...</span>`;
					if (window.reconnectWispTransport) {
						await window.reconnectWispTransport();
					}
					tabObj.errorEl.style.display = "none";
					if (tabObj.frameObj && tabObj.frameObj.frame) {
						tabObj.frameObj.frame.style.visibility = "visible";
					}
					loadTabUrl(tabObj, targetUrl);
				};
			}
			const bareBtn = tabObj.errorEl.querySelector(".retry-bare-btn");
			if (bareBtn) {
				bareBtn.onclick = async () => {
					bareBtn.disabled = true;
					bareBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Switching...</span>`;
					if (window.applyTransport) {
						await window.applyTransport(alternateTransport);
					}
					tabObj.errorEl.style.display = "none";
					if (tabObj.frameObj && tabObj.frameObj.frame) {
						tabObj.frameObj.frame.style.visibility = "visible";
					}
					loadTabUrl(tabObj, targetUrl);
				};
			}
			tabObj.errorEl.style.display = "flex";
			if (tabObj.frameObj && tabObj.frameObj.frame) {
				tabObj.frameObj.frame.style.visibility = "hidden";
			}
		};

		const createTab = (rawUrl, customTitle) => {
			const tabNumericId = globalNextTabNumericId++;
			const target = formatUrl(rawUrl || "https://google.com");
			const cleanInitial = normalizeBrowserUrl(target);

			const plugins = [];
			if (window.sapphire && window.SapphireContentScriptPlugin) {
				try {
					plugins.push(new window.SapphireContentScriptPlugin(window.sapphire, tabNumericId));
				} catch (e) {
					console.warn("[createTab] Failed to instantiate SapphireContentScriptPlugin:", e);
				}
			} else if (window.ensureSapphire) {
				void window.ensureSapphire().catch(() => {});
			}

			const frame = scramjet.createFrame(undefined, { plugins });
			frame.frame.className = "w-full h-full border-0 outline-none bg-white block";

			const tabEl = document.createElement("div");
			tabEl.className = "w-full h-full absolute inset-0";
			tabEl.style.display = "block";
			tabEl.style.position = "absolute";
			tabEl.style.inset = "0";
			tabEl.style.width = "100%";
			tabEl.style.height = "100%";
			tabEl.style.visibility = "hidden";
			tabEl.style.opacity = "0";
			tabEl.style.pointerEvents = "none";
			tabEl.style.zIndex = "0";
			tabEl.appendChild(frame.frame);

			const errorEl = document.createElement("div");
			errorEl.className = "w-full h-full absolute inset-0 bg-[#090a0f] text-white flex flex-col items-center justify-center p-6 z-20 select-none";
			errorEl.style.display = "none";
			tabEl.appendChild(errorEl);

			const tabObj = {
				id: "tab_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
				numericId: tabNumericId,
				title: customTitle || getTitleFromUrl(cleanInitial),
				url: cleanInitial,
				attemptedUrl: cleanInitial,
				frameObj: frame,
				tabEl: tabEl,
				internalEl: null,
				errorEl: errorEl,
			};

			const handleUrlUpdate = (newUrl) => {
				if (!newUrl || newUrl === "about:blank" || newUrl.startsWith("blob:")) return;
				const cleanUrl = normalizeBrowserUrl(newUrl);
				if ((tabObj.url.startsWith("onyx://") || tabObj.url.startsWith("spade://") || tabObj.url.startsWith("veil://")) && !cleanUrl.startsWith("http")) return;
				if (tabObj.errorEl && tabObj.errorEl.style.display === "flex") return;
				if (tabObj.attemptedUrl && cleanUrl !== tabObj.attemptedUrl && (cleanUrl.includes("google.com") && !tabObj.attemptedUrl.includes("google.com"))) {
					return;
				}
				tabObj.url = cleanUrl;
				tabObj.title = getTitleFromUrl(cleanUrl);
				addHistory(tabObj.title, cleanUrl);
				if (win.customState.activeTabId === tabObj.id) {
					syncActiveTabUrl(cleanUrl);
				}
				renderTabStrip();
			};

			const checkFrameForError = () => {
				try {
					const doc = frame.frame.contentDocument;
					if (doc) {
						const title = (doc.title || "").toLowerCase();
						const text = (doc.body ? doc.body.innerText : "") || "";
						if (text.includes("MuxTaskEnded") || text.includes("Multiplexor task ended") || text.includes("Multiplexor closed") || title.includes("scramjet error") || text.includes("Scramjet Error") || text.includes("Failed to fetch") || text.includes("502 Bad Gateway") || text.includes("500 Internal Server Error")) {
							showTabError(tabObj, text.includes("MuxTaskEnded") ? "Wisp(MuxTaskEnded): Multiplexor task ended. Stream disconnected." : "Scramjet failed to retrieve the requested URL.", tabObj.attemptedUrl);
							return true;
						}
					}
				} catch (err) {}
				return false;
			};

			frame.addEventListener("urlchange", (e) => {
				if (e && e.url) handleUrlUpdate(e.url);
			});
			frame.addEventListener("navigate", (e) => {
				if (e && e.url) handleUrlUpdate(e.url);
			});
			frame.frame.addEventListener("load", () => {
				if (checkFrameForError()) return;
				try {
					const curr = frame.url ? frame.url.href : (frame.client && frame.client.url ? frame.client.url.href : null);
					if (curr) handleUrlUpdate(curr);
				} catch (err) {}
			});

			win.customState.viewportEl.appendChild(tabEl);
			loadTabUrl(tabObj, target);
			setTimeout(() => {
				if (window.sapphire && typeof window.sapphire.notifyTabCreated === "function") {
					window.sapphire.notifyTabCreated(tabNumericId);
				}
			}, 0);
			return tabObj;
		};

		const switchTab = (tabId) => {
			win.customState.activeTabId = tabId;
			win.customState.tabs.forEach(t => {
				if (t.tabEl) {
					const isActive = (t.id === tabId);
					t.tabEl.style.display = "block";
					if (isActive) {
						t.tabEl.style.visibility = "visible";
						t.tabEl.style.opacity = "1";
						t.tabEl.style.pointerEvents = "auto";
						t.tabEl.style.zIndex = "10";
					} else {
						t.tabEl.style.visibility = "hidden";
						t.tabEl.style.opacity = "0";
						t.tabEl.style.pointerEvents = "none";
						t.tabEl.style.zIndex = "0";
					}
				}
			});
			const activeTab = getActiveTab();
			if (activeTab) {
				syncActiveTabUrl(activeTab.url);
				if (window.sapphire && typeof window.sapphire.notifyTabActivated === "function") {
					window.sapphire.notifyTabActivated(activeTab.numericId, win.customState.windowNumericId || 1);
				}
			}
			renderTabStrip();
			renderToolbarExtensions();
		};

		const closeTab = (tabId, e) => {
			if (e) {
				e.stopPropagation();
				e.preventDefault();
			}
			const targetTab = win.customState.tabs.find(t => t.id === tabId);
			if (targetTab) {
				if (window.sapphire && typeof window.sapphire.notifyTabRemoved === "function") {
					window.sapphire.notifyTabRemoved(targetTab.numericId, win.customState.windowNumericId || 1);
				}
				if (targetTab.tabEl) {
					try { targetTab.tabEl.remove(); } catch (err) {}
				}
			}
			win.customState.tabs = win.customState.tabs.filter(t => t.id !== tabId);
			if (win.customState.tabs.length === 0) {
				const freshTab = createTab("onyx://newtab");
				win.customState.tabs.push(freshTab);
				switchTab(freshTab.id);
			} else if (win.customState.activeTabId === tabId) {
				const nextTab = win.customState.tabs[win.customState.tabs.length - 1];
				switchTab(nextTab.id);
			} else {
				renderTabStrip();
			}
		};

		const createNewTab = (rawUrl) => {
			const newTab = createTab(rawUrl || "onyx://newtab");
			win.customState.tabs.push(newTab);
			switchTab(newTab.id);
			urlInput.focus();
		};

		const handleNav = (targetUrl) => {
			if (!targetUrl) return;
			const activeTab = getActiveTab();
			if (!activeTab) return;
			loadTabUrl(activeTab, targetUrl);
		};

		win.customState.createNewTab = createNewTab;
		win.customState.createTab = createTab;
		win.customState.loadTabUrl = loadTabUrl;
		win.customState.switchTab = switchTab;
		win.customState.closeTab = closeTab;
		win.customState.handleNav = handleNav;
		win.customState.hidePopover = hideExtensionPopover;

		const renderTabStrip = () => {
			tabsListContainer.innerHTML = "";
			const activeTab = getActiveTab();

			win.customState.tabs.forEach(tab => {
				const isActive = activeTab && tab.id === activeTab.id;
				const tabDiv = document.createElement("div");
				tabDiv.className = `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none min-w-[120px] max-w-[210px] flex-1 group border relative ${
					isActive 
						? 'bg-neutral-900 text-white font-medium border-white/15 shadow-sm ring-1 ring-white/5' 
						: 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.08] border-transparent'
				}`;
				tabDiv.title = `${tab.title || 'New Tab'} (${tab.url})`;
				tabDiv.onclick = (e) => {
					if (!e.target.closest(".close-btn")) {
						switchTab(tab.id);
					}
				};
				tabDiv.onauxclick = (e) => {
					if (e.button === 1) {
						e.preventDefault();
						closeTab(tab.id, e);
					}
				};

				const globeSpan = document.createElement("span");
				globeSpan.className = "text-xs shrink-0 flex items-center";
				globeSpan.innerHTML = getIconFromUrl(tab.url);

				const titleSpan = document.createElement("span");
				titleSpan.className = "truncate flex-1 text-xs";
				titleSpan.textContent = tab.title || "New Tab";

				const closeBtnEl = document.createElement("button");
				closeBtnEl.className = `close-btn w-4 h-4 rounded-full text-neutral-400 hover:text-white hover:bg-white/20 flex items-center justify-center text-[10px] transition-all shrink-0 cursor-pointer ${
					isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-80 hover:!opacity-100'
				}`;
				closeBtnEl.title = "Close tab (or middle-click)";
				closeBtnEl.innerHTML = '<i class="fa-solid fa-xmark"></i>';
				closeBtnEl.onclick = (e) => {
					closeTab(tab.id, e);
				};

				tabDiv.appendChild(globeSpan);
				tabDiv.appendChild(titleSpan);
				tabDiv.appendChild(closeBtnEl);
				tabsListContainer.appendChild(tabDiv);
			});

			const newTabBtn = document.createElement("button");
			newTabBtn.className = "w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer shrink-0 ml-1 active:scale-95";
			newTabBtn.title = "New Tab";
			newTabBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
			newTabBtn.onclick = () => createNewTab("onyx://newtab");
			tabsListContainer.appendChild(newTabBtn);
			updateTopRightButtonsState();
		};
		win.customState.renderTabStrip = renderTabStrip;

		const renderQuickBookmarks = () => {
			const bms = Array.isArray(store.bookmarks) ? store.bookmarks : [];
			if (win.customState.showQuickBookmarks && bms.length > 0) {
				quickBmBar.style.display = "flex";
				quickBmBar.innerHTML = "";

				const label = document.createElement("span");
				label.className = "text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1";
				label.innerHTML = '<i class="fa-solid fa-bookmark text-amber-400 text-[10px]"></i><span>Bookmarks:</span>';
				quickBmBar.appendChild(label);

				bms.forEach(bm => {
					const bmBtn = document.createElement("button");
					bmBtn.className = "px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-200 hover:text-white border border-white/10 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 text-xs";
					bmBtn.title = bm.url;
					bmBtn.onclick = () => handleNav(bm.url);

					const iconSpan = document.createElement("span");
					iconSpan.className = "flex items-center text-amber-400 text-[11px]";
					iconSpan.innerHTML = bm.icon && bm.icon.startsWith("<i ") ? bm.icon : '<i class="fa-solid fa-star text-amber-400"></i>';

					const nameSpan = document.createElement("span");
					nameSpan.className = "font-medium";
					nameSpan.textContent = bm.name;

					bmBtn.appendChild(iconSpan);
					bmBtn.appendChild(nameSpan);
					quickBmBar.appendChild(bmBtn);
				});
			} else {
				quickBmBar.style.display = "none";
			}
		};

		const updateTopRightButtonsState = () => {
			const activeTab = getActiveTab();
			const activeUrl = (activeTab?.url || "").toLowerCase();
			const isHistory = activeUrl.startsWith("spade://history") || activeUrl.startsWith("veil://history") || activeUrl.startsWith("onyx://history");
			const isExtensionsDrawer = win.customState.activePanel === "extensions";
			const isExtensionsPage = activeUrl.startsWith("spade://extensions") || activeUrl.startsWith("veil://extensions") || activeUrl.startsWith("onyx://extensions");

			extensionsToggleBtn.className = `w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center cursor-pointer ${
				(isExtensionsDrawer || isExtensionsPage) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-transparent'
			}`;

			historyToggleBtn.className = `w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center cursor-pointer ${
				isHistory ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' : 'bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-transparent'
			}`;
		};

		const renderDrawer = () => {
			drawerContainer.innerHTML = "";
			const activePanel = win.customState.activePanel;

			updateTopRightButtonsState();

			if (activePanel === "none") return;

			if (activePanel === "bookmarks") {
				const activeTab = getActiveTab();
				const bms = Array.isArray(store.bookmarks) ? store.bookmarks : [];
				const isCurrBm = activeTab ? isBookmarked(activeTab.url) : false;
				const filterQuery = (win.customState.bookmarkSearch || "").toLowerCase();

				const drawerEl = document.createElement("div");
				drawerEl.className = "w-80 sm:w-96 bg-neutral-900 border-l border-white/15 p-4 flex flex-col gap-3 shrink-0 shadow-2xl z-10 animate-fade overflow-hidden";

				const header = document.createElement("div");
				header.className = "flex items-center justify-between pb-2 border-b border-white/10";
				header.innerHTML = `
					<div class="flex items-center gap-2">
						<span class="text-lg">⭐</span>
						<h3 class="text-sm font-bold text-white">Bookmarks</h3>
					</div>
				`;
				const headerRight = document.createElement("div");
				headerRight.className = "flex items-center gap-1.5";

				const fullPageBtn = document.createElement("button");
				fullPageBtn.className = "px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer";
				fullPageBtn.title = "Open onyx://bookmarks in tab";
				fullPageBtn.innerHTML = `<span>↗</span><span>Full Page</span>`;
				fullPageBtn.onclick = () => {
					handleNav("onyx://bookmarks");
					win.customState.activePanel = "none";
					renderDrawer();
				};

				const closeBtn = document.createElement("button");
				closeBtn.className = "w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs cursor-pointer";
				closeBtn.textContent = "✕";
				closeBtn.onclick = () => {
					win.customState.activePanel = "none";
					renderDrawer();
				};
				headerRight.appendChild(fullPageBtn);
				headerRight.appendChild(closeBtn);
				header.appendChild(headerRight);
				drawerEl.appendChild(header);

				const addCurrBtn = document.createElement("button");
				addCurrBtn.className = "w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer";
				addCurrBtn.innerHTML = `<span>${isCurrBm ? '★ Bookmarked' : '☆ Bookmark Current Page'}</span>`;
				addCurrBtn.onclick = () => {
					if (activeTab) {
						toggleBookmark(activeTab.title, activeTab.url);
					}
				};
				drawerEl.appendChild(addCurrBtn);

				const searchInput = document.createElement("input");
				searchInput.className = "w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-400 outline-none focus:border-amber-400";
				searchInput.placeholder = "Search bookmarks...";
				searchInput.value = win.customState.bookmarkSearch || "";
				searchInput.oninput = (e) => {
					win.customState.bookmarkSearch = e.target.value;
					renderDrawer();
				};
				drawerEl.appendChild(searchInput);

				const listEl = document.createElement("div");
				listEl.className = "flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar";

				const filtered = bms.filter(b => !filterQuery || b.name.toLowerCase().includes(filterQuery) || b.url.toLowerCase().includes(filterQuery));

				filtered.forEach(bm => {
					const itemDiv = document.createElement("div");
					itemDiv.className = "group flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors";

					const infoDiv = document.createElement("div");
					infoDiv.className = "flex flex-col min-w-0 flex-1 cursor-pointer pr-2";
					infoDiv.innerHTML = `
						<div class="flex items-center gap-1.5">
							<span class="text-xs">${bm.icon || '⭐'}</span>
							<span class="text-xs font-bold text-white truncate">${bm.name}</span>
						</div>
						<span class="text-[10px] font-mono text-neutral-400 truncate mt-0.5">${bm.url}</span>
					`;
					infoDiv.onclick = () => {
						handleNav(bm.url);
						win.customState.activePanel = "none";
						renderDrawer();
					};

					const actionsDiv = document.createElement("div");
					actionsDiv.className = "flex items-center gap-1";

					const openNewTabBtn = document.createElement("button");
					openNewTabBtn.className = "w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs flex items-center justify-center cursor-pointer";
					openNewTabBtn.title = "Open in new tab";
					openNewTabBtn.textContent = "↗";
					openNewTabBtn.onclick = () => {
						createNewTab(bm.url);
						win.customState.activePanel = "none";
						renderDrawer();
					};

					const deleteBtn = document.createElement("button");
					deleteBtn.className = "w-6 h-6 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs flex items-center justify-center cursor-pointer";
					deleteBtn.title = "Delete Bookmark";
					deleteBtn.textContent = "🗑️";
					deleteBtn.onclick = () => {
						store.bookmarks = bms.filter(b => b.id !== bm.id);
						syncActiveTabUrl(activeTab ? activeTab.url : "");
						renderQuickBookmarks();
						renderDrawer();
					};

					actionsDiv.appendChild(openNewTabBtn);
					actionsDiv.appendChild(deleteBtn);

					itemDiv.appendChild(infoDiv);
					itemDiv.appendChild(actionsDiv);
					listEl.appendChild(itemDiv);
				});

				if (filtered.length === 0) {
					const emptyDiv = document.createElement("div");
					emptyDiv.className = "text-center text-xs text-neutral-500 py-8";
					emptyDiv.textContent = bms.length === 0 ? "No saved bookmarks yet." : "No matching bookmarks found.";
					listEl.appendChild(emptyDiv);
				}

				drawerEl.appendChild(listEl);
				drawerContainer.appendChild(drawerEl);
			} else if (activePanel === "history") {
				const hists = Array.isArray(store.history) ? store.history : [];
				const filterQuery = (win.customState.historySearch || "").toLowerCase();

				const drawerEl = document.createElement("div");
				drawerEl.className = "w-80 sm:w-96 bg-neutral-900 border-l border-white/15 p-4 flex flex-col gap-3 shrink-0 shadow-2xl z-10 animate-fade overflow-hidden";

				const header = document.createElement("div");
				header.className = "flex items-center justify-between pb-2 border-b border-white/10";
				header.innerHTML = `
					<div class="flex items-center gap-2">
						<span class="text-lg">🕒</span>
						<h3 class="text-sm font-bold text-white">History</h3>
					</div>
				`;
				const headerRight = document.createElement("div");
				headerRight.className = "flex items-center gap-1.5";

				const fullPageBtn = document.createElement("button");
				fullPageBtn.className = "px-2 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer";
				fullPageBtn.title = "Open onyx://history in tab";
				fullPageBtn.innerHTML = `<span>↗</span><span>Full Page</span>`;
				fullPageBtn.onclick = () => {
					handleNav("onyx://history");
					win.customState.activePanel = "none";
					renderDrawer();
				};

				const closeBtn = document.createElement("button");
				closeBtn.className = "w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs cursor-pointer";
				closeBtn.textContent = "✕";
				closeBtn.onclick = () => {
					win.customState.activePanel = "none";
					renderDrawer();
				};
				headerRight.appendChild(fullPageBtn);
				headerRight.appendChild(closeBtn);
				header.appendChild(headerRight);
				drawerEl.appendChild(header);

				const clearBtn = document.createElement("button");
				clearBtn.className = "w-full py-1.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer";
				clearBtn.innerHTML = `<span>🗑️</span><span>Clear All History</span>`;
				clearBtn.onclick = () => {
					store.history = [];
					renderDrawer();
				};
				drawerEl.appendChild(clearBtn);

				const searchInput = document.createElement("input");
				searchInput.className = "w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-400 outline-none focus:border-purple-400";
				searchInput.placeholder = "Search history...";
				searchInput.value = win.customState.historySearch || "";
				searchInput.oninput = (e) => {
					win.customState.historySearch = e.target.value;
					renderDrawer();
				};
				drawerEl.appendChild(searchInput);

				const listEl = document.createElement("div");
				listEl.className = "flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar";

				const filtered = hists.filter(h => !filterQuery || h.name.toLowerCase().includes(filterQuery) || h.url.toLowerCase().includes(filterQuery));

				filtered.forEach(item => {
					const itemDiv = document.createElement("div");
					itemDiv.className = "group flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors";

					const timeStr = new Date(item.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

					const infoDiv = document.createElement("div");
					infoDiv.className = "flex flex-col min-w-0 flex-1 cursor-pointer pr-2";
					infoDiv.innerHTML = `
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs font-bold text-white truncate">${item.name}</span>
							<span class="text-[9px] text-neutral-400 font-mono whitespace-nowrap">${timeStr}</span>
						</div>
						<span class="text-[10px] font-mono text-neutral-400 truncate mt-0.5">${item.url}</span>
					`;
					infoDiv.onclick = () => {
						handleNav(item.url);
						win.customState.activePanel = "none";
						renderDrawer();
					};

					const actionsDiv = document.createElement("div");
					actionsDiv.className = "flex items-center gap-1";

					const openNewTabBtn = document.createElement("button");
					openNewTabBtn.className = "w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs flex items-center justify-center cursor-pointer";
					openNewTabBtn.title = "Open in new tab";
					openNewTabBtn.textContent = "↗";
					openNewTabBtn.onclick = () => {
						createNewTab(item.url);
						win.customState.activePanel = "none";
						renderDrawer();
					};

					const deleteBtn = document.createElement("button");
					deleteBtn.className = "w-6 h-6 rounded-lg bg-white/5 hover:bg-white/20 text-neutral-400 hover:text-white text-xs flex items-center justify-center cursor-pointer";
					deleteBtn.title = "Remove from History";
					deleteBtn.textContent = "✕";
					deleteBtn.onclick = () => {
						store.history = hists.filter(i => i.id !== item.id);
						renderDrawer();
					};

					actionsDiv.appendChild(openNewTabBtn);
					actionsDiv.appendChild(deleteBtn);

					itemDiv.appendChild(infoDiv);
					itemDiv.appendChild(actionsDiv);
					listEl.appendChild(itemDiv);
				});

				if (filtered.length === 0) {
					const emptyDiv = document.createElement("div");
					emptyDiv.className = "text-center text-xs text-neutral-500 py-8";
					emptyDiv.textContent = hists.length === 0 ? "No browsing history yet." : "No matching history found.";
					listEl.appendChild(emptyDiv);
				}

				drawerEl.appendChild(listEl);
				drawerContainer.appendChild(drawerEl);
			} else if (activePanel === "extensions") {
				if (!window.sapphire && window.ensureSapphire) {
					window.ensureSapphire()
						.then(() => {
							if (win.customState.activePanel === "extensions") {
								renderDrawer();
							}
						})
						.catch(() => {});
				}
				const exts = window.sapphire ? window.sapphire.getInstalledExtensions() : [];
				const filterQuery = (win.customState.extensionSearch || "").toLowerCase();

				const drawerEl = document.createElement("div");
				drawerEl.className = "w-80 sm:w-96 bg-neutral-900 border-l border-white/15 p-4 flex flex-col gap-3 shrink-0 shadow-2xl z-10 animate-fade overflow-hidden";

				const header = document.createElement("div");
				header.className = "flex items-center justify-between pb-2 border-b border-white/10";
				header.innerHTML = `
					<div class="flex items-center gap-2">
						<span class="text-lg">🧩</span>
						<h3 class="text-sm font-bold text-white">Extensions</h3>
						<span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">${exts.length}</span>
					</div>
				`;
				const headerRight = document.createElement("div");
				headerRight.className = "flex items-center gap-1.5";

				const fullPageBtn = document.createElement("button");
				fullPageBtn.className = "px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer";
				fullPageBtn.title = "Open onyx://extensions in tab";
				fullPageBtn.innerHTML = `<span>↗</span><span>Full Page</span>`;
				fullPageBtn.onclick = () => {
					handleNav("onyx://extensions");
					win.customState.activePanel = "none";
					renderDrawer();
				};

				const closeBtn = document.createElement("button");
				closeBtn.className = "w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs cursor-pointer";
				closeBtn.textContent = "✕";
				closeBtn.onclick = () => {
					win.customState.activePanel = "none";
					renderDrawer();
				};
				headerRight.appendChild(fullPageBtn);
				headerRight.appendChild(closeBtn);
				header.appendChild(headerRight);
				drawerEl.appendChild(header);

				const drawerTab = win.customState.drawerExtensionTab || (exts.length ? "installed" : "store");
				const tabsRow = document.createElement("div");
				tabsRow.className = "flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10";

				const makeDrawerTabBtn = (tabId, label, icon, badge) => {
					const btn = document.createElement("button");
					const isCur = drawerTab === tabId;
					btn.className = `flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
						isCur
							? "bg-emerald-600 text-white shadow-sm"
							: "text-neutral-400 hover:text-white hover:bg-white/5"
					}`;
					btn.innerHTML = `<span>${icon}</span><span>${label}</span>${
						badge !== undefined
							? `<span class="px-1.5 py-0.2 rounded-full text-[9px] ${isCur ? 'bg-white/20 text-white' : 'bg-white/10 text-neutral-400'}">${badge}</span>`
							: ""
					}`;
					btn.onclick = () => {
						win.customState.drawerExtensionTab = tabId;
						renderDrawer();
					};
					return btn;
				};

				tabsRow.appendChild(makeDrawerTabBtn("store", "Store", "🛒"));
				tabsRow.appendChild(makeDrawerTabBtn("installed", "Installed", "🧩", exts.length));
				tabsRow.appendChild(makeDrawerTabBtn("upload", "Upload", "📦"));
				drawerEl.appendChild(tabsRow);

				if (drawerTab === "store") {
					const storeBox = document.createElement("div");
					storeBox.className = "flex flex-col gap-3 flex-1 overflow-hidden";

					const searchWrap = document.createElement("div");
					searchWrap.className = "flex items-center gap-1.5";

					const storeInput = document.createElement("input");
					storeInput.className = "flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-400 outline-none focus:border-emerald-400";
					storeInput.placeholder = "Search Web Store or paste ID...";
					storeInput.value = win.customState.drawerStoreQuery || "";

					const storeSearchBtn = document.createElement("button");
					storeSearchBtn.className = "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0";
					storeSearchBtn.innerHTML = `<span>🔍</span>`;

					searchWrap.appendChild(storeInput);
					searchWrap.appendChild(storeSearchBtn);
					storeBox.appendChild(searchWrap);

					const storeResultsList = document.createElement("div");
					storeResultsList.className = "flex flex-col gap-2.5 flex-1 overflow-y-auto custom-scrollbar";
					storeBox.appendChild(storeResultsList);

					const queryStore = async (q) => {
						const query = (q !== undefined ? q : storeInput.value).trim();
						win.customState.drawerStoreQuery = query;

						storeResultsList.innerHTML = `
							<div class="py-8 flex flex-col items-center justify-center text-center text-xs text-neutral-400">
								<span class="animate-spin text-lg mb-2">⏳</span>
								<span>Searching Chrome Web Store...</span>
							</div>
						`;

						try {
							const res = await safeApiFetch(`/api/webstore/search?q=${encodeURIComponent(query || "popular")}`);
							if (!res.ok) throw new Error(`HTTP ${res.status}`);
							const data = await res.json();
							renderDrawerStoreItems(data.results || []);
						} catch (e) {
							storeResultsList.innerHTML = `
								<div class="py-6 text-center text-xs text-rose-400">
									Failed to load extensions from Web Store.
								</div>
							`;
						}
					};

					const renderDrawerStoreItems = (items) => {
						storeResultsList.innerHTML = "";
						if (items.length === 0) {
							storeResultsList.innerHTML = `
								<div class="py-8 text-center text-xs text-neutral-500">
									No extensions found.
								</div>
							`;
							return;
						}

						items.forEach(item => {
							const isInstalled = exts.some(e => e.id === item.id || (e.name && item.name && e.name.toLowerCase() === item.name.toLowerCase()));
							const card = document.createElement("div");
							card.className = "p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2 shadow-sm";

							const top = document.createElement("div");
							top.className = "flex items-start justify-between gap-2";

							const iconHtml = item.icon
								? `<img src="${item.icon}" class="w-8 h-8 rounded-lg object-contain bg-black/40 p-1 border border-white/10 shrink-0" onerror="this.src='';this.className='hidden'" />`
								: `<div class="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-500/20">${item.name.charAt(0)}</div>`;

							const info = document.createElement("div");
							info.className = "flex flex-col min-w-0 flex-1";
							info.innerHTML = `
								<span class="text-xs font-bold text-white truncate" title="${item.name}">${item.name}</span>
								<div class="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium mt-0.5">
									<span>${item.rating ? '★ ' + item.rating : 'Chrome Extension'}</span>
									${item.users ? `<span class="text-neutral-400 font-mono">👥 ${item.users >= 1000000 ? (item.users / 1000000).toFixed(0) + 'M' : (item.users / 1000).toFixed(0) + 'k'}</span>` : ""}
								</div>
							`;

							top.innerHTML = iconHtml;
							top.appendChild(info);

							if (isInstalled) {
								const instSpan = document.createElement("span");
								instSpan.className = "text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shrink-0";
								instSpan.textContent = "✓ Installed";
								top.appendChild(instSpan);
							} else {
								const instBtn = document.createElement("button");
								instBtn.className = "px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shrink-0 cursor-pointer shadow-sm";
								instBtn.innerHTML = `<span>➕</span><span>Install</span>`;

								instBtn.onclick = async () => {
									instBtn.disabled = true;
									instBtn.className = "px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-[10px] font-bold shrink-0 cursor-wait";
									instBtn.innerHTML = `<span class="animate-spin">⏳</span><span>Installing...</span>`;

									try {
										const dl = await safeApiFetch(`/api/webstore/download?id=${encodeURIComponent(item.id)}`);
										if (!dl.ok) throw new Error(`Download failed`);
										let buffer = await dl.arrayBuffer();
										if (window.normalizeExtensionBuffer) {
											buffer = await window.normalizeExtensionBuffer(buffer, `${item.id}.crx`);
										}
										const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire() : null);
										if (!sEngine || typeof sEngine.installExtension !== "function") {
											throw new Error("Sapphire extension engine is not ready.");
										}
										await sEngine.installExtension(buffer, `${item.id}.crx`);
										instBtn.className = "px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0";
										instBtn.innerHTML = `<span>✓</span><span>Installed</span>`;
										if (typeof win.customState.renderToolbarExtensions === "function") {
											win.customState.renderToolbarExtensions();
										}
										setTimeout(() => renderDrawer(), 800);
									} catch (err) {
										alert(`Failed to install ${item.name}: ${err.message}`);
										instBtn.disabled = false;
										instBtn.className = "px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold shrink-0 cursor-pointer";
										instBtn.textContent = "Retry";
									}
								};
								top.appendChild(instBtn);
							}

							card.appendChild(top);
							if (item.description) {
								const desc = document.createElement("p");
								desc.className = "text-[11px] text-neutral-300 line-clamp-2 leading-tight";
								desc.textContent = item.description;
								card.appendChild(desc);
							}
							storeResultsList.appendChild(card);
						});
					};

					storeSearchBtn.onclick = () => queryStore();
					storeInput.onkeydown = (e) => {
						if (e.key === "Enter") queryStore();
					};

					const fullStoreLink = document.createElement("button");
					fullStoreLink.className = "w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 mt-auto";
					fullStoreLink.innerHTML = `<span>🛒</span><span>Open Full Chrome Web Store ↗</span>`;
					fullStoreLink.onclick = () => {
						win.customState.extensionPageTab = "store";
						handleNav("onyx://extensions");
						win.customState.activePanel = "none";
						renderDrawer();
					};
					storeBox.appendChild(fullStoreLink);

					drawerEl.appendChild(storeBox);
					queryStore(win.customState.drawerStoreQuery || "popular");
				}

				else if (drawerTab === "installed") {
					const searchInput = document.createElement("input");
					searchInput.className = "w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-400 outline-none focus:border-emerald-400";
					searchInput.placeholder = "Search installed extensions...";
					searchInput.value = win.customState.extensionSearch || "";
					searchInput.oninput = (e) => {
						win.customState.extensionSearch = e.target.value;
						renderDrawer();
					};
					drawerEl.appendChild(searchInput);

					const listEl = document.createElement("div");
					listEl.className = "flex flex-col gap-2.5 flex-1 overflow-y-auto custom-scrollbar";

					const filtered = exts.filter((ex) => !filterQuery || (ex.name && ex.name.toLowerCase().includes(filterQuery)) || (ex.id && ex.id.toLowerCase().includes(filterQuery)));

					filtered.forEach((ext) => {
						const itemDiv = document.createElement("div");
						itemDiv.className = `flex flex-col gap-2 p-3 rounded-xl border transition-colors ${
							ext.enabled ? 'bg-white/5 border-white/15' : 'bg-black/30 border-white/5 opacity-60'
						}`;

						const topRow = document.createElement("div");
						topRow.className = "flex items-start justify-between gap-2";

						const infoDiv = document.createElement("div");
						infoDiv.className = "flex items-center gap-2.5 min-w-0 flex-1";

						const iconEl = ext.iconUrl
							? `<img src="${ext.iconUrl}" class="w-7 h-7 rounded object-contain shrink-0 bg-black/40 p-0.5 border border-white/10" />`
							: `<div class="w-7 h-7 rounded bg-emerald-600/30 text-emerald-200 flex items-center justify-center text-sm shrink-0 border border-emerald-400/20">🧩</div>`;

						infoDiv.innerHTML = `
							${iconEl}
							<div class="flex flex-col min-w-0 flex-1">
								<div class="flex items-center gap-1.5">
									<span class="text-xs font-bold text-white truncate">${ext.name || 'Extension'}</span>
									${ext.version ? `<span class="text-[9px] text-neutral-400 font-mono">v${ext.version}</span>` : ''}
								</div>
								<span class="text-[10px] font-mono text-neutral-400 truncate">${ext.id.substring(0, 16)}...</span>
							</div>
						`;

						const toggleLabel = document.createElement("label");
						toggleLabel.className = "relative inline-flex items-center cursor-pointer shrink-0";
						const toggleInput = document.createElement("input");
						toggleInput.type = "checkbox";
						toggleInput.checked = Boolean(ext.enabled);
						toggleInput.className = "sr-only peer";
						toggleInput.onchange = async (e) => {
							const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
							if (sEngine) {
								await sEngine.setExtensionEnabled(ext.id, e.target.checked);
								renderDrawer();
								if (typeof win.customState.renderToolbarExtensions === "function") {
									win.customState.renderToolbarExtensions();
								}
							}
						};
						const toggleBg = document.createElement("div");
						toggleBg.className = "w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600";
						toggleLabel.appendChild(toggleInput);
						toggleLabel.appendChild(toggleBg);

						topRow.appendChild(infoDiv);
						topRow.appendChild(toggleLabel);
						itemDiv.appendChild(topRow);

						if (ext.manifest?.description) {
							const descEl = document.createElement("div");
							descEl.className = "text-[11px] text-neutral-300 line-clamp-2";
							descEl.textContent = ext.manifest.description;
							itemDiv.appendChild(descEl);
						}

						const bottomRow = document.createElement("div");
						bottomRow.className = "flex items-center justify-between pt-1 border-t border-white/5 text-[10px]";

						const leftActions = document.createElement("div");
						leftActions.className = "flex items-center gap-1.5";

						if (ext.hasPopup) {
							const popupBtn = document.createElement("button");
							popupBtn.className = "px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium transition-colors flex items-center gap-1 cursor-pointer";
							popupBtn.innerHTML = `<span>🪄</span><span>Popup</span>`;
							popupBtn.onclick = async () => {
								try {
									const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
									if (!sEngine) return;
									const page = typeof sEngine.getExtensionPopupPage === "function" ? sEngine.getExtensionPopupPage(ext.id) : null;
									const popupUrl = ext.popupUrl || (page && typeof sEngine.extensionUrl === "function" ? sEngine.extensionUrl(ext.id, page) : null);
									if (typeof win.customState.showExtensionPopover === "function") {
										win.customState.showExtensionPopover(ext.id, popupUrl);
									} else if (popupUrl) {
										createNewTab(popupUrl);
									}
									win.customState.activePanel = "none";
									renderDrawer();
								} catch (popupErr) {
									console.error("[ExtensionPopup] Failed to open popup:", popupErr);
								}
							};
							leftActions.appendChild(popupBtn);
						}

						const uninstallBtn = document.createElement("button");
						uninstallBtn.className = "px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium transition-colors flex items-center gap-1 cursor-pointer ml-auto";
						uninstallBtn.innerHTML = `<span>🗑️</span><span>Remove</span>`;
						uninstallBtn.onclick = async () => {
							if (confirm(`Remove extension "${ext.name}"?`)) {
								const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
								if (sEngine) {
									await sEngine.uninstallExtension(ext.id);
									renderDrawer();
									if (typeof win.customState.renderToolbarExtensions === "function") {
										win.customState.renderToolbarExtensions();
									}
								}
							}
						};

						bottomRow.appendChild(leftActions);
						bottomRow.appendChild(uninstallBtn);
						itemDiv.appendChild(bottomRow);

						listEl.appendChild(itemDiv);
					});

					if (filtered.length === 0) {
						const emptyDiv = document.createElement("div");
						emptyDiv.className = "text-center text-xs text-neutral-500 py-8 flex flex-col items-center gap-2";
						emptyDiv.innerHTML = `
							<span>${exts.length === 0 ? "No extensions installed yet." : "No matching extensions found."}</span>
							<button class="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 text-xs font-bold hover:bg-emerald-600/50 transition-all cursor-pointer" id="drawer-empty-store-btn">
								Browse Chrome Web Store
							</button>
						`;
						const btn = emptyDiv.querySelector("#drawer-empty-store-btn");
						if (btn) btn.onclick = () => {
							win.customState.drawerExtensionTab = "store";
							renderDrawer();
						};
						listEl.appendChild(emptyDiv);
					}

					drawerEl.appendChild(listEl);
				}

				else if (drawerTab === "upload") {
					const installBox = document.createElement("div");
					installBox.className = "p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col gap-2";

					const installTitle = document.createElement("div");
					installTitle.className = "text-xs font-semibold text-emerald-200 flex items-center gap-1.5";
					installTitle.innerHTML = `<span>📦</span><span>Upload Archive (.CRX or .ZIP)</span>`;

					const fileInput = document.createElement("input");
					fileInput.type = "file";
					fileInput.accept = ".crx,.zip";
					fileInput.className = "hidden";

					const uploadBtn = document.createElement("button");
					uploadBtn.className = "w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer";
					uploadBtn.innerHTML = `<span>📂</span><span>Select Extension File</span>`;

					const dropZone = document.createElement("div");
					dropZone.className = "border border-dashed border-emerald-400/40 hover:border-emerald-300 rounded-lg p-3 text-center text-[11px] text-emerald-300/80 hover:text-emerald-200 transition-colors cursor-pointer";
					dropZone.textContent = "or drag & drop extension archive here";

					const statusMsg = document.createElement("div");
					statusMsg.className = "text-[11px] text-neutral-400 hidden";

					const handleExtFile = async (file) => {
						if (!file) return;
						const sEngine = window.sapphire || (window.ensureSapphire ? await window.ensureSapphire().catch(() => null) : null);
						if (!sEngine || typeof sEngine.installExtension !== "function") {
							alert("Extensions engine is not ready.");
							return;
						}
						statusMsg.className = "text-[11px] text-emerald-300 flex items-center gap-1.5";
						statusMsg.innerHTML = `<span class="animate-spin">⏳</span><span>Installing ${file.name}...</span>`;
						statusMsg.classList.remove("hidden");
						try {
							let buffer = await file.arrayBuffer();
							if (window.normalizeExtensionBuffer) {
								buffer = await window.normalizeExtensionBuffer(buffer, file.name);
							}
							await sEngine.installExtension(buffer, file.name);
							statusMsg.className = "text-[11px] text-emerald-400 flex items-center gap-1.5";
							statusMsg.innerHTML = `<span>✓</span><span>Successfully installed extension!</span>`;
							if (typeof win.customState.renderToolbarExtensions === "function") {
								win.customState.renderToolbarExtensions();
							}
							setTimeout(() => {
								win.customState.drawerExtensionTab = "installed";
								renderDrawer();
							}, 600);
						} catch (err) {
							console.error("[Extension Install Error]", err);
							statusMsg.className = "text-[11px] text-rose-400 flex items-center gap-1.5";
							statusMsg.innerHTML = `<span>✕</span><span>Install failed: ${err.message || 'Invalid format'}</span>`;
						}
					};

					uploadBtn.onclick = () => fileInput.click();
					dropZone.onclick = () => fileInput.click();

					fileInput.onchange = (e) => {
						const file = e.target.files && e.target.files[0];
						if (file) handleExtFile(file);
					};

					dropZone.ondragover = (e) => {
						e.preventDefault();
						dropZone.classList.add("bg-emerald-500/20");
					};
					dropZone.ondragleave = () => {
						dropZone.classList.remove("bg-emerald-500/20");
					};
					dropZone.ondrop = (e) => {
						e.preventDefault();
						dropZone.classList.remove("bg-emerald-500/20");
						const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
						if (file) handleExtFile(file);
					};

					installBox.appendChild(installTitle);
					installBox.appendChild(fileInput);
					installBox.appendChild(uploadBtn);
					installBox.appendChild(dropZone);
					installBox.appendChild(statusMsg);
					drawerEl.appendChild(installBox);
				}

				drawerContainer.appendChild(drawerEl);
			}
		};

		urlInput.onkeydown = (e) => {
			if (e.key === "Enter") {
				handleNav(urlInput.value);
			}
		};

		goBtn.onclick = () => {
			handleNav(urlInput.value);
		};

		backBtn.onclick = () => {
			const active = getActiveTab();
			if (active && active.frameObj) active.frameObj.back();
		};

		fwdBtn.onclick = () => {
			const active = getActiveTab();
			if (active && active.frameObj) active.frameObj.forward();
		};

		reloadBtn.onclick = () => {
			const active = getActiveTab();
			if (active && active.frameObj) active.frameObj.reload();
		};

		homeBtn.onclick = () => {
			handleNav("onyx://newtab");
		};

		const toggleBookmark = (title, url) => {
			if (!url) return;
			const list = Array.isArray(store.bookmarks) ? [...store.bookmarks] : [];
			if (isBookmarked(url)) {
				store.bookmarks = list.filter(b => b.url !== url);
			} else {
				const newBm = {
					id: "bm_" + Date.now(),
					name: title || getTitleFromUrl(url),
					url: url,
					icon: "⭐",
					addedAt: Date.now()
				};
				store.bookmarks = [...list, newBm];
			}
			const active = getActiveTab();
			if (active) syncActiveTabUrl(active.url);
			renderQuickBookmarks();
			if (win.customState.activePanel === "bookmarks") {
				renderDrawer();
			}
		};

		starBtn.onclick = () => {
			const active = getActiveTab();
			if (active) {
				toggleBookmark(active.title, active.url);
			}
		};

		extensionsToggleBtn.onclick = () => {
			win.customState.activePanel = win.customState.activePanel === "extensions" ? "none" : "extensions";
			renderDrawer();
		};

		historyToggleBtn.onclick = () => {
			handleNav("onyx://history");
		};


		if (!win.customState.urlPollTimer) {
			win.customState.urlPollTimer = setInterval(() => {
				const active = win.customState.tabs ? win.customState.tabs.find(t => t.id === win.customState.activeTabId) : null;
				if (!active || !active.frameObj) return;
				if (active.errorEl && active.errorEl.style.display === "flex") return;
				try {
					const curr = active.frameObj.url?.href;
					if (curr && curr !== "about:blank" && !curr.startsWith("blob:")) {
						const cleanCurr = normalizeBrowserUrl(curr);
						if (active.attemptedUrl && cleanCurr !== active.attemptedUrl && (cleanCurr.includes("google.com") && !active.attemptedUrl.includes("google.com"))) {
							return;
						}
						if (cleanCurr && cleanCurr !== active.url) {
							active.url = cleanCurr;
							active.title = getTitleFromUrl(cleanCurr);
							syncActiveTabUrl(cleanCurr);
							renderTabStrip();
						}
					}
				} catch (e) {}
			}, 600);
		}

		if (win.customState.url && win.customState.url !== win.customState.lastOpenedUrl) {
			win.customState.lastOpenedUrl = win.customState.url;
			const newTab = createTab(win.customState.url, win.title);
			win.customState.tabs.push(newTab);
			win.customState.activeTabId = newTab.id;
		}

		if (win.customState.tabs.length === 0) {
			const defaultTab = createTab(store.url || "onyx://newtab");
			win.customState.tabs.push(defaultTab);
			win.customState.activeTabId = defaultTab.id;
		}

		switchTab(win.customState.activeTabId);
		renderQuickBookmarks();
		renderDrawer();
		renderToolbarExtensions();

		win.customState.rootEl = browserRoot;
		return browserRoot;
	}

	const appRoot = document.getElementById("app");
	try {
		appRoot.replaceWith(h(VeilOS));
	} catch (e) {
		appRoot.replaceWith(document.createTextNode("" + e));
		throw e;
	}
});
