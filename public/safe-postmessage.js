(function (root) {
	"use strict";

	function installSafePostMessage() {
		function isEventObject(val) {
			if (!val || typeof val !== "object") return false;
			if (typeof Event !== "undefined" && val instanceof Event) return true;
			const ctor = val.constructor?.name;
			if (typeof ctor === "string" && ctor.endsWith("Event")) return true;
			return typeof val.preventDefault === "function" && typeof val.stopPropagation === "function";
		}

		function isErrorObject(val) {
			if (!val || typeof val !== "object") return false;
			if (val instanceof Error) return true;
			const ctor = val.constructor?.name;
			return typeof ctor === "string" && ctor.endsWith("Error");
		}

		function isTransferable(val) {
			if (!val || typeof val !== "object") return false;
			if (typeof MessagePort !== "undefined" && val instanceof MessagePort) return true;
			if (typeof ArrayBuffer !== "undefined" && (val instanceof ArrayBuffer || (ArrayBuffer.isView && ArrayBuffer.isView(val)))) return true;
			if (typeof ReadableStream !== "undefined" && val instanceof ReadableStream) return true;
			if (typeof WritableStream !== "undefined" && val instanceof WritableStream) return true;
			if (typeof TransformStream !== "undefined" && val instanceof TransformStream) return true;
			return false;
		}

		function sanitizeValue(val, depth, seen) {
			if (val === null || typeof val !== "object") {
				return val;
			}
			if (depth > 14) {
				return undefined;
			}
			if (seen.has(val)) {
				return undefined;
			}
			seen.add(val);

			if (isEventObject(val)) {
				const safe = {
					isEvent: true,
					type: typeof val.type === "string" ? val.type : "event",
					isTrusted: Boolean(val.isTrusted),
				};
				if ("code" in val && typeof val.code === "number") safe.code = val.code;
				if ("reason" in val && typeof val.reason === "string") safe.reason = val.reason;
				if ("message" in val && typeof val.message === "string") safe.message = val.message;
				if ("detail" in val && val.detail && typeof val.detail !== "object") safe.detail = val.detail;
				return safe;
			}

			if (isErrorObject(val)) {
				return {
					isError: true,
					name: typeof val.name === "string" ? val.name : "Error",
					message: typeof val.message === "string" ? val.message : String(val),
					stack: typeof val.stack === "string" ? val.stack : undefined,
				};
			}

			if (isTransferable(val)) {
				return val;
			}

			if (Array.isArray(val)) {
				return val.map((item) => sanitizeValue(item, depth + 1, seen));
			}

			const out = {};
			for (const key of Object.keys(val)) {
				try {
					out[key] = sanitizeValue(val[key], depth + 1, seen);
				} catch {
				}
			}
			return out;
		}

		function createPatchedPostMessage(originalMethod) {
			if (!originalMethod || originalMethod.__safeClonePatched) {
				return originalMethod;
			}

			const patched = function (message, ...rest) {
				const seen = new WeakSet();
				let cleanMessage;
				try {
					cleanMessage = sanitizeValue(message, 0, seen);
				} catch {
					cleanMessage = message;
				}

				try {
					return originalMethod.call(this, cleanMessage, ...rest);
				} catch (err) {
					if (err && (err.name === "DataCloneError" || String(err).includes("could not be cloned"))) {
						console.warn("[safePostMessage] Intercepted DataCloneError, applying fallback:", err);
						try {
							const fallbackJson = JSON.parse(
								JSON.stringify(cleanMessage, (k, v) => {
									if (isEventObject(v)) {
										return { isEvent: true, type: v.type || "event" };
									}
									if (isErrorObject(v)) {
										return { isError: true, name: v.name || "Error", message: v.message || String(v) };
									}
									return v;
								})
							);
							const safeRest = rest.length > 0 && Array.isArray(rest[0])
								? [rest[0].filter((item) => isTransferable(item))]
								: rest;
							return originalMethod.call(this, fallbackJson, ...safeRest);
						} catch (jsonErr) {
							console.error("[safePostMessage] Fallback serialization failed:", jsonErr);
							const minimal = {
								type: cleanMessage?.type || "error",
								error: String(cleanMessage?.error || cleanMessage?.message || err.message || "Failed to clone message"),
							};
							return originalMethod.call(this, minimal);
						}
					}
					throw err;
				}
			};

			patched.__safeClonePatched = true;
			return patched;
		}

		if (typeof MessagePort !== "undefined" && MessagePort.prototype && MessagePort.prototype.postMessage) {
			if (!MessagePort.prototype.postMessage.__safeClonePatched) {
				MessagePort.prototype.postMessage = createPatchedPostMessage(MessagePort.prototype.postMessage);
			}
		}

		if (typeof Worker !== "undefined" && Worker.prototype && Worker.prototype.postMessage) {
			if (!Worker.prototype.postMessage.__safeClonePatched) {
				Worker.prototype.postMessage = createPatchedPostMessage(Worker.prototype.postMessage);
			}
		}

		if (typeof root !== "undefined" && typeof root.postMessage === "function" && typeof window === "undefined") {
			if (!root.postMessage.__safeClonePatched) {
				root.postMessage = createPatchedPostMessage(root.postMessage);
			}
		}
	}

	installSafePostMessage();
	if (typeof module !== "undefined" && module.exports) {
		module.exports = { installSafePostMessage };
	}
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this);
