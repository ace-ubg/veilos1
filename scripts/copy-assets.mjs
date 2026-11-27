import { mkdirSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import ts from "typescript";


import { patchSapphire } from "./patch-sapphire.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, process.env.OUTPUT_DIR || "public");
const isVercel = Boolean(process.env.VERCEL);

patchSapphire();

// Bundle the host glue (transports, Sapphire, CRX helpers) into <out>/host/host.js.
console.log("Building host bundle via Rspack...");
try {
	execSync("npx rspack build", {
		cwd: root,
		stdio: "inherit",
		env: { ...process.env, OUTPUT_DIR: process.env.OUTPUT_DIR || "public" },
	});
} catch (e) {
	console.error("Failed to build host bundle:", e);
	process.exitCode = 1;
}

console.log(`Copying static client runtime assets to ${outDir}...`);

mkdirSync(outDir, { recursive: true });

const copyDir = (src, dest, filter) => {
	if (src && existsSync(src)) {
		mkdirSync(dest, { recursive: true });
		cpSync(src, dest, { recursive: true, ...(filter ? { filter } : {}) });
		console.log(`  ✓ Copied ${src} -> ${dest}`);
	} else {
		console.warn(`  ! Warning: Source directory missing: ${src}`);
	}
};

const staticDir = join(root, "static");
copyDir(staticDir, outDir, (src) => {
	if (isVercel) {
		const rel = src.slice(staticDir.length).replaceAll("\\", "/");
		if (rel === "/chat.html" || rel === "/onyx-chat" || rel.startsWith("/onyx-chat/")) {
			return false;
		}
	}
	return true;
});

if (isVercel) {
	rmSync(join(outDir, "onyx-chat"), { recursive: true, force: true });
	rmSync(join(outDir, "chat.html"), { force: true });
} else if (existsSync(join(root, "onyx-chat"))) {
	const onyxDir = join(root, "onyx-chat");
	const onyxDistHtml = join(onyxDir, "dist", "index.html");
	const hasOnyxDeps = existsSync(join(onyxDir, "node_modules", "@tailwindcss", "vite"));
	if (hasOnyxDeps) {
		console.log("Compiling Onyx Chat single-file application bundle via Vite...");
		try {
			execSync("npx vite build", { cwd: onyxDir, stdio: "inherit" });
		} catch (e) {
			console.error("Failed to compile Onyx Chat:", e);
		}
	} else if (!existsSync(onyxDistHtml)) {
		const prebuilt = existsSync(join(root, "static", "chat.html"))
			? join(root, "static", "chat.html")
			: (existsSync(join(root, "static", "onyx-chat", "index.html"))
				? join(root, "static", "onyx-chat", "index.html")
				: null);
		if (prebuilt) {
			mkdirSync(join(onyxDir, "dist"), { recursive: true });
			cpSync(prebuilt, onyxDistHtml);
			console.log("  ✓ Synchronized prebuilt Onyx Chat bundle to onyx-chat/dist/index.html");
		}
	}
	rmSync(join(outDir, "onyx-chat"), { recursive: true, force: true });
	if (existsSync(onyxDistHtml)) {
		mkdirSync(join(outDir, "onyx-chat"), { recursive: true });
		cpSync(onyxDistHtml, join(outDir, "onyx-chat", "index.html"));
		cpSync(onyxDistHtml, join(outDir, "chat.html"));
		mkdirSync(join(root, "static", "onyx-chat"), { recursive: true });
		cpSync(onyxDistHtml, join(root, "static", "onyx-chat", "index.html"));
		cpSync(onyxDistHtml, join(root, "static", "chat.html"));
		console.log("  ✓ Deployed compiled Onyx Chat to /onyx-chat/index.html and /chat.html");
	}
}

// Scramjet core and controller ship prebuilt IIFE bundles, the wasm rewriter
// and the controller service worker script. Copy them as-is; the page loads
// /scramjet/scramjet.js and /controller/controller.api.js as plain scripts and
// sw.js does importScripts("/controller/controller.sw.js").
const pkgDist = (name) => join(root, "node_modules", ...name.split("/"), "dist");
copyDir(pkgDist("@mercuryworkshop/scramjet"), join(outDir, "scramjet"));
copyDir(pkgDist("@mercuryworkshop/scramjet-controller"), join(outDir, "controller"));

copyDir(join(root, "assets"), join(outDir, "assets"));

const dataTsPath = existsSync(join(root, "data.tsx"))
	? join(root, "data.tsx")
	: (existsSync(join(root, "src", "data.tsx"))
		? join(root, "src", "data.tsx")
		: (existsSync(join(root, "data.ts"))
			? join(root, "data.ts")
			: (existsSync(join(root, "src", "data.ts")) ? join(root, "src", "data.ts") : null)));

if (dataTsPath) {
	try {
		const source = readFileSync(dataTsPath, "utf8");
		const transpiled = ts.transpileModule(source, {
			compilerOptions: {
				target: ts.ScriptTarget.ES2022,
				module: ts.ModuleKind.ES2022,
				jsx: ts.JsxEmit.ReactJSX,
				removeComments: false,
			},
		});
		writeFileSync(join(outDir, "data.js"), transpiled.outputText, "utf8");
		console.log(`  ✓ Compiled ${dataTsPath} -> public/data.js, public/data.ts, and public/data.tsx`);
	} catch (err) {
		console.error("  ! Failed to transpile data source file:", err.message);
	}
}


console.log("Static asset copying complete!");
