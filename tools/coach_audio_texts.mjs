// Writes tools/coach_audio_texts.json from the app's own text constants (run: node tools/coach_audio_texts.mjs lc61.js lc64.js)
// It reads the module sources, so the texts voiced are exactly the texts the app shows.
import fs from "node:fs";
const root = new URL("../", import.meta.url).pathname;
const src61 = fs.readFileSync(root + "lc61.js", "utf8"), src64 = fs.readFileSync(root + "lc64.js", "utf8");
const grab = (src, name) => { const m = src.match(new RegExp("const " + name + "=\\{[\\s\\S]*?\\n  \\};")); if (!m) throw new Error("missing " + name); return new Function("return (" + m[0].replace(/^const \w+=/, "").replace(/;$/, "") + ")")(); };
const ALARM = grab(src61, "ALARM"), ACT = grab(src64, "ACT");
const qs = src64.match(/const QS=\[([\s\S]*?)\];/)[1];
const QS = new Function("return [" + qs + "]")();
const LNAME = { M: "Move", S: "Specifics", P: "Priorities", C: "Calculation" };
const texts = [];
Object.values(ALARM).forEach(a => texts.push(a.say));
Object.values(ACT).forEach(t => texts.push(t));
QS.forEach(q => texts.push(q[2]));
const generic = { M: "Say out loud what their last move changed before you touch a piece.", S: "Name the pawn structure and the biggest weakness before you pick a plan.", P: "Write down your checks, captures and attacks first, then choose.", C: "Calculate their best reply to your move before you play it." };
Object.values(generic).forEach(t => texts.push(t));
// the "next 2 to 3 games" orders: every letter x every alarm, and the version without an alarm
const orders = (letter, id) => { const a = id && ALARM[id]; const act = ACT[id] || generic[letter]; return "In your next 2 to 3 games, run " + LNAME[letter] + " on every move; as soon as " + (a ? "the alarm “" + a.label + "”" : "an Alarm Signal") + " appears on the board, do this: " + act; };
Object.keys(LNAME).forEach(l => { texts.push(orders(l, "")); Object.keys(ALARM).forEach(id => texts.push(orders(l, id))); });
fs.writeFileSync(root + "tools/coach_audio_texts.json", JSON.stringify({ texts: [...new Set(texts)] }, null, 1));
console.log([...new Set(texts)].length + " texts written");
