// Sanity checks for the Scramjet 2.x layout. Run after `npm run build`.
//   - the pinned scramjet / controller versions are what is installed
//   - the files the pages and the service worker load exist in public/
//   - every page that proxies content loads its scripts in the required order
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, process.env.OUTPUT_DIR || "public");
const problems = [];
const fail = (msg) => problems.push(msg);

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const installedVersion = (name) => {
	const p = join(root, "node_modules", ...name.split("/"), "package.json");
	return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).version : null;
};

for (const name of ["@mercuryworkshop/scramjet", "@mercuryworkshop/scramjet-controller"]) {
	const want = pkg.dependencies[name];
	const have = installedVersion(name);
	if (!have) fail(`${name} is not installed (run the package manager's install)`);
	else if (have !== want) fail(`${name}: package.json pins ${want} but ${have} is installed`);
}

// The controller refuses to start unless the loaded scramjet version is exactly the one it was built for.
for (const f of [
	"scramjet/scramjet.js",
	"controller/controller.api.js",
	"controller/controller.inject.js",
	"controller/controller.sw.js",
	"host/host.js",
	"sw.js",
	"scram-host.js",
]) {
	if (!existsSync(join(outDir, f))) fail(`missing build output: ${join(outDir, f)}`);
}

const ORDER = ["/scramjet/scramjet.js", "/controller/controller.api.js", "/host/host.js", "/scram-host.js"];
const pages = ["index.html", "movies.html", "vault.html", "playground.html"];
for (const page of pages) {
	const p = join(outDir, page);
	if (!existsSync(p)) {
		fail(`missing page: ${p}`);
		continue;
	}
	const html = readFileSync(p, "utf8");
	let last = -1;
	for (const src of ORDER) {
		const at = html.indexOf(`src="${src}"`);
		if (at === -1) fail(`${page}: does not load ${src}`);
		else if (at < last) fail(`${page}: ${src} is loaded out of order`);
		else last = at;
	}
	if (/\/scram\/|\/baremux\/|\/baremod\//.test(html)) fail(`${page}: still references the removed /scram/, /baremux/ or /baremod/ runtime`);
}

const sw = existsSync(join(outDir, "sw.js")) ? readFileSync(join(outDir, "sw.js"), "utf8") : "";
if (!sw.includes('importScripts("/controller/controller.sw.js")')) fail("sw.js does not import /controller/controller.sw.js");

if (problems.length) {
	console.error("Asset check failed:\n - " + problems.join("\n - "));
	process.exit(1);
}
console.log("Asset check passed.");
