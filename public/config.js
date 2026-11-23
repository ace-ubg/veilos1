const WISP_URL = "wss://fern.best/wisp/";
if (typeof window !== "undefined") {
	window.WISP_URL = WISP_URL;
}

let _CONFIG = {
	wispurl: WISP_URL,
	bareurl: (typeof location !== "undefined" && location.origin) ? (location.origin + "/bare/") : "/bare/"
};
if (typeof window !== "undefined") {
	window._CONFIG = _CONFIG;
}
