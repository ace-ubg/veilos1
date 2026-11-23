
if (navigator.userAgent.includes("Firefox")) {
	Object.defineProperty(globalThis, "crossOriginIsolated", {
		value: true,
		writable: false,
	});
}

importScripts("/safe-postmessage.js");
// Scramjet 2.x: the controller's service worker script registers the RPC
// plumbing and exposes $scramjetController.shouldRoute() / route().
importScripts("/controller/controller.sw.js");

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

const SAPPHIRE_PREFIX = "/~/sx/";
const clientToExtId = new Map();

function getExtIdFromReferrer(referrer) {
	if (!referrer) return null;
	try {
		const refUrl = new URL(referrer);
		if (refUrl.pathname.startsWith(SAPPHIRE_PREFIX)) {
			const rest = refUrl.pathname.slice(SAPPHIRE_PREFIX.length);
			const slash = rest.indexOf("/");
			const extId = slash === -1 ? rest : rest.slice(0, slash);
			return extId || null;
		}
	} catch (e) {}
	return null;
}

function guessMime(path) {
	const ext = (path || "").split(".").pop()?.toLowerCase() || "";
	const map = {
		html: "text/html",
		htm: "text/html",
		js: "application/javascript",
		mjs: "application/javascript",
		css: "text/css",
		json: "application/json",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		svg: "image/svg+xml",
		webp: "image/webp",
		ico: "image/x-icon",
		woff: "font/woff",
		woff2: "font/woff2",
		ttf: "font/ttf",
		wasm: "application/wasm",
	};
	return map[ext] || "application/octet-stream";
}

let sapphireDbPromise = null;
function ensureSapphireStores(db) {
	if (!db.objectStoreNames.contains("extensions")) {
		db.createObjectStore("extensions", { keyPath: "id" });
	}
	if (!db.objectStoreNames.contains("extension_files")) {
		db.createObjectStore("extension_files");
	}
	if (!db.objectStoreNames.contains("extension_storage")) {
		db.createObjectStore("extension_storage");
	}
}

function openSapphireDB() {
	if (sapphireDbPromise) return sapphireDbPromise;
	sapphireDbPromise = new Promise((resolve) => {
		if (typeof indexedDB === "undefined") return resolve(null);
		try {
			const req = indexedDB.open("sapphire_extensions");
			req.onupgradeneeded = () => {
				ensureSapphireStores(req.result);
			};
			req.onsuccess = () => {
				const db = req.result;
				db.onversionchange = () => {
					db.close();
					sapphireDbPromise = null;
				};
				if (
					db.objectStoreNames.contains("extensions") &&
					db.objectStoreNames.contains("extension_files") &&
					db.objectStoreNames.contains("extension_storage")
				) {
					resolve(db);
					return;
				}
				const nextVersion = (db.version || 1) + 1;
				db.close();
				const upgradeReq = indexedDB.open("sapphire_extensions", nextVersion);
				upgradeReq.onupgradeneeded = () => {
					ensureSapphireStores(upgradeReq.result);
				};
				upgradeReq.onsuccess = () => {
					const udb = upgradeReq.result;
					udb.onversionchange = () => {
						udb.close();
						sapphireDbPromise = null;
					};
					resolve(udb);
				};
				upgradeReq.onerror = () => {
					sapphireDbPromise = null;
					resolve(null);
				};
			};
			req.onerror = () => {
				sapphireDbPromise = null;
				resolve(null);
			};
		} catch (e) {
			sapphireDbPromise = null;
			resolve(null);
		}
	});
	return sapphireDbPromise;
}

async function getExtensionFile(extId, filePath) {
	try {
		const db = await openSapphireDB();
		if (!db || !db.objectStoreNames.contains("extension_files")) return null;
		return new Promise((resolve) => {
			try {
				const tx = db.transaction("extension_files", "readonly");
				const store = tx.objectStore("extension_files");
				const key = `${extId}/${filePath.replace(/^\//, "")}`;
				const req = store.get(key);
				req.onsuccess = () => resolve(req.result || null);
				req.onerror = () => resolve(null);
			} catch (err) {
				resolve(null);
			}
		});
	} catch (e) {
		return null;
	}
}

async function findExtensionFile(filePath, preferredExtId) {
	try {
		const db = await openSapphireDB();
		if (!db || !db.objectStoreNames.contains("extension_files")) return null;
		const clean = filePath.replace(/^\//, "");

		if (preferredExtId) {
			const bytes = await new Promise((resolve) => {
				try {
					const tx = db.transaction("extension_files", "readonly");
					const store = tx.objectStore("extension_files");
					const req = store.get(`${preferredExtId}/${clean}`);
					req.onsuccess = () => resolve(req.result || null);
					req.onerror = () => resolve(null);
				} catch (e) {
					resolve(null);
				}
			});
			if (bytes) return { extId: preferredExtId, bytes };
		}

		const allKeys = await new Promise((resolve) => {
			try {
				const tx = db.transaction("extension_files", "readonly");
				const store = tx.objectStore("extension_files");
				const req = store.getAllKeys();
				req.onsuccess = () => resolve(req.result || []);
				req.onerror = () => resolve([]);
			} catch (e) {
				resolve([]);
			}
		});

		for (const key of allKeys) {
			if (typeof key === "string" && (key.endsWith("/" + clean) || key === clean)) {
				const slash = key.indexOf("/");
				const foundExtId = slash === -1 ? "" : key.slice(0, slash);
				const bytes = await new Promise((resolve) => {
					try {
						const tx = db.transaction("extension_files", "readonly");
						const store = tx.objectStore("extension_files");
						const req = store.get(key);
						req.onsuccess = () => resolve(req.result || null);
						req.onerror = () => resolve(null);
					} catch (e) {
						resolve(null);
					}
				});
				if (bytes) {
					return { extId: foundExtId, bytes };
				}
			}
		}

		return null;
	} catch (e) {
		return null;
	}
}

async function handleSapphireRequest(url) {
	const pathname = url.pathname || "";
	if (!pathname.startsWith(SAPPHIRE_PREFIX)) return null;

	if (pathname.endsWith("/__bootstrap__")) {
		return new Response("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Sapphire Extension</title></head><body></body></html>", {
			status: 200,
			headers: { "Content-Type": "text/html" },
		});
	}

	const rest = pathname.slice(SAPPHIRE_PREFIX.length);
	const slash = rest.indexOf("/");
	if (slash === -1) return null;
	const extId = rest.slice(0, slash);
	const filePath = decodeURIComponent(rest.slice(slash + 1));
	if (!extId || !filePath) return null;

	const bytes = await getExtensionFile(extId, filePath);
	if (bytes) {
		return new Response(bytes, {
			status: 200,
			headers: { "Content-Type": guessMime(filePath) },
		});
	}
	return null;
}

async function handleRequest(event) {
	try {
		const url = new URL(event.request.url);
		const pathname = url.pathname || "";

		if (url.protocol === "chrome-extension:") {
			const extId = url.hostname;
			const filePath = decodeURIComponent(url.pathname.replace(/^\//, ""));
			const bytes = await getExtensionFile(extId, filePath);
			if (bytes) {
				return new Response(bytes, {
					status: 200,
					headers: { "Content-Type": guessMime(filePath) },
				});
			}
		}

		let extIdFromPath = null;
		if (pathname.startsWith(SAPPHIRE_PREFIX)) {
			const rest = pathname.slice(SAPPHIRE_PREFIX.length);
			const slash = rest.indexOf("/");
			extIdFromPath = slash === -1 ? rest : rest.slice(0, slash);
		}

		const cid = event.clientId;
		const rcid = event.resultingClientId;

		if (extIdFromPath) {
			if (rcid) clientToExtId.set(rcid, extIdFromPath);
			if (cid) clientToExtId.set(cid, extIdFromPath);
		}

		const refExtId = getExtIdFromReferrer(event.request.referrer);
		if (refExtId) {
			if (cid) clientToExtId.set(cid, refExtId);
			if (rcid) clientToExtId.set(rcid, refExtId);
		}

		if (pathname.startsWith(SAPPHIRE_PREFIX)) {
			const sResp = await handleSapphireRequest(url);
			if (sResp) return sResp;
		}

		const mappedExtId = (cid ? clientToExtId.get(cid) : null) || refExtId;
		const cleanPath = pathname.replace(/^\//, "");

		const isInternalPath =
			pathname.startsWith("/scramjet/") ||
			pathname.startsWith("/controller/") ||
			pathname.startsWith("/host/") ||
			pathname.startsWith("/~/sj/") ||
			pathname.startsWith("/assets/") ||
			pathname.startsWith("/bare/") ||
			pathname.startsWith("/wisp/") ||
			pathname.startsWith("/api/") ||
			pathname.startsWith("/socket.io/") ||
			pathname === "/sw.js" ||
			pathname === "/index.html" ||
			pathname === "/" ||
			pathname === "/data.tsx" ||
			pathname === "/data.js";

		if (!isInternalPath && cleanPath) {
			const fileRes = await findExtensionFile(cleanPath, mappedExtId);
			if (fileRes && fileRes.bytes) {
				if (cid && fileRes.extId) clientToExtId.set(cid, fileRes.extId);
				return new Response(fileRes.bytes, {
					status: 200,
					headers: { "Content-Type": guessMime(cleanPath) },
				});
			}
		}

		if ($scramjetController.shouldRoute(event)) {
			return await $scramjetController.route(event);
		}
	} catch (e) {
		console.error("SW handleRequest error:", e);
	}

	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
