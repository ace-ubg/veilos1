const defaultBookmarks = [
	{ id: "bm1", name: "Google", url: "https://google.com", icon: "🔍", addedAt: Date.now() },
	{ id: "bm2", name: "YouTube", url: "https://youtube.com", icon: "📺", addedAt: Date.now() },
	{ id: "bm3", name: "GitHub", url: "https://github.com", icon: "💻", addedAt: Date.now() },
	{ id: "bm4", name: "Wikipedia", url: "https://wikipedia.org", icon: "📖", addedAt: Date.now() },
	{ id: "bm5", name: "Reddit", url: "https://reddit.com", icon: "💬", addedAt: Date.now() },
	{ id: "bm6", name: "Discord", url: "https://discord.com", icon: "🎙️", addedAt: Date.now() }
];

const SPADE_VERSION = "v0.9.1";
if (typeof window !== "undefined") {
	window.SPADE_VERSION = SPADE_VERSION;
	window.VEIL_VERSION = SPADE_VERSION;
}

const TAB_CLOAK_PRESETS = [
	{ id: "spade", name: "SpadeOS (Default)", title: "SpadeOS", icon: "assets/spadeos-emblem.jpg" },
	{ id: "google", name: "Google", title: "Google", icon: "https://www.google.com/favicon.ico" },
	{ id: "classroom", name: "Google Classroom", title: "Classes", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
	{ id: "drive", name: "Google Drive", title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png" },
	{ id: "docs", name: "Google Docs", title: "Google Docs", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" },
	{ id: "canvas", name: "Canvas LMS", title: "Canvas", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
	{ id: "desmos", name: "Desmos Calculator", title: "Desmos | Graphing Calculator", icon: "https://www.desmos.com/favicon.ico" },
	{ id: "khan", name: "Khan Academy", title: "Dashboard | Khan Academy", icon: "https://www.khanacademy.org/favicon.ico" },
	{ id: "wikipedia", name: "Wikipedia", title: "Wikipedia", icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico" },
	{ id: "youtube", name: "YouTube", title: "YouTube", icon: "https://www.youtube.com/s/desktop/f2a33f38/img/favicon.ico" },
	{ id: "custom", name: "Custom Tab Cloak", title: "", icon: "" }
];

if (typeof window !== "undefined") {
	window.TAB_CLOAK_PRESETS = TAB_CLOAK_PRESETS;
}

const getLocalBare = () => {
	if (typeof location !== "undefined" && location.host) {
		return location.origin + "/bare/";
	}
	return "/bare/";
};

const defaultWisp = (typeof _CONFIG !== "undefined" && _CONFIG && _CONFIG.wispurl) ||
	(typeof window !== "undefined" && window._CONFIG && window._CONFIG.wispurl) ||
	(typeof WISP_URL !== "undefined" ? WISP_URL : ((typeof window !== "undefined" && window.WISP_URL) || "wss://fern.best/wisp/"));

const defaultBare = (typeof _CONFIG !== "undefined" && _CONFIG && _CONFIG.bareurl) ||
	(typeof window !== "undefined" && window._CONFIG && window._CONFIG.bareurl) ||
	getLocalBare();

const defaultNotes = [
	{ id: "note_1", title: "Welcome to SpadeOS", content: "# SpadeOS\n\nWelcome to your web desktop environment.\n\nFeatures:\n- Multi-window desktop manager with SpadeOS Snap\n- Onyx Web Browser with multi-tab workspace\n- Tab Cloaking & disguise presets (Google, Classroom, Drive, Docs, Canvas, Desmos, etc.)\n- Blob & About:blank Stealth\n- Integrated Search (Google, DuckDuckGo, Bing, Brave)\n- Games, Movies, Vault, Music, AI & Chat", updatedAt: Date.now() }
];

try {
	if (typeof localStorage !== "undefined") {
		const rawSettings = localStorage.getItem("settings");
		if (rawSettings !== null) {
			let isValid = false;
			try {
				const parsed = JSON.parse(rawSettings);
				if (parsed && typeof parsed === "object" && parsed["0"] && parsed["0"].values && typeof parsed["0"].values === "object") {
					isValid = true;
				}
			} catch (parseErr) {
				isValid = false;
			}
			if (!isValid) {
				console.warn("[SpadeOS Store] Found corrupted or incompatible settings in localStorage, resetting key.");
				localStorage.removeItem("settings");
			}
		}
	}
} catch (e) {
	console.warn("[SpadeOS Store] Could not access localStorage:", e);
}

const initialSettings = {
	url: "https://google.com",
	wispurl: defaultWisp,
	bareurl: defaultBare,
	proxy: "",
	transport: "/epoxy/index.mjs",
	searchEngine: "google",
	tabCloak: "spade",
	customCloakTitle: "",
	customCloakIcon: "",
	autoAboutBlank: false,
	bookmarks: defaultBookmarks,
	showBookmarksBar: true,
	history: [
		{ id: "h1", name: "Google", url: "https://google.com", visitedAt: Date.now() - 3600000 }
	],
	theme: "default",
	wallpaper: "assets/background.jpg",
	accentColor: "indigo",
	notes: defaultNotes,
	osUsername: "Spade User",
	dockPosition: "bottom",
	soundEffects: true,
	desktopWidgets: true
};

var store;
try {
	if (typeof $store === "function") {
		store = $store(initialSettings, { ident: "settings", backing: "localstorage", autosave: "auto" });
	} else if (typeof $state === "function") {
		store = $state(initialSettings);
	} else {
		store = initialSettings;
	}
} catch (storeErr) {
	console.error("[SpadeOS Store] Error during $store initialization, clearing storage and falling back:", storeErr);
	try {
		if (typeof localStorage !== "undefined") {
			localStorage.removeItem("settings");
		}
	} catch (e) {}

	try {
		if (typeof $store === "function") {
			store = $store(initialSettings, { ident: "settings", backing: "localstorage", autosave: "auto" });
		} else if (typeof $state === "function") {
			store = $state(initialSettings);
		} else {
			store = initialSettings;
		}
	} catch (retryErr) {
		console.error("[SpadeOS Store] Retry failed, using reactive or plain fallback:", retryErr);
		store = (typeof $state === "function") ? $state(initialSettings) : initialSettings;
	}
}

if (!store.wispurl) {
	store.wispurl = defaultWisp;
}
if (!store.bareurl) {
	store.bareurl = defaultBare;
}

if (!store.searchEngine) {
	store.searchEngine = "google";
}
if (!store.tabCloak || store.tabCloak === "default") {
	store.tabCloak = "spade";
}
if (store.autoAboutBlank === undefined) {
	store.autoAboutBlank = false;
}

if (!store.bookmarks || !Array.isArray(store.bookmarks) || store.bookmarks.length === 0) {
	store.bookmarks = defaultBookmarks;
}

try {
	const migrated = localStorage.getItem("spade_clean_migrated_v1");
	if (!migrated) {
		store.theme = "default";
		store.wallpaper = "assets/background.jpg";
		store.accentColor = "indigo";
		if (!store.osUsername || store.osUsername === "Veil User") {
			store.osUsername = "Spade User";
		}
		if (!store.tabCloak || store.tabCloak === "google") {
			store.tabCloak = "spade";
		}
		localStorage.setItem("spade_clean_migrated_v1", "true");
	}
} catch (e) {}

if (!store.theme || store.theme === "vice" || store.theme === "leonida" || store.theme === "halloween" || store.theme === "christmas" || store.theme === "jolly" || store.theme === "spooky") {
	store.theme = "default";
}
if (!store.wallpaper || store.wallpaper === "assets/spadeos-gta6-wallpaper.jpg" || store.wallpaper === "assets/spadeos-lock-backdrop.jpg" || store.wallpaper === "assets/christmas.jpg" || store.wallpaper === "assets/halloween.jpg") {
	store.wallpaper = "assets/background.jpg";
}
if (!store.accentColor || store.accentColor === "vice" || store.accentColor === "orange" || store.accentColor === "red") {
	store.accentColor = "indigo";
}

try {
	const curSavedTheme = localStorage.getItem("spade_user_theme") || localStorage.getItem("veil_user_theme");
	if (curSavedTheme === "vice" || curSavedTheme === "leonida" || curSavedTheme === "christmas" || curSavedTheme === "jolly" || curSavedTheme === "halloween" || curSavedTheme === "spooky") {
		localStorage.setItem("spade_user_theme", "default");
	}
} catch (e) {}

// Global Tab Cloak Helper
function applyTabCloak(presetId, customTitle, customIcon) {
	const presetKey = presetId || store.tabCloak || "spade";
	let title = "SpadeOS";
	let icon = "assets/spadeos-emblem.jpg";

	if (presetKey === "custom") {
		title = customTitle !== undefined ? customTitle : (store.customCloakTitle || "SpadeOS");
		icon = customIcon !== undefined ? customIcon : (store.customCloakIcon || "assets/spadeos-emblem.jpg");
	} else {
		const found = TAB_CLOAK_PRESETS.find(p => p.id === presetKey);
		if (found) {
			title = found.title;
			icon = found.icon;
		}
	}

	if (typeof document !== "undefined") {
		document.title = title || "SpadeOS";
		let link = document.querySelector("link[rel*='icon']");
		if (!link) {
			link = document.createElement("link");
			link.rel = "icon";
			document.head.appendChild(link);
		}
		link.href = icon || "assets/spadeos-emblem.jpg";
	}
	return { title, icon };
}

// Global Cloak Execution Functions
function openAboutBlankCloak(targetUrl) {
	const currentUrl = targetUrl || (typeof window !== "undefined" ? window.location.href : "/");
	const separator = currentUrl.includes("?") ? "&" : "?";
	const frameUrl = currentUrl.includes("cloaked=1") ? currentUrl : `${currentUrl}${separator}cloaked=1`;
	const cloakInfo = applyTabCloak(store.tabCloak, store.customCloakTitle, store.customCloakIcon);
	
	try {
		const win = window.open("about:blank", "_blank");
		if (!win || win.closed) {
			console.warn("[AboutBlank Cloak] Pop-up was blocked by the browser. Please allow pop-ups for this site to use About:Blank Cloak.");
			return false;
		}
		const doc = win.document;
		doc.open();
		doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${cloakInfo.title || "Classes"}</title>
	<link rel="icon" href="${cloakInfo.icon || "https://ssl.gstatic.com/classroom/favicon.png"}">
	<style>
		* { box-sizing: border-box; }
		html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #09090b; }
		iframe { width: 100vw; height: 100vh; border: none; outline: none; margin: 0; padding: 0; display: block; }
	</style>
</head>
<body>
	<iframe name="spade_cloaked_frame" src="${frameUrl}" allow="fullscreen; autoplay; encrypted-media; camera; microphone; clipboard-read; clipboard-write; display-capture; geolocation"></iframe>
</body>
</html>`);
		doc.close();
		return true;
	} catch (e) {
		console.error("[AboutBlank Cloak Error]", e);
		return false;
	}
}

function openBlobCloak(targetUrl) {
	const currentUrl = targetUrl || (typeof window !== "undefined" ? window.location.href : "/");
	const separator = currentUrl.includes("?") ? "&" : "?";
	const frameUrl = currentUrl.includes("cloaked=1") ? currentUrl : `${currentUrl}${separator}cloaked=1`;
	const cloakInfo = applyTabCloak(store.tabCloak, store.customCloakTitle, store.customCloakIcon);

	try {
		const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${cloakInfo.title || "My Drive - Google Drive"}</title>
	<link rel="icon" href="${cloakInfo.icon || "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png"}">
	<style>
		* { box-sizing: border-box; }
		html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #09090b; }
		iframe { width: 100vw; height: 100vh; border: none; outline: none; margin: 0; padding: 0; display: block; }
	</style>
</head>
<body>
	<iframe name="spade_cloaked_frame" src="${frameUrl}" allow="fullscreen; autoplay; encrypted-media; camera; microphone; clipboard-read; clipboard-write; display-capture; geolocation"></iframe>
</body>
</html>`;

		const blob = new Blob([htmlContent], { type: "text/html" });
		const blobUrl = URL.createObjectURL(blob);
		const win = window.open(blobUrl, "_blank");
		if (!win) {
			window.location.href = blobUrl;
		}
		return true;
	} catch (e) {
		console.error("[Blob Cloak Error]", e);
		return false;
	}
}

if (typeof window !== "undefined") {
	window.applyTabCloak = applyTabCloak;
	window.openAboutBlankCloak = openAboutBlankCloak;
	window.openBlobCloak = openBlobCloak;
	
	setTimeout(() => {
		applyTabCloak(store.tabCloak, store.customCloakTitle, store.customCloakIcon);

		const isAuto = Boolean(store.autoAboutBlank) || (typeof localStorage !== "undefined" && (localStorage.getItem("spade_auto_about_blank") === "true" || localStorage.getItem("veil_auto_about_blank") === "true"));
		if (isAuto) {
			const currentHref = window.location.href;
			const isAlreadyInCloak = currentHref.includes("cloaked=1") || window.name === "spade_cloaked_frame" || window.name === "veil_cloaked_frame" || currentHref.startsWith("blob:") || currentHref.includes("about:blank");
			if (!isAlreadyInCloak) {
				try {
					const cloaked = openAboutBlankCloak(currentHref);
					if (cloaked) {
						console.log("[Auto About:Blank] Launched disguised about:blank window.");
						window.location.replace("https://classroom.google.com");
					}
				} catch (err) {
					console.warn("[Auto About:Blank] trigger error:", err);
				}
			}
		}
	}, 100);
}

if (typeof window !== "undefined") {
	window.store = store;
}
if (typeof self !== "undefined") {
	self.store = store;
}
if (typeof globalThis !== "undefined") {
	globalThis.store = store;
}
