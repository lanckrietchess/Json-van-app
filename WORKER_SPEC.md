# Arena server: new actions for v6.1 (optional)

The hub works without these. Without them the Rank and Level leaderboards show you and your friends, and the
Proof Queue works from this device, the watchlist and the codes students send you.
All actions are POSTed to the existing Arena/community endpoint as JSON: `{ app, version, action, ... }`.
Reply `{ ok: true, ... }` or `{ ok: false, reason: "..." }`, like the existing `elo_top` and `lb_sync`.

## rk_sync (players who joined the board; the client sends it at most every 30 minutes)
Request: `{ action: "rk_sync", device, name, xp, level, student, arena, overall, modules: { openings: { xp, rank }, middlegame, endgame, puzzles, think } }`
(`rank` = fractional rank index 0 to 8, `arena` = Arena rating or 0). Upsert by `device`; keep the latest values.

## rk_top
Request: `{ action: "rk_top", kind, device }` where kind is `"module:think" | "module:openings" | "module:middlegame" | "module:endgame" | "module:puzzles" | "arena" | "overall" | "level"`.
Reply: `{ ok: true, total, you: { rank }, rows: [ { rank, name, label, sub, you } ] }`, top 50, sorted by the matching value
(module rank, arena rating, overall rank, xp). `label` is the text shown (e.g. "Advanced", "Gold · 1480", "Level 12"); `sub` is optional small text (e.g. "5,200 XP"). Set `you: true` on the caller's row.

## elo_proof (a student pressed "Share with Kyenzo")
Request: `{ action: "elo_proof", device, code }` where code is `LCP1.<base64url JSON>` (v, n name, s site, u user, m mode, a start rating, b end rating, t0, t1, g gain, d days). Validate and store.

## elo_proof_list (admin, "Fetch from the Arena server" in the Proof Queue)
Request: `{ action: "elo_proof_list", secret }` (the same admin secret as `insights`). Reply: `{ ok: true, rows: [ { code } ] }` (or an array of code strings).
