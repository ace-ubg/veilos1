import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sapphireDir = join(root, "node_modules", "@x8r/sapphire", "src");

export function patchSapphire() {
	if (!existsSync(sapphireDir)) {
		console.warn("  ! @x8r/sapphire src not found, skipping patch.");
		return false;
	}

	console.log("Applying @x8r/sapphire compatibility patches...");
	try {
		execSync("node scripts/patch-sapphire-init.mjs", { cwd: root, stdio: "inherit" });
	} catch (e) {}

	const extensionsPath = join(sapphireDir, "extensions.ts");
	if (existsSync(extensionsPath)) {
		let code = readFileSync(extensionsPath, "utf8");
		let modified = false;

		if (code.includes("ext.dnr.disabledStaticRules.set(k, new Set(v));")) {
			code = code.replace(
				"ext.dnr.disabledStaticRules.set(k, new Set(v));",
				"ext.dnr.disabledStaticRules.set(k, new Set(v as any));"
			);
			modified = true;
		}

		if (!code.includes("cleanFilename")) {
			const target = 'const extId = generateExtensionId(manifest.name + (manifest.version ?? ""));';
			const replacement = `let extId: string;
  const cleanFilename = (filename || "").replace(/\\.(crx|zip)$/i, "").toLowerCase();
  if (/^[a-z]{32}$/.test(cleanFilename)) {
    extId = cleanFilename;
  } else {
    extId = generateExtensionId(manifest.name + (manifest.version ?? ""));
  }`;
			if (code.includes(target)) {
				code = code.replace(target, replacement);
				modified = true;
			}
		}

		if (modified) {
			writeFileSync(extensionsPath, code, "utf8");
			console.log("  ✓ Patched @x8r/sapphire/src/extensions.ts");
		}
	}

	const framesPath = join(sapphireDir, "frames.ts");
	if (existsSync(framesPath)) {
		let code = readFileSync(framesPath, "utf8");
		if (code.includes("class extends (win.Event as typeof Event)")) {
			code = code.replace(
				"class extends (win.Event as typeof Event)",
				"class extends ((win as any).Event || Event)"
			);
			writeFileSync(framesPath, code, "utf8");
			console.log("  ✓ Patched @x8r/sapphire/src/frames.ts");
		}
	}

	const pluginPath = join(sapphireDir, "SapphirePlugin.ts");
	if (existsSync(pluginPath)) {
		let code = readFileSync(pluginPath, "utf8");
		let modified = false;

		if (code.includes(': { kind: "tab", tabId: tabIdOrOptions };')) {
			code = code.replace(
				': { kind: "tab", tabId: tabIdOrOptions };',
				': { kind: "tab", tabId: typeof tabIdOrOptions === "number" ? tabIdOrOptions : null };'
			);
			modified = true;
		}

		if (code.includes("this.tap(frame.hooks")) {
			code = code.replaceAll("this.tap(frame.hooks", "(this as any).tap(frame.hooks");
			modified = true;
		}

		if (modified) {
			writeFileSync(pluginPath, code, "utf8");
			console.log("  ✓ Patched @x8r/sapphire/src/SapphirePlugin.ts");
		}
	}

	const urlSchemePath = join(sapphireDir, "urlScheme.ts");
	if (existsSync(urlSchemePath)) {
		let code = readFileSync(urlSchemePath, "utf8");
		if (code.includes("`chrome-extension://${extId}/${path.replace(/^\\//, \"\")}`")) {
			code = code.replace(
				"`chrome-extension://${extId}/${path.replace(/^\\//, \"\")}`",
				"`${sapphireExtensionBase(extId)}${path.replace(/^\\//, \"\")}`"
			);
			writeFileSync(urlSchemePath, code, "utf8");
			console.log("  ✓ Patched @x8r/sapphire/src/urlScheme.ts");
		}
	}

	const chromeApiPath = join(sapphireDir, "chromeApi.ts");
	if (existsSync(chromeApiPath)) {
		let code = readFileSync(chromeApiPath, "utf8");
		if (!code.includes("__sapphireFetchPatched")) {
			const anchor = "const events = createRealmEvents();";
			const patchSnippet = `const events = createRealmEvents();
  if (realm && (realm as any).fetch && !(realm as any).__sapphireFetchPatched) {
    (realm as any).__sapphireFetchPatched = true;
    const origFetch = realm.fetch.bind(realm);
    realm.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === "string" && input.startsWith("chrome-extension://")) {
        const parsed = decodeSapphireUrl(input);
        if (parsed) {
          input = \`/~/sx/\${parsed.extId}/\${parsed.path}\`;
        }
      } else if (input instanceof URL && input.protocol === "chrome-extension:") {
        const parsed = decodeSapphireUrl(input.href);
        if (parsed) {
          input = new URL(\`/~/sx/\${parsed.extId}/\${parsed.path}\`, location.origin);
        }
      }
      return origFetch(input as any, init);
    };
  }

  if (realm && (realm as any).XMLHttpRequest && !(realm as any).__sapphireXhrPatched) {
    (realm as any).__sapphireXhrPatched = true;
    const xhrProto = (realm as any).XMLHttpRequest.prototype;
    const origOpen = xhrProto.open;
    xhrProto.open = function (method: string, url: string | URL, ...rest: any[]) {
      let targetUrl = url;
      const strUrl = typeof targetUrl === "string" ? targetUrl : targetUrl?.href;
      if (typeof strUrl === "string" && strUrl.startsWith("chrome-extension://")) {
        const parsed = decodeSapphireUrl(strUrl);
        if (parsed) {
          targetUrl = \`/~/sx/\${parsed.extId}/\${parsed.path}\`;
        }
      }
      return origOpen.call(this, method, targetUrl, ...rest);
    };
  }`;
			if (code.includes(anchor)) {
				code = code.replace(anchor, patchSnippet);
				writeFileSync(chromeApiPath, code, "utf8");
				console.log("  ✓ Patched @x8r/sapphire/src/chromeApi.ts");
			}
		}
	}

	const dbPath = join(sapphireDir, "db.ts");
	if (existsSync(dbPath)) {
		let code = readFileSync(dbPath, "utf8");
		if (!code.includes("dbGetAllKeysPrefix")) {
			code += `
export async function dbGetAllKeysPrefix(store: string, prefix: string): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAllKeys(IDBKeyRange.bound(prefix, prefix + "\\uffff"));
    req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
    req.onerror = () => reject(req.error);
  });
}
`;
			writeFileSync(dbPath, code, "utf8");
			console.log("  ✓ Patched @x8r/sapphire/src/db.ts (added dbGetAllKeysPrefix)");
		}
	}

	return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	patchSapphire();
}
