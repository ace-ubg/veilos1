
export function installSafePostMessage() {
	if (typeof MessagePort === "undefined" || !MessagePort.prototype || !MessagePort.prototype.postMessage) {
		return;
	}
	if ((MessagePort.prototype.postMessage as any).__safeClonePatched) {
		return;
	}

	function isEventObject(val: any): boolean {
		if (!val || typeof val !== "object") return false;
		if (typeof Event !== "undefined" && val instanceof Event) return true;
		const ctor = val.constructor?.name;
		if (typeof ctor === "string" && ctor.endsWith("Event")) return true;

		return typeof val.preventDefault === "function" && typeof val.stopPropagation === "function";
	}

	function isErrorObject(val: any): boolean {
		if (!val || typeof val !== "object") return false;
		if (val instanceof Error) return true;
		const ctor = val.constructor?.name;

		return typeof ctor === "string" && ctor.endsWith("Error");
	}

	function isTransferable(val: any): boolean {
		if (!val || typeof val !== "object") return false;
		if (typeof MessagePort !== "undefined" && val instanceof MessagePort) return true;
		if (typeof ArrayBuffer !== "undefined" && (val instanceof ArrayBuffer || (ArrayBuffer.isView && ArrayBuffer.isView(val)))) return true;
		if (typeof ReadableStream !== "undefined" && val instanceof ReadableStream) return true;
		if (typeof WritableStream !== "undefined" && val instanceof WritableStream) return true;
		if (typeof TransformStream !== "undefined" && val instanceof TransformStream) return true;

		return false;
	}

	function sanitizeValue(val: any, depth: number, seen: WeakSet<object>): any {
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
			const safe: any = {
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

		const out: Record<string, any> = {};
		for (const key of Object.keys(val)) {
			try {
				out[key] = sanitizeValue(val[key], depth + 1, seen);
			} catch {
			}
		}

		return out;
	}

	function createPatchedPostMessage(originalMethod: (...args: any[]) => any) {
		if (!originalMethod || (originalMethod as any).__safeClonePatched) {
			return originalMethod;
		}

		const patched = function (this: any, message: any, ...rest: any[]) {
			const seen = new WeakSet();
			let cleanMessage;
			try {
				cleanMessage = sanitizeValue(message, 0, seen);
			} catch {
				cleanMessage = message;
			}

			try {
				return originalMethod.call(this, cleanMessage, ...rest);
			} catch (err: any) {
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
							? [rest[0].filter((item: any) => isTransferable(item))]
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

		(patched as any).__safeClonePatched = true;

		return patched;
	}

	if (typeof MessagePort !== "undefined" && MessagePort.prototype && MessagePort.prototype.postMessage) {
		if (!(MessagePort.prototype.postMessage as any).__safeClonePatched) {
			(MessagePort.prototype as any).postMessage = createPatchedPostMessage(MessagePort.prototype.postMessage);
		}
	}

	if (typeof Worker !== "undefined" && Worker.prototype && Worker.prototype.postMessage) {
		if (!(Worker.prototype.postMessage as any).__safeClonePatched) {
			(Worker.prototype as any).postMessage = createPatchedPostMessage(Worker.prototype.postMessage);
		}
	}

	if (typeof globalThis !== "undefined" && typeof (globalThis as any).postMessage === "function" && typeof window === "undefined") {
		if (!(globalThis as any).postMessage.__safeClonePatched) {
			(globalThis as any).postMessage = createPatchedPostMessage((globalThis as any).postMessage);
		}
	}
}

installSafePostMessage();
