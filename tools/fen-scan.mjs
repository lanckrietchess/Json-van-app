#!/usr/bin/env node
/* FEN scanner (build 9.29.0). Read-only: it never changes content.json.
   Finds EVERY FEN in the course data and checks it:
     - structure (6 fields, 8 ranks of 8 squares, side to move, castling, en passant)
     - legality (one king each, no pawns on the 1st / 8th rank, kings not adjacent, the side NOT to move is not in check,
       piece counts that can come from a real game, castling rights that match the king and rook squares)
     - for an object with `lastMove` [from,to]: the piece of the side that just moved stands on `to`, `from` is empty
     - for an object with `solution_moves` (UCI list): every move is legal when replayed from `fen`
     - duplicate ids between positions
   Usage:   node tools/fen-scan.mjs [content.json] [--md report.md] [--json report.json]
   Needs:   npm i chess.js@0.10.3   (in this folder or anywhere Node can find it; the site itself has no npm dependencies)
   Exit code 1 when there is at least one error (warnings never fail). */
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let CH;
try { CH = require("chess.js"); } catch (e) { console.error("chess.js not found. Run: npm i chess.js@0.10.3"); process.exit(2); }
const Chess = CH.Chess || CH;

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const file = args.find((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--"))) || "content.json";
const SELF = args.includes("--self-test");
const data = SELF ? null : JSON.parse(fs.readFileSync(file, "utf8"));

const FEN_RX = /^[rnbqkpRNBQKP1-8]+(\/[rnbqkpRNBQKP1-8]+){7}(\s|$)/;
const issues = [];           // {sev, code, path, fen, msg}
let fenCount = 0, solCount = 0, lmCount = 0;
const add = (sev, code, path, fen, msg) => issues.push({ sev, code, path, fen, msg });

function board(fen) {        // 8x8 array, rank 8 first
  return fen.split(" ")[0].split("/").map((row) => {
    const out = [];
    for (const ch of row) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null); else out.push(ch); }
    return out;
  });
}
const sq = (b, name) => b[8 - +name[1]][name.charCodeAt(0) - 97];

function checkFen(raw, path) {
  fenCount++;
  const f = String(raw).trim().replace(/\s+/g, " ");
  const parts = f.split(" ");
  if (parts.length < 4) { add("error", "fields", path, f, "A FEN needs at least 4 fields (pieces, side, castling, en passant)."); return null; }
  if (parts.length < 6) add("warn", "short", path, f, "Short FEN (" + parts.length + " fields). The app pads it, but a full FEN is safer.");
  const full = parts.length >= 6 ? f : (parts.concat(["0", "1"]).slice(0, 6)).join(" ");
  const v = new Chess().validate_fen ? new Chess().validate_fen(full) : { valid: true };
  if (!v.valid) { add("error", "structure", path, f, v.error || "Invalid FEN structure."); return null; }
  const b = board(full), turn = parts[1];
  const count = {}; let wk = null, bk = null;
  b.forEach((row, r) => row.forEach((p, c) => { if (!p) return; count[p] = (count[p] || 0) + 1; if (p === "K") wk = [r, c]; if (p === "k") bk = [r, c]; }));
  if ((count.K || 0) !== 1 || (count.k || 0) !== 1) add("error", "kings", path, f, "Each side needs exactly one king (white " + (count.K || 0) + ", black " + (count.k || 0) + ").");
  if (b[0].some((p) => p === "P" || p === "p") || b[7].some((p) => p === "P" || p === "p")) add("error", "pawn-rank", path, f, "A pawn stands on the 1st or 8th rank.");
  for (const [side, P, Q, R, B, N] of [["white", "P", "Q", "R", "B", "N"], ["black", "p", "q", "r", "b", "n"]]) {
    const pawns = count[P] || 0, extra = Math.max(0, (count[Q] || 0) - 1) + Math.max(0, (count[R] || 0) - 2) + Math.max(0, (count[B] || 0) - 2) + Math.max(0, (count[N] || 0) - 2);
    const total = Object.entries(count).filter(([k]) => (side === "white" ? k === k.toUpperCase() : k === k.toLowerCase())).reduce((s, [, n]) => s + n, 0);
    if (pawns > 8) add("error", "pawns", path, f, side + " has " + pawns + " pawns.");
    if (total > 16) add("error", "pieces", path, f, side + " has " + total + " pieces.");
    if (extra > 8 - pawns) add("error", "promotions", path, f, side + " has more extra pieces (" + extra + ") than missing pawns (" + (8 - pawns) + ").");
  }
  if (wk && bk && Math.abs(wk[0] - bk[0]) <= 1 && Math.abs(wk[1] - bk[1]) <= 1) add("error", "kings-adjacent", path, f, "The two kings touch each other.");
  let g = null;
  try { g = new Chess(full); } catch (e) { g = null; }
  if (!g || g.fen().split(" ")[0] !== full.split(" ")[0]) { add("error", "load", path, f, "chess.js cannot load this position."); return null; }
  // the side that is NOT to move must not be in check
  try {
    const flipped = full.split(" "); flipped[1] = turn === "w" ? "b" : "w"; flipped[3] = "-";
    const h = new Chess(flipped.join(" "));
    if (h.in_check && h.in_check()) add("error", "illegal-check", path, f, "The side that just moved is in check: this position cannot arise in a game.");
  } catch (e) { /* ignore */ }
  // castling rights against the pieces
  const cs = parts[2];
  const need = { K: [["e1", "K"], ["h1", "R"]], Q: [["e1", "K"], ["a1", "R"]], k: [["e8", "k"], ["h8", "r"]], q: [["e8", "k"], ["a8", "r"]] };
  if (cs !== "-") for (const c of cs) if (need[c]) for (const [s, p] of need[c]) if (sq(b, s) !== p) add("warn", "castling", path, f, "Castling right '" + c + "' but " + s + " does not hold " + p + ".");
  // en passant square
  const ep = parts[3];
  if (ep !== "-") {
    const okRank = (turn === "w" && ep[1] === "6") || (turn === "b" && ep[1] === "3");
    if (!okRank) add("warn", "en-passant", path, f, "En passant square " + ep + " does not fit the side to move.");
    else { const pawnSq = ep[0] + (turn === "w" ? "5" : "4"); if (sq(b, pawnSq) !== (turn === "w" ? "p" : "P")) add("warn", "en-passant", path, f, "En passant square " + ep + " but there is no pawn on " + pawnSq + "."); }
  }
  return { full, g, b, turn };
}

function checkObject(o, path) {
  if (typeof o.fen !== "string") return;
  const r = checkFen(o.fen, path + ".fen");
  if (!r) return;
  if (r.g.game_over && r.g.game_over()) add("warn", "game-over", path + ".fen", o.fen, "The start position is already checkmate / stalemate / a draw.");
  if (Array.isArray(o.lastMove) && o.lastMove.length === 2 && o.lastMove.every((x) => typeof x === "string")) {
    lmCount++;
    const [from, to] = o.lastMove, justMoved = r.turn === "w" ? "b" : "w";
    const p = /^[a-h][1-8]$/.test(to) ? sq(r.b, to) : null;
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) add("error", "lastMove", path + ".lastMove", o.fen, "lastMove is not two squares: " + o.lastMove.join(","));
    else {
      if (!p || (p === p.toUpperCase() ? "w" : "b") !== justMoved) add("error", "lastMove", path + ".lastMove", o.fen, "lastMove " + from + "-" + to + ": no " + (justMoved === "w" ? "white" : "black") + " piece on " + to + ".");
      if (sq(r.b, from)) add("warn", "lastMove", path + ".lastMove", o.fen, "lastMove origin " + from + " is not empty.");
    }
  }
  if (Array.isArray(o.solution_moves)) {
    solCount++;
    const g = new Chess(r.full);
    o.solution_moves.forEach((u, i) => {
      if (typeof u !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) { add("error", "solution", path + ".solution_moves[" + i + "]", o.fen, "Not a UCI move: " + u); return; }
      if (g.__bad) return;
      const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined });
      if (!m) { g.__bad = true; add("error", "solution", path + ".solution_moves[" + i + "]", o.fen, "Illegal move " + u + " (ply " + (i + 1) + " of " + o.solution_moves.length + ") for " + (o.id || "this puzzle") + "."); }
    });
  }
}

// walk everything; every string that is a FEN is checked, objects with fen get the extra checks
const ids = new Map();
const seenFenPaths = new Set();
const fenPart = (s) => String(s).trim().split(/\s+[\u2014\u2013]\s+/)[0];   // "FEN \u2014 comment" lines in lesson text
function scan(data) {
(function walk(o, path) {
  if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === "string" && FEN_RX.test(v.trim())) checkFen(fenPart(v), path + "[" + i + "]"); else walk(v, path + "[" + i + "]"); }); return; }
  if (o && typeof o === "object") {
    if (typeof o.fen === "string") {
      checkObject(o, path); seenFenPaths.add(path + ".fen");
      if (o.id) { const k = String(o.id); if (!ids.has(k)) ids.set(k, []); ids.get(k).push(path); }
    }
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string" && FEN_RX.test(v.trim()) && !seenFenPaths.has(path + "." + k)) { if (k === "fen") continue; checkFen(fenPart(v), path + "." + k); }
      else if (v && typeof v === "object") walk(v, path + "." + k);
    }
  }
})(data, "$");
for (const [id, paths] of ids) if (paths.length > 1) add("warn", "duplicate-id", paths[0], "", "Id '" + id + "' is used " + paths.length + " times (" + paths.slice(0, 3).join(", ") + (paths.length > 3 ? ", ..." : "") + ").");
}

if (SELF) {
  // proves the scanner really catches what it claims to catch
  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  scan({ ok: { id: "ok", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", solution_moves: ["e7e5", "g1f3"], lastMove: ["e2", "e4"] },
    a: { id: "twoKings", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBKR w KQkq - 0 1" },
    b: { id: "pawnRank8", fen: "Pnbqkbnr/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBNR w KQkq - 0 1" },
    c: { id: "badSol", fen: START, solution_moves: ["e2e4", "e7e5", "e4e6"] },
    d: { id: "illegalCheck", fen: "4k3/8/8/8/8/8/4R3/4K3 w - - 0 1" },
    e: { id: "lastMove", fen: START, lastMove: ["a2", "a3"] },
    f: { id: "short", fen: "8/8/8/8/8/8/8/K6k w - -" },
    g: { id: "dup", fen: START }, h: { id: "dup", fen: START },
    i: { id: "castle", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/4K2R w KQkq - 0 1" },
    j: ["R7/P5k1/8/8/8/8/r7/6K1 w - - 0 1 \u2014 Draw: comment text"] });
  const codes = new Set(issues.map((i) => i.sev + ":" + i.code));
  const want = ["error:kings", "error:pawn-rank", "error:solution", "error:illegal-check", "error:lastMove", "warn:short", "warn:duplicate-id", "warn:castling"];
  const miss = want.filter((c) => !codes.has(c)), bad = issues.filter((i) => /ok\b/.test(i.path) && i.sev === "error");
  console.log("self-test: " + (want.length - miss.length) + "/" + want.length + " expected findings present" + (miss.length ? ", MISSING " + miss.join(",") : "") + "; clean position flagged: " + bad.length + "; array FEN lines checked: " + (fenCount === 11 ? "yes" : "no (" + fenCount + ")"));
  process.exit(miss.length || bad.length || fenCount !== 11 ? 1 : 0);
}
scan(data);
const errors = issues.filter((i) => i.sev === "error"), warns = issues.filter((i) => i.sev === "warn");
const byCode = {}; for (const i of issues) byCode[i.sev + ":" + i.code] = (byCode[i.sev + ":" + i.code] || 0) + 1;
const summary = { file, fens: fenCount, positionsWithSolution: solCount, positionsWithLastMove: lmCount, errors: errors.length, warnings: warns.length, byCode };
console.log(JSON.stringify(summary, null, 1));
for (const i of errors.slice(0, 25)) console.log("ERROR  " + i.code.padEnd(14) + " " + i.path + "  " + i.msg);
if (errors.length > 25) console.log("... " + (errors.length - 25) + " more errors (see the report)");

const md = opt("--md");
if (md) {
  const row = (i) => "| " + i.sev + " | " + i.code + " | `" + i.path + "` | " + i.msg.replace(/\|/g, "/") + (i.fen ? " <br>`" + i.fen + "`" : "") + " |";
  const out = ["# FEN scan report", "", "File: `" + file + "`. Read-only scan: nothing in the course data was changed.", "",
    "- FENs checked: **" + fenCount + "**; positions with a solution replayed: **" + solCount + "**; positions with `lastMove` checked: **" + lmCount + "**",
    "- Errors: **" + errors.length + "**; warnings: **" + warns.length + "**", "",
    "| Kind | Count |", "|---|---|", ...Object.entries(byCode).sort().map(([k, n]) => "| " + k + " | " + n + " |"), "",
    "## Errors (fix these first)", "", errors.length ? "| Sev | Code | Where | What |\n|---|---|---|---|\n" + errors.slice(0, 300).map(row).join("\n") : "None.", "",
    "## Warnings", "", warns.length ? "| Sev | Code | Where | What |\n|---|---|---|---|\n" + warns.slice(0, 300).map(row).join("\n") : "None.", ""];
  fs.writeFileSync(md, out.join("\n"));
}
const js = opt("--json"); if (js) fs.writeFileSync(js, JSON.stringify({ summary, issues }, null, 1));
process.exit(errors.length ? 1 : 0);
