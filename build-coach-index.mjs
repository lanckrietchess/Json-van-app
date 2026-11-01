#!/usr/bin/env node
// Writes assets/images/coach/index.json by SCANNING the folder, so the app only ever asks for pictures that exist.
// Usage (from the repo root):  node tools/build-coach-index.mjs [assets/images/coach]
// Understands both names:  {emotion}/{n}.png   and   {emotion}/{emotion}_{n}.png   (n = 1 to 10; png, webp or jpg)
// default.png in the folder becomes "_default". Run it again whenever you add or remove a picture, then push index.json with the pictures.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv[2] || "assets/images/coach");
if (!fs.existsSync(root)) { console.error("Folder not found: " + root); process.exit(1); }
const out = {};
for (const d of fs.readdirSync(root, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const emo = d.name.toLowerCase().replace(/[^a-z_]/g, "");
  if (!emo) continue;
  const ns = new Set();
  for (const f of fs.readdirSync(path.join(root, d.name))) {
    const m = /^(?:[a-z_]+_)?(\d{1,2})\.(png|webp|jpe?g)$/i.exec(f);
    if (!m) continue;
    const n = +m[1];
    if (n >= 1 && n <= 10 && /^\d{1,2}\.png$/i.test(f)) ns.add(n);   // the app loads {emotion}/{n}.png
    else if (n >= 1 && n <= 10) console.warn("Skipped " + d.name + "/" + f + ": the app loads {emotion}/{n}.png, rename it to " + n + ".png");
  }
  if (ns.size) out[emo] = Array.from(ns).sort((a, b) => a - b);
}
if (fs.existsSync(path.join(root, "default.png"))) out._default = "default.png";
fs.writeFileSync(path.join(root, "index.json"), JSON.stringify(out, null, 1) + "\n");
console.log("index.json written: " + Object.keys(out).filter((k) => k[0] !== "_").map((k) => k + " " + out[k].join(",")).join(" | ") + (out._default ? " | default.png" : " | NO default.png"));
