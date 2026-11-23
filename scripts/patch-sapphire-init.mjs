import fs from "node:fs";
import path from "node:path";

const FIND = /String\(\s*init\.client\.url\s*\)/;
const REPLACE = 'String(init.client?.url ?? init.window?.location?.href ?? "")';
const targets = ["node_modules/@x8r/sapphire", "public/host"];

function* files(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.(mjs|js|ts)$/.test(e.name)) yield p;
  }
}

let patched = 0;
for (const t of targets) {
  for (const f of files(t)) {
    const src = fs.readFileSync(f, "utf8");
    if (!FIND.test(src)) continue;
    fs.writeFileSync(f, src.replace(new RegExp(FIND, "g"), REPLACE));
    console.log("patched onInitPre in", f);
    patched++;
  }
}
console.log("sapphire onInitPre patch: " + patched + " file(s) changed");
