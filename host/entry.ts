/**
 * Host bundle for the SpadeOS / Veil shell.
 *
 * This is the only code in the repo that is bundled locally. Scramjet itself
 * (`/scramjet/scramjet.js`), the controller (`/controller/controller.api.js`)
 * and the controller service worker script (`/controller/controller.sw.js`)
 * are copied straight out of their npm packages by `scripts/copy-assets.mjs`.
 *
 * Load order on every page that proxies content:
 *   1. /scramjet/scramjet.js          -> globalThis.$scramjet
 *   2. /controller/controller.api.js  -> globalThis.$scramjetController
 *   3. /host/host.js                  -> this file (transports, Sapphire, helpers)
 *   4. /scram-host.js                 -> ScramjetHost.boot()
 *
 * Importing "@mercuryworkshop/scramjet-controller" resolves to upstream's
 * "external" stub, which just re-exports the global from step 2, so Sapphire
 * shares the exact same ManagedPlugin class as the page's Controller.
 */
import "./safe-postmessage";
import EpoxyClient from "@mercuryworkshop/epoxy-transport";
import LibcurlClient from "@mercuryworkshop/libcurl-transport";
import {
	Sapphire,
	SapphireContentScriptPlugin,
	SapphirePlugin,
	findMatchingCommand,
	triggerCommand,
} from "@x8r/sapphire";
import JSZip from "jszip";

export { JSZip };

export function crxToZip(buffer: ArrayBuffer): ArrayBuffer {
	if (!buffer || buffer.byteLength < 16) return buffer;
	const view = new DataView(buffer);
	const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
	if (magic !== "Cr24") {
		return buffer;
	}
	const version = view.getUint32(4, true);
	let zipStart: number;
	if (version === 2) {
		const pubKeyLen = view.getUint32(8, true);
		const sigLen = view.getUint32(12, true);
		zipStart = 16 + pubKeyLen + sigLen;
	} else if (version === 3) {
		const headerSize = view.getUint32(8, true);
		zipStart = 12 + headerSize;
	} else {
		return buffer;
	}

	return buffer.slice(zipStart);
}

export async function normalizeExtensionBuffer(buffer: ArrayBuffer, _filename = "extension.zip"): Promise<ArrayBuffer> {
	if (!buffer || buffer.byteLength < 16) return buffer;
	try {
		const zipBuffer = crxToZip(buffer);
		if (zipBuffer.byteLength >= 2) {
			const v = new Uint8Array(zipBuffer);
			if (v[0] !== 0x50 || v[1] !== 0x4b) {
				return zipBuffer;
			}
		}
		const zip = await JSZip.loadAsync(zipBuffer);
		if (zip.file("manifest.json")) {
			return zipBuffer;
		}
		let manifestPath: string | null = null;
		zip.forEach((relativePath, file) => {
			if (!file.dir && relativePath.endsWith("manifest.json")) {
				if (!manifestPath || relativePath.split("/").length < manifestPath.split("/").length) {
					manifestPath = relativePath;
				}
			}
		});

		if (manifestPath) {
			const prefix = manifestPath.slice(0, manifestPath.length - "manifest.json".length);
			const newZip = new JSZip();
			const promises: Promise<void>[] = [];
			zip.forEach((relativePath, file) => {
				if (relativePath.startsWith(prefix) && !file.dir) {
					const cleanPath = relativePath.slice(prefix.length);
					promises.push(
						file.async("arraybuffer").then((data) => {
							newZip.file(cleanPath, data);
						})
					);
				}
			});
			await Promise.all(promises);

			return await newZip.generateAsync({ type: "arraybuffer" });
		}

		return zipBuffer;
	} catch (e) {
		console.warn("[normalizeExtensionBuffer] fallback to original buffer:", e);
	}

	return buffer;
}


export {
	EpoxyClient,
	LibcurlClient,
	Sapphire,
	SapphireContentScriptPlugin,
	SapphirePlugin,
	findMatchingCommand,
	triggerCommand,
};

const g = globalThis as any;
g.$scramjetTransports = { EpoxyClient, LibcurlClient };
g.Sapphire = Sapphire;
g.SapphirePlugin = SapphirePlugin;
g.SapphireContentScriptPlugin = SapphireContentScriptPlugin;
g.findMatchingCommand = findMatchingCommand;
g.triggerCommand = triggerCommand;
g.JSZip = JSZip;
g.crxToZip = crxToZip;
g.normalizeExtensionBuffer = normalizeExtensionBuffer;

if ("document" in globalThis && document?.currentScript) {
	document.currentScript.remove();
}
