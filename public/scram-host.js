/**
 * ScramjetHost: boots the Scramjet 2.x controller for the SpadeOS pages.
 *
 * Requires these scripts to have run first (see scripts/check-assets.mjs):
 *   /scramjet/scramjet.js          -> self.$scramjet            (core + wasm rewriter)
 *   /controller/controller.api.js  -> self.$scramjetController  (Controller, Frame, ManagedPlugin)
 *   /host/host.js                  -> self.$scramjetTransports  (EpoxyClient, LibcurlClient)
 *
 * The returned host keeps the small surface the shell already used
 * (createFrame / encodeUrl / config) so the pages need very little glue.
 * IMPORTANT: never assign anything to window.$scramjet. That global is the
 * Scramjet core namespace and the controller reads it at runtime.
 */
(function () {
	"use strict";

	const SW_URL = "/sw.js";
	const DEFAULT_WISP = "wss://fern.best/wisp/";

	let bootPromise = null;
	let currentHost = null;

	function normalizeTransportKind(value) {
		const v = String(value || "").toLowerCase();
		if (v.includes("libcurl")) return "libcurl";
		// "epoxy", and the removed Bare 3 option (/baremod/...), both resolve to epoxy.
		return "epoxy";
	}

	function pickWisp(value) {
		if (typeof value === "string" && value) return value;
		if (typeof window !== "undefined") {
			if (window._CONFIG && window._CONFIG.wispurl) return window._CONFIG.wispurl;
			if (window.WISP_URL) return window.WISP_URL;
		}
		return DEFAULT_WISP;
	}

	function makeTransport(kind, wisp) {
		const t = self.$scramjetTransports;
		if (!t || !t.EpoxyClient || !t.LibcurlClient) {
			throw new Error("Transports are not loaded. Include /host/host.js before /scram-host.js.");
		}
		return kind === "libcurl" ? new t.LibcurlClient({ wisp }) : new t.EpoxyClient({ wisp });
	}

	async function waitForController(registration, timeoutMs) {
		if (navigator.serviceWorker.controller) return;
		const ready = navigator.serviceWorker.ready.then(() => {});
		const changed = new Promise((resolve) => {
			navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
		});
		const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
		await Promise.race([ready, changed, timeout]);
	}

	async function getServiceWorker() {
		if (!("serviceWorker" in navigator)) {
			throw new Error("Service workers are not supported in this browser.");
		}
		const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
		await waitForController(registration, 10000);
		const sw = navigator.serviceWorker.controller || registration.active;
		if (!sw) throw new Error("No service worker is available for the Scramjet controller.");
		return sw;
	}

	/**
	 * Plugin that mirrors the old Frame "urlchange" / "navigate" events and the
	 * `frame.url` getter, which the tab strip in ui.js relies on.
	 */
	function makeUrlEventsPlugin(ManagedPlugin) {
		return class UrlEventsPlugin extends ManagedPlugin {
			constructor() {
				super("spade-url-events", []);
			}
			install(frame) {
				super.install(frame);
				const emit = (type, url) => {
					try {
						frame.__lastUrl = url;
						const ev = new Event(type);
						ev.url = url;
						frame.__events.dispatchEvent(ev);
					} catch (e) {
						console.warn("[ScramjetHost] url event failed:", e);
					}
				};
				this.tap(frame.hooks.init.post, (context) => {
					if (!context.isTopLevel) return;
					emit("urlchange", context.client.url.href);
					this.tap(context.client.hooks.lifecycle.navigate, (_ctx, props) => {
						emit("navigate", props.url);
					});
					context.window.addEventListener(
						"hashchange",
						() => emit("urlchange", context.client.url.href),
						{ capture: true }
					);
				});
			}
		};
	}

	function decorateFrame(frame) {
		frame.__events = new EventTarget();
		frame.__lastUrl = null;
		// Compatibility with the Scramjet 1.x Frame API the shell was written against.
		Object.defineProperty(frame, "frame", { get: () => frame.element, configurable: true });
		Object.defineProperty(frame, "url", {
			get: () => {
				try {
					return frame.__lastUrl ? new URL(frame.__lastUrl) : null;
				} catch (e) {
					return null;
				}
			},
			configurable: true,
		});
		frame.addEventListener = (...args) => frame.__events.addEventListener(...args);
		frame.removeEventListener = (...args) => frame.__events.removeEventListener(...args);
		return frame;
	}

	async function boot(opts) {
		if (bootPromise) return bootPromise;
		bootPromise = (async () => {
			opts = opts || {};
			const core = self.$scramjet;
			const ctl = self.$scramjetController;
			if (!core) throw new Error("Scramjet core is not loaded. Include /scramjet/scramjet.js first.");
			if (!ctl || !ctl.Controller) throw new Error("Scramjet controller is not loaded. Include /controller/controller.api.js after scramjet.js.");

			const UrlEventsPlugin = makeUrlEventsPlugin(ctl.ManagedPlugin);
			const serviceworker = await getServiceWorker();

			let kind = normalizeTransportKind(opts.transport);
			let wisp = pickWisp(opts.wisp);

			const controller = new ctl.Controller({
				serviceworker,
				transport: makeTransport(kind, wisp),
				scramjetConfig: {
					flags: {
						rewriterLogs: false,
						scramitize: false,
						cleanErrors: true,
						sourcemaps: true,
					},
				},
			});
			await controller.wait();

			let encoderFrame = null;

			const host = {
				controller,
				get config() {
					return controller.scramjetConfig;
				},
				get prefix() {
					return controller.prefix;
				},
				get transportKind() {
					return kind;
				},
				get wisp() {
					return wisp;
				},
				/** Create a proxied iframe. Returns the controller Frame (with .frame/.url/addEventListener shims). */
				createFrame(element, options) {
					const plugins = [new UrlEventsPlugin(), ...((options && options.plugins) || [])];
					const frame = controller.createFrame(element, { ...(options || {}), plugins });
					return decorateFrame(frame);
				},
				/**
				 * Rewrite a normal URL into its proxied URL. Uses a dedicated hidden
				 * frame so the URL carries a prefix the controller routes.
				 */
				encodeUrl(url) {
					if (!encoderFrame) {
						encoderFrame = controller.createFrame(document.createElement("iframe"), { plugins: [] });
					}
					const base = new URL(location.href);
					return core.rewriteUrl(url, encoderFrame.context, { origin: base, base });
				},
				/** Switch transport at runtime. Accepts the legacy store values ("/epoxy/index.mjs" etc). */
				async setTransport(nextTransport, nextWisp) {
					kind = normalizeTransportKind(nextTransport);
					wisp = pickWisp(nextWisp);
					controller.setTransport(makeTransport(kind, wisp));
					return { kind, wisp };
				},
				async init() {},
			};

			currentHost = host;
			window.scramjet = host;
			window.__scramjetController = controller;
			window.encodeProxyUrl = (url) => host.encodeUrl(url);
			return host;
		})();
		bootPromise.catch(() => {
			bootPromise = null;
		});
		return bootPromise;
	}

	window.ScramjetHost = {
		boot,
		get current() {
			return currentHost;
		},
		normalizeTransportKind,
	};
})();
