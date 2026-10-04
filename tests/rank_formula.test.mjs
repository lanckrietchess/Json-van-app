// v8 formula ranks: standalone checks, no browser needed.
// Run from the repo root:  node tests/rank_formula.test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const a = html.indexOf('const V6Core = (() => {');
const b = html.indexOf('v6 EXECUTIVE LAYER, part 2');
if (a < 0 || b < 0) throw new Error('V6Core block not found');
const src = html.slice(a, html.lastIndexOf('/* =====', b)) + '\nthis.C = V6Core;';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx);
const C = ctx.C;
let fail = 0;
const t = (name, cond, extra) => { if (!cond) fail++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : '')); };
const feed = (n, hits, bits = '') => { for (let i = 0; i < n; i++) bits = C.pushAnswer(bits, i < hits ? 1 : 0); return bits; };
const near = (x, y) => Math.abs(x - y) < 1e-9;

// Module Rank = Level x Accuracy
const l1 = feed(20, 19);
t('accuracy is read from the window', near(C.accOf(l1).acc, 0.95));
t('clears at 85% over 20 answers', C.clearStep(l1, false) === true);
t('does not clear with fewer than 20 answers', C.clearStep(feed(19, 19), false) === false);
let r = C.moduleRank({ 1: l1 }, { 1: true });
t('Level 1 x 95% = 0.95, Starter, Level 2 opens', near(r.exact, 0.95) && r.name === 'Starter' && r.active === 2 && r.c === 1);
const l2 = feed(20, 16);
r = C.moduleRank({ 1: l1, 2: l2 }, { 1: true });
t('Level 2 x 80% = 1.60, Beginner (not cleared yet)', near(r.exact, 1.6) && r.name === 'Beginner' && r.c === 1);
r = C.moduleRank({ 1: l1, 2: l2, 3: feed(20, 20) }, { 1: true });
t('a locked level gives no rank credit (sequential)', near(r.exact, 1.6) && r.per[2].open === false);
t('hysteresis: stays cleared at 70-75%+, loses it under 75%', C.clearStep(feed(20, 16), true) === true && C.clearStep(feed(20, 14), true) === false);
t('ranks can go down', C.moduleRank({ 1: feed(20, 8) }, {}).exact < r.exact);
// hints and misses
t('hint credit: tier 3 counts as a miss', C.hintCredit(3) === 0 && C.hintCredit(1) === 0.9);
t('a forgiven miss leaves no trace', C.dropMiss('9990') === '999' && C.dropMiss('9999') === '9999');
// Puzzle Rank = ELO x Accuracy
const pz = C.puzzleRank(1500, feed(30, 24));
t('Puzzle Rank = 1500 x 80% = 1200 (Beginner)', pz.value === 1200 && pz.name === 'Beginner');
t('needs 10 puzzles before it places', C.puzzleRank(1500, '99').name === 'Unranked');
// Student / Overall, XP split
const mr = C.moduleRanks({ lv: { openings: { 1: l1 } }, cl: { openings: { 1: true } }, pz: feed(30, 24) }, 1500);
const st = C.studentRank(mr);
t('student rank is the weighted mean of module ranks', st.exact > 0 && st.name !== 'Unranked');
t('XP Level comes from XP only', C.levelOf(960).level === 5 && C.levelOf(0).level === 1);
t('ladder is the five tiers', C.CFG.ranks.map((x) => x[0]).join() === 'Unranked,Starter,Beginner,Intermediate,Advanced,Master');
// decay follows the level
t('decay window shrinks with the level', [1, 2, 3, 4, 5].map(C.decayFor).join() === '30,21,14,10,7');
t('Active Frontline uses the level window', C.filterLines([{ id: 'a', lvl: 5 }, { id: 'b', lvl: 1 }], 'frontline', { progress: { a: { last: Date.now() - 8 * 864e5 }, b: { last: Date.now() - 8 * 864e5 } } }).map((x) => x.id).join() === 'a');
// flow anchors from the spec
t('flow x3 = 1.05, x10 = 1.35, x50 = 2.50', [3, 10, 50].map(C.flowMult).join() === '1.05,1.35,2.5');
// loyalty
t('loyalty badges by account age', C.loyaltyEarned(200).map((x) => x[1]).join() === 'Month One,Quarter Club,Half-Year Member' && C.loyaltyNext(200)[0] === 365);
// Anti-Ragequit soft landing (keep 20% of the bonus) and the fixed rescue price
const now = Date.now();
t('soft landing: x1.8 chain lost -> x1.16 inside the window', near(C.flowNow({ count: 0, protect: { count: 25, got: 0, until: now + 1e5 } }, now), 1.16));
t('window over -> back to the live chain', C.flowNow({ count: 0, protect: { count: 25, got: 0, until: now - 1 } }, now) === 1);
t('streak rescue costs a fixed 2 tokens', [1, 9, 40, 400].map(C.rescueCost).join() === '2,2,2,2');
process.exit(fail ? 1 : 0);
