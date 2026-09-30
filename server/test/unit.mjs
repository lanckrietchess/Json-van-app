import fs from 'node:fs';
import crypto from 'node:crypto';
import worker from '../arena-worker.js';
import { makeD1 } from './d1shim.mjs';
const env = { DB: makeD1(), ADMIN_TOKEN: 'test-admin-token-0123456789', ALLOWED_ORIGINS: 'https://hub.test', PID_SALT: 'unit', MAX_PUZZLES: '6', CONTENT_URL: 'https://content.test/content.json', ANTHROPIC_API_KEY: 'sk-test-key' };
const H = (k) => crypto.createHash('sha256').update('lc-key|' + k.toUpperCase()).digest('hex');
const CONTENT = { app: 'lanckrietchess-hub', keys: [{ tier: 'vault', sha256: H('LC-VAULT-ANNA'), label: 'Anna' }, { tier: 'community', sha256: H('LC-COMM-CAS'), label: 'Cas' }, { tier: 'mentor', sha256: H('LC-OLD-MENTOR'), label: 'Old', exp: '2020-01-01' }, { tier: 'vault', sha256: H('LC-OFF-VAULT'), label: 'Off', revoked: true }], gates: { coachChat: 'vault' }, settings: { leaderboard: { minPuzzles: 3, weights: { accuracy: 0.7, speed: 0.2, gain: 0.1 } } }, bots: { coachPaid: 'Always end with one MSPC question for {coach}.' } };
let lastAI = null, aiMode = 'ok';
/* Public profiles for elo_verify: Chess.com (profile + stats) and Lichess. */
const PROFILES = { 'https://api.chess.com/pub/player/kyenzo': { username: 'kyenzo', url: 'https://www.chess.com/member/Kyenzo', avatar: 'https://images.chesscomfiles.com/a.png', location: 'Ghent LC-ABC234', name: 'K' },
  'https://api.chess.com/pub/player/kyenzo/stats': { chess_rapid: { last: { rating: 2105 } }, chess_blitz: { last: { rating: 1990 } } },
  'https://api.chess.com/pub/player/bram/stats': { chess_rapid: { last: { rating: 1500 } } }, 'https://api.chess.com/pub/player/bram': { username: 'bram', location: 'LC-BRAM22' },
  'https://lichess.org/api/user/anna': { username: 'Anna', profile: { location: 'nowhere' }, perfs: { rapid: { rating: 1800, games: 10 } } } };
const profileMock = (url) => (PROFILES[url] ? new Response(JSON.stringify(PROFILES[url]), { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('{}', { status: 404 }));
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  url = String(url);
  if (url.startsWith('https://content.test/')) return new Response(JSON.stringify(CONTENT), { status: 200, headers: { 'content-type': 'application/json' } });
  if (url.startsWith('https://api.chess.com/pub/player/') || url.startsWith('https://lichess.org/api/user/')) return profileMock(url);
  if (url.startsWith('https://api.anthropic.com/')) {
    lastAI = { headers: init.headers, body: JSON.parse(init.body) };
    if (aiMode === 'busy') return new Response(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529 });
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Look at d6: after Ngf6 the knight check there is mate.' }], usage: { input_tokens: 1200, output_tokens: 40 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, init);
};
await env.DB.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
let fails = 0;
const call = async (body, method) => {
  const r = await worker.fetch(new Request('https://arena.test/', { method: method || 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://hub.test' }, body: (method || 'POST') === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined }), env, { waitUntil() {} });
  const t = await r.text();
  return { status: r.status, cors: r.headers.get('Access-Control-Allow-Origin'), j: t ? JSON.parse(t) : null };
};
const check = (label, ok, got) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + label + (ok ? '' : '  got ' + JSON.stringify(got))); };
const DAY = 864e5, isoWeek = (ms) => { const d = new Date(ms), t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), day = new Date(t).getUTCDay() || 7, th = new Date(t + (4 - day) * DAY), y = th.getUTCFullYear(); return y + '-W' + String(Math.ceil(((th - Date.UTC(y, 0, 1)) / DAY + 1) / 7)).padStart(2, '0'); };
const cur = isoWeek(Date.now()), last = isoWeek(Date.now() - 7 * DAY);
const dev = (x) => 'd-' + x.repeat(14);
const FEN = 'r1bqkbnr/pp1npppp/2p5/8/3PN3/8/PPP1QPPP/R1B1KBNR b KQkq - 2 5';

let r = await call(null, 'GET'); check('GET health', r.j.ok && r.j.service === 'lanckriet-arena', r.j);
r = await call(null, 'OPTIONS'); check('OPTIONS preflight + CORS origin', r.status === 204 && r.cors === 'https://hub.test', r);
r = await call('{nope'); check('bad json', r.status === 400 && r.j.reason === 'bad_json', r.j);
r = await call({ action: 'drop_tables' }); check('unknown action', r.j.reason === 'unknown_action', r.j);
r = await call({ action: 'toString' }); check('prototype action name refused', r.j.reason === 'unknown_action', r.j);
r = await call({ action: 'hello', device: 'x' }); check('bad device', r.j.reason === 'bad_device', r.j);
const A = (await call({ action: 'hello', device: dev('a'), name: 'Anna' })).j.pid, B = (await call({ action: 'hello', device: dev('b'), name: 'Bram <b>' })).j.pid;
check('pid deterministic, not the device', A === (await call({ action: 'hello', device: dev('a') })).j.pid && A.length === 14 && A !== dev('a'), A);

for (const [d, n, s] of [['a', 'Anna', 12], ['b', 'Bram <b>', 7], ['c', 'Cas', 3]]) await call({ action: 't5_sync', device: dev(d), name: n, wk: cur, metric: 'mspc', score: s });
r = await call({ action: 't5_sync', device: dev('b'), wk: cur, metric: 'mspc', score: 7, friends: [A] });
check('board order, ranks, friend flag, name cleaned', JSON.stringify(r.j.board.map((x) => [x.name, x.score, x.rank, x.me, x.friend])) === JSON.stringify([['Anna', 12, 1, false, true], ['Bram b', 7, 2, true, false], ['Cas', 3, 3, false, false]]) && r.j.rank === 2 && r.j.players === 3, r.j);
r = await call({ action: 't5_sync', device: dev('c'), wk: cur, metric: 'mspc', score: 900 }); check('score jump capped', r.j.score <= 3 + 5 + 1, r.j.score);
r = await call({ action: 't5_sync', device: dev('a'), wk: cur, metric: 'mspc', score: 2 }); check('scores never go down', r.j.score === 12, r.j.score);
r = await call({ action: 't5_sync', device: dev('a'), wk: '2019-W01', metric: 'mspc', score: 2 }); check('old week refused', r.j.reason === 'bad_week', r.j);

for (const [d, s] of [['a', 9], ['b', 5], ['c', 2], ['e', 1]]) await call({ action: 't5_sync', device: dev(d), name: d.toUpperCase(), wk: last, metric: 'mspc', score: s });
const E = (await call({ action: 'hello', device: dev('e') })).j.pid;
r = await call({ action: 'a5_ban', token: 'wrong-token-0000000000000', pid: E, banned: true }); check('ban needs the admin token', r.status === 403, r.j);
r = await call({ action: 'a5_ban', token: env.ADMIN_TOKEN, pid: E, banned: true }); check('admin ban', r.j.changed === 1, r.j);
r = await call({ action: 't5_result', device: dev('a'), wk: last }); check('last week settled, 1st of 3, +3', r.j.settled && r.j.rank === 1 && r.j.players === 3 && r.j.prize === 3 && r.j.first === true, r.j);
r = await call({ action: 't5_result', device: dev('a'), wk: last }); check('prize claimable once', r.j.first === false && r.j.prize === 3, r.j);
r = await call({ action: 't5_result', device: dev('b'), wk: last }); check('2nd place, no prize by default', r.j.rank === 2 && r.j.prize === 0, r.j);
r = await call({ action: 't5_result', device: dev('e'), wk: last }); check('banned player left out', r.j.settled && r.j.rank === 0, r.j);
r = await call({ action: 't5_result', device: dev('a'), wk: cur }); check('running week not settled', r.j.settled === false, r.j);

await call({ action: 'f5_sync', device: dev('a'), card: 'LCF1.' + 'x'.repeat(40), friends: [] });
r = await call({ action: 'f5_sync', device: dev('b'), card: 'not a card', friends: [A, 'BAD!', E] });
check('friend cards: fresh card of A only', r.j.cards.length === 1 && r.j.cards[0].pid === A && r.j.cards[0].card.startsWith('LCF1.'), r.j);

const item = (over) => Object.assign({ route: 'peer', fen: FEN, played: 'Ngf6', best: 'Ndf6', opening: '', elo: 950, num: 5 }, over);
r = await call({ action: 'p5_stage', device: dev('b'), name: 'Bram', items: [item(), item({ route: 'admin', played: 'e5', best: 'e6', opening: 'Caro-Kann', game: { start: FEN, sans: ['e5', 'Nd6#'], side: 'b' } }), item({ fen: 'garbage' }), item({ played: 'Qh9' })] });
check('stage: 2 valid of 4', r.j.added === 2, r.j);
r = await call({ action: 'p5_pool', device: dev('a'), elo: 1000 }); check('pool: A sees the free one', r.j.items.length === 1 && r.j.items[0].played === 'Ngf6', r.j);
r = await call({ action: 'p5_pool', device: dev('b') }); check('pool: not your own', r.j.items.length === 0, r.j);
r = await call({ action: 'a5_list', token: 'nope', status: 'queued' }); check('queue needs admin', r.status === 403, r.j);
r = await call({ action: 'a5_list', token: env.ADMIN_TOKEN, status: 'queued' }); check('admin queue has the game', r.j.items.length === 1 && r.j.items[0].game.sans.length === 2, r.j);
const qid = r.j.items[0].id;
r = await call({ action: 'a5_set', token: env.ADMIN_TOKEN, id: qid, status: 'done' }); check('admin marks it done', r.j.changed === 1, r.j);
r = await call({ action: 'a5_list', token: env.ADMIN_TOKEN, status: 'queued' }); check('queue empty after', r.j.items.length === 0, r.j);
r = await call({ action: 'p5_stage', device: dev('c'), items: [item({ played: 'Qa5', best: 'e6' })] });
r = await call({ action: 'p5_stage', device: dev('a'), items: [item({ played: 'Qa5', best: 'e6', route: 'admin', opening: 'Caro-Kann', game: { start: FEN, sans: ['Qa5'], side: 'b' } })] });
r = await call({ action: 'a5_list', token: env.ADMIN_TOKEN, status: 'queued' }); check('a repertoire copy lifts a free one into the admin queue', r.j.items.length === 1 && r.j.items[0].played === 'Qa5' && r.j.items[0].game && r.j.items[0].pid === A, r.j);
r = await call({ action: 'p5_pool', device: dev('b') }); check('and it leaves the free pool', !r.j.items.some((x) => x.played === 'Qa5'), r.j);
const many = []; for (let i = 0; i < 8; i++) many.push(item({ played: 'Nh6', best: 'e6', fen: FEN.replace(' 2 5', ' 2 ' + (10 + i)) }));
await call({ action: 'p5_stage', device: dev('f'), items: many.slice(0, 8) });
r = await call({ action: 'a5_list', token: env.ADMIN_TOKEN, status: 'live', limit: 100 }); check('ring buffer keeps MAX_PUZZLES (6)', r.j.items.length <= 6, r.j.items.length);
let slow = null; for (let i = 0; i < 6 && !slow; i++) { const x = await call({ action: 'p5_stage', device: dev('g'), items: many.slice(0, 8) }); if (!x.j.ok) slow = x; }
check('staging quota (40 a day) enforced', slow && slow.status === 429 && slow.j.reason === 'slow_down', slow && slow.j);
r = await call({ action: 'hello', device: dev('h'), extra: 'x'.repeat(100000) }); check('body size limit', r.status === 413, r.status);

// ---- v2: member keys and the AI coach ----
r = await call({ token: 'LC-VAULT-ANNA', app: 'x' }); check('verify (the hub sends no action) a valid key', r.status === 200 && r.j.valid === true && r.j.tier === 'vault' && r.j.label === 'Anna', r.j);
r = await call({ token: 'LC-NOPE-12345' }); check('verify an unknown key', r.j.valid === false && r.j.reason === 'invalid', r.j);
r = await call({ token: 'LC-OFF-VAULT' }); check('verify a switched-off key', r.j.valid === false && r.j.reason === 'revoked', r.j);
r = await call({ token: 'LC-OLD-MENTOR' }); check('verify an expired key', r.j.reason === 'expired', r.j);
r = await call({ action: 'activate', device: dev('m'), token: 'lc-vault-anna' }); check('activate (any case) binds device M', r.j.ok && r.j.tier === 'vault', r.j);
r = await call({ action: 'activate', device: dev('n'), token: 'LC-VAULT-ANNA' }); check('second device refused: one device per key', r.j.ok === false && r.j.reason === 'bound', r.j);
r = await call({ action: 'check', device: dev('m'), hash: H('LC-VAULT-ANNA') }); check('check on the bound device', r.j.ok === true, r.j);
r = await call({ action: 'check', device: dev('n'), hash: H('LC-VAULT-ANNA') }); check('check elsewhere: bound', r.j.reason === 'bound', r.j);
r = await call({ action: 'check', device: dev('n'), hash: H('LC-COMM-CAS') }); check('check a key never activated: unbound', r.j.reason === 'unbound', r.j);
r = await call({ action: 'reset', hash: H('LC-VAULT-ANNA'), secret: 'wrong' }); check('reset needs the admin secret', r.j.ok === false && r.j.reason === 'not_admin', r.j);
r = await call({ action: 'reset', hash: H('LC-VAULT-ANNA'), secret: env.ADMIN_TOKEN }); check('reset by the admin (the hub\'s keys screen)', r.j.ok && r.j.removed === 1, r.j);
const vars = { coach: 'Kyenzo', peak: '2105', percentile: 'top 1%', fasttrack: 'two years' };
const ask = (over) => call(Object.assign({ action: 'chat', bot: 'coachPaid', device: dev('n'), messages: [{ role: 'assistant', content: 'Hi' }, { role: 'user', content: 'What does Qe2 threaten?' }], context: { fen: FEN, side: 'b', last_move: 'Qe2' }, vars }, over));
delete env.ANTHROPIC_API_KEY; r = await ask({ token: 'LC-VAULT-ANNA' }); check('no API key: the AI is off', r.j.reason === 'no_ai', r.j); env.ANTHROPIC_API_KEY = 'sk-test-key';
r = await ask({}); check('free player: no AI', r.j.ok === false && r.j.reason === 'invalid', r.j);
r = await ask({ token: 'LC-COMM-CAS' }); check('community key is below the coachChat level', r.j.reason === 'tier', r.j);
r = await ask({ bot: 'sales', token: 'LC-VAULT-ANNA' }); check('the sales bot is not served', r.j.reason === 'bot_off', r.j);
r = await ask({ token: 'LC-VAULT-ANNA' }); check('member gets an answer (a typed key claims this device)', r.j.ok && /d6/.test(r.j.reply) && r.j.tier === 'paid', r.j);
check('Claude request: key, API version, model, max_tokens, cleaned messages', lastAI && lastAI.headers['x-api-key'] === 'sk-test-key' && lastAI.headers['anthropic-version'] === '2023-06-01' && lastAI.body.model === 'claude-haiku-4-5-20251001' && lastAI.body.max_tokens === 700 && lastAI.body.messages.length === 1 && lastAI.body.messages[0].role === 'user', lastAI && { h: lastAI.headers, model: lastAI.body.model, m: lastAI.body.messages });
check('system prompt: server rules, MSPC prompt with vars, own instructions, board context', /^Server rules/.test(lastAI.body.system) && /MSPC System/.test(lastAI.body.system) && /2105 peak on Chess\.com \(top 1% worldwide\)/.test(lastAI.body.system) && /Always end with one MSPC question for Kyenzo/.test(lastAI.body.system) && lastAI.body.system.includes('<board_context>') && lastAI.body.system.includes(FEN), lastAI.body.system.slice(0, 300));
r = await ask({ hash: H('LC-VAULT-ANNA') }); check('the bound device may use the hash', r.j.ok === true, r.j);
r = await ask({ device: dev('m'), hash: H('LC-VAULT-ANNA') }); check('another device with only the hash: bound elsewhere', r.j.reason === 'bound', r.j);
r = await ask({ token: 'LC-VAULT-ANNA', messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }] }); check('the conversation must end with the student', r.j.reason === 'empty', r.j);
aiMode = 'busy'; r = await ask({ token: 'LC-VAULT-ANNA' }); check('Claude overloaded: busy', r.j.reason === 'busy', r.j); aiMode = 'ok';
env.AI_DAILY = '2'; r = await ask({ token: 'LC-VAULT-ANNA' }); check('daily limit per member', r.j.reason === 'limit', r.j); delete env.AI_DAILY;
r = await call({ action: 'preview', bot: 'coachPaid', device: dev('k'), secret: 'nope', messages: [{ role: 'user', content: 'Test' }] }); check('preview needs the admin secret', r.j.reason === 'not_admin', r.j);
r = await call({ action: 'preview', bot: 'coachPaid', device: dev('k'), secret: env.ADMIN_TOKEN, instructions: 'NEW PROMPT TEXT', messages: [{ role: 'user', content: 'Test' }] });
check('admin preview uses the new instructions', r.j.ok && lastAI.body.system.includes('NEW PROMPT TEXT') && !lastAI.body.system.includes('Always end with one MSPC question'), r.j);
r = await call({ action: 'chat', bot: 'content', device: dev('k'), secret: env.ADMIN_TOKEN, instructions: 'Write video scripts.', messages: [{ role: 'user', content: 'Script please' }], context: { session: 1 } });
check('admin content bot', r.j.ok && lastAI.body.max_tokens === 1600 && lastAI.body.system.includes('Write video scripts.'), r.j);
r = await call({ action: 'chat', bot: 'content', device: dev('k'), messages: [{ role: 'user', content: 'Script' }] }); check('content bot without the secret', r.j.reason === 'not_admin', r.j);
r = await call({ action: 'a5_members', token: env.ADMIN_TOKEN }); const anna = (r.j.members || []).filter((x) => x.label === 'Anna')[0];
check('members overview: Anna on 1 device, 2 answers today, 4 in total', r.j.ai === true && anna && anna.devices === 1 && anna.today === 2 && r.j.today.n === 4 && r.j.today.input === 4800, r.j);
r = await call({ action: 'a5_unbind', token: env.ADMIN_TOKEN, hash: H('LC-VAULT-ANNA') }); check('admin reset from the Arena console', r.j.removed === 1, r.j);
{
  let hit = null;
  for (let i = 0; i < 125 && hit === null; i++) {
    const rq = await worker.fetch(new Request('https://arena.test/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://hub.test', 'CF-Connecting-IP': '203.0.113.9' }, body: JSON.stringify({ action: 'verify', token: 'LC-GUESS-' + i }) }), env, { waitUntil() {} });
    if (rq.status === 429) hit = i;
  }
  check('guessing keys: the 121st check from one IP in a day is refused', hit === 120, hit);
  const other = await worker.fetch(new Request('https://arena.test/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10' }, body: JSON.stringify({ action: 'verify', token: 'LC-GUESS-X', __ip: '203.0.113.9' }) }), env, { waitUntil() {} });
  check('another IP is not affected, and a client cannot fake its IP', other.status === 200, other.status);
}
// ---- v3: the community protocol ----
{
  /* The hub's own scoring functions, straight from index.html, to prove the server's copy ranks the same. */
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const hub = new Function(html.slice(html.indexOf('const LC_PAR = {'), html.indexOf('\nconst BRACKET_LABEL')) + '; return { lcPeriod, lcScore };')();
  const t0 = Date.now(), att = (id, a, over) => Object.assign({ id, k: 'think', c: 'middlegame', a, ms: 20000, mv: 2, d: 1300, t: t0 - 60000 }, over);
  const annaAtt = [att('d1', 1), att('d2', 1), att('d3', 0.5), att('d4', 1, { c: 'hard', k: 'hard' }), att('d5', 1, { ms: 100 })];   // d5: faster than a human, ignored
  r = await call({ action: 'lb_sync', device: dev('z'), bracket: 'climber', attempts: annaAtt }); check('lb_sync needs a name', r.j.reason === 'name', r.j);
  r = await call({ action: 'lb_sync', device: dev('a'), name: 'Anna', bracket: 'climber', attempts: annaAtt.concat([{ id: 'custom:x', a: 1, t: t0 }, { id: 'old', a: 1, t: t0 - 500 * DAY }]) });
  check('lb_sync stores the valid attempts only', r.j.ok && r.j.added === 5 && r.j.mine.n === 4 && r.j.mine.ranked === true, r.j);
  const hubScore = hub.lcScore(annaAtt, Object.assign({ min: 3, w: CONTENT.settings.leaderboard.weights }, hub.lcPeriod('week')));
  await call({ action: 'lb_sync', device: dev('b'), name: 'Bram', bracket: 'builder', attempts: [att('d1', 0), att('d2', 1)] });
  r = await call({ action: 'lb_top', period: 'week', device: dev('a') });
  check('lb_top: the server score is the hub\'s lcScore with the published weights', r.j.rows.length === 1 && r.j.rows[0].score === hubScore.score && r.j.rows[0].you === true && r.j.rows[0].rank === 1 && r.j.rows[0].acc === Math.round(hubScore.acc * 100) && r.j.total === 1, { got: r.j, hub: hubScore.score });
  r = await call({ action: 'lb_top', period: 'week', device: dev('b') }); check('lb_top: an unranked player sees their own row', r.j.you && r.j.you.rank === 0 && r.j.you.n === 2 && !r.j.rows.some((x) => x.you), r.j);
  r = await call({ action: 'lb_top', period: 'month', device: dev('a') }); check('lb_top: month and all time', r.j.rows.length === 1 && /^m\d{4}-\d{2}$/.test(r.j.period), r.j);
  const many = []; for (let i = 0; i < 24; i++) many.push(att('v' + i, i < 22 ? 1 : 0, { c: i < 6 ? 'hard' : 'endgame' }));
  await call({ action: 'lb_sync', device: dev('c'), name: 'Cas', attempts: many });
  r = await call({ action: 'lb_volume', period: 'week', cat: 'all', sort: 'solved', device: dev('a') });
  check('lb_volume: 20 solved to rank, Anna (4) is not on it', r.j.rows.length === 1 && r.j.rows[0].name === 'Cas' && r.j.rows[0].ok === 22 && r.j.rows[0].n === 24 && r.j.rows[0].hardN === 6 && r.j.you === null, r.j);
  r = await call({ action: 'lb_volume', period: 'week', cat: 'endgame', sort: 'accuracy', device: dev('c') }); check('lb_volume: per category, accuracy', r.j.rows[0].you && r.j.rows[0].n === 18 && r.j.rows[0].acc === 89, r.j);
  r = await call({ action: 'lb_volume', period: 'week', cat: 'all', sort: 'hard', device: dev('c') }); check('lb_volume: Hard Mode needs 5 Hard puzzles', r.j.rows.length === 1 && r.j.rows[0].hardAcc === 100, r.j);
  r = await call({ action: 'lb_admin', secret: 'wrong-secret-0000000000', op: 'list' }); check('lb_admin needs the admin token', r.status === 403 && r.j.reason === 'forbidden', r.j);
  r = await call({ action: 'lb_admin', secret: env.ADMIN_TOKEN, op: 'list' }); const cas = r.j.players.filter((x) => x.name === 'Cas')[0];
  check('lb_admin list: names, pids (never device ids)', r.j.players.length === 3 && cas && cas.device !== dev('c') && /^[a-z0-9]{14}$/.test(cas.device), r.j);
  r = await call({ action: 'lb_admin', secret: env.ADMIN_TOKEN, op: 'hide', target: cas.device }); check('lb_admin hide', r.j.players.filter((x) => x.name === 'Cas')[0].hidden === true, r.j);
  r = await call({ action: 'lb_volume', period: 'week', cat: 'all', sort: 'solved', device: dev('a') }); check('a hidden player leaves the boards', r.j.rows.length === 0, r.j);
  await call({ action: 'lb_forget', device: dev('c') });
  r = await call({ action: 'lb_admin', secret: env.ADMIN_TOKEN, op: 'list' }); check('lb_forget keeps a hidden player hidden', r.j.players.filter((x) => x.device === cas.device && x.hidden).length === 1, r.j);
  r = await call({ action: 'lb_forget', device: dev('b') }); r = await call({ action: 'lb_top', period: 'week', device: dev('b') });
  check('lb_forget removes the player and their scores', r.j.ok && !r.j.you, r.j);
  for (const tb of ['lb_attempts', 'lb_players', 'ev_events', 'tr_games', 'elo_accounts', 'pz_players', 'vb_items']) {
    const cols = (await env.DB.prepare('SELECT * FROM ' + tb).all()).results;
    if (cols.some((row) => Object.values(row).some((v) => typeof v === 'string' && /^d-[a-z]{14}$/.test(v)))) check('no device id stored in ' + tb, false, tb);
  }

  const anon = 'a-' + 'k'.repeat(20), ev = (e, over) => Object.assign({ e, t: t0 - 1000, k: 'think-1', g: 'MSPC', x: '', v: 0 }, over);
  r = await call({ action: 'ev_sync', anon: 'nope', events: [ev('s')] }); check('ev_sync: bad anon refused', r.j.reason === 'bad_anon', r.j);
  r = await call({ action: 'ev_sync', app: 'lanckrietchess-hub', version: '5.0.0', anon, b: 'climber', events: [ev('s'), ev('f', { v: 40 }), ev('m', { x: '3', q: 'Nf3' }), ev('q', { x: 'plan', q: 'mail me at x@y.com', t: t0 - 500 }), ev('zz')] });
  check('ev_sync: 4 valid events', r.j.saved === 4, r.j);
  await call({ action: 'ev_sync', anon: 'a-' + 'm'.repeat(20), b: 'bogus', events: [ev('s', { t: t0 - 2000 })] });
  r = await call({ action: 'insights', secret: 'nope', days: 30 }); check('insights needs the admin token', r.j.reason === 'forbidden', r.j);
  r = await call({ action: 'insights', secret: env.ADMIN_TOKEN, days: 30 }); const D = r.j.data;
  check('insights: aggregated by the hub\'s lcAggregate, no ids, emails scrubbed', r.j.days === 30 && D.events === 5 && Object.keys(D.users).length === 2 && D.brackets.climber === 1 && D.brackets.unrated === 1 && D.drills['climber|think-1'].s === 1 && D.drills['climber|think-1'].f === 1 && D.questions[0].q === 'mail me at [email]' && !JSON.stringify(D).includes(anon) && r.j.players === 1, r.j);
  // Beacon: the hub sends ev_sync as text/plain.
  const beacon = await worker.fetch(new Request('https://arena.test/', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'ev_sync', anon, b: 'climber', events: [ev('v', { k: 'home', t: t0 - 10 })] }) }), env, { waitUntil() {} });
  check('ev_sync by sendBeacon (text/plain)', (await beacon.json()).saved === 1, beacon.status);

  const game = (g, t, bl, mi) => ({ g, t, bl, mi, n: 20 });
  r = await call({ action: 'tr_sync', device: dev('a'), name: 'Anna', bracket: 'climber', games: [game('g1', t0 - 1000, 1, 1), game('g2', t0 - 2000, 0, 1), game('g3', t0 - 8 * DAY, 3, 2), game('g4', t0 - 9 * DAY, 2, 2), game('bad sig!', t0, 1, 1)], solved: [{ k: 's1', t: t0 - 1000 }, { k: 's2', t: t0 - 3000 }] });
  check('tr_sync: 4 games, 2 solved', r.j.games === 4 && r.j.solved === 2, r.j);
  await call({ action: 'tr_sync', device: dev('e'), name: 'Eve', games: [game('g9', t0 - 1000, 0, 0)], solved: [] });
  r = await call({ action: 'tr_top', period: 'all', sort: 'reviewed', device: dev('a') });
  check('tr_top reviewed (a banned player stays off)', r.j.rows.length === 1 && r.j.rows[0].reviewed === 4 && r.j.rows[0].solved === 2 && r.j.rows[0].you, r.j);
  r = await call({ action: 'tr_top', period: 'all', sort: 'reduction', device: dev('a') }); check('tr_top reduction: 4.5 to 1.5 mistakes a game is 67% fewer', r.j.rows[0] && r.j.rows[0].reduction === 67, r.j);

  const mis = { kind: 'mistake', sig: 'm1', b: 'climber', opening: 'Caro-Kann', phase: 'opening', k: 'M', cls: 'blunder', chapter: 'ck-1', tags: 'loose', fen: FEN, san: 'Ngf6', best: 'd7f6', bestSan: 'Ndf6', num: 5, color: 'b', before: 20, after: -900, t: t0 - 1000 };
  const gm = { kind: 'game', sig: 'g1', b: 'climber', opening: 'Caro-Kann', cls: 'loss', fen: FEN, color: 'b', pgn: '[White "Real Name"]\n[Result "1-0"]\n1. e4 c6', acc: 71, tags: 'blunder:1', t: t0 - 900 };
  r = await call({ action: 'vb_sync', anon, items: [mis, gm, Object.assign({}, mis, { fen: 'x' })] }); check('vb_sync: 2 valid items', r.j.saved === 2, r.j);
  r = await call({ action: 'vb_list', secret: 'nope', kind: 'mistake' }); check('vb_list needs the admin token', r.j.reason === 'forbidden', r.j);
  r = await call({ action: 'vb_list', secret: env.ADMIN_TOKEN, kind: 'mistake', days: 90 }); check('vb_list: the mistake with its tags', r.j.rows.length === 1 && r.j.rows[0].bestSan === 'Ndf6' && r.j.rows[0].after === -900 && r.j.days === 90, r.j);
  r = await call({ action: 'vb_list', secret: env.ADMIN_TOKEN, kind: 'game', days: 30 }); check('vb_list: games keep their moves, not the names', r.j.rows.length === 1 && /1\. e4 c6/.test(r.j.rows[0].pgn) && !/Real Name/.test(r.j.rows[0].pgn), r.j);
  r = await call({ action: 'ev_forget', anon }); r = await call({ action: 'vb_list', secret: env.ADMIN_TOKEN, kind: 'game', days: 30 });
  check('ev_forget deletes the stats and the Vault feed of that id', r.j.rows.length === 0, r.j);

  r = await call({ action: 'elo_verify', device: dev('a'), site: 'chesscom', user: 'kyenzo', code: 'LC-ZZZ999', name: 'Anna' }); check('elo_verify: code missing from the profile', r.j.reason === 'code', r.j);
  r = await call({ action: 'elo_verify', device: dev('a'), site: 'chesscom', user: 'nobody', code: 'LC-ABC234' }); check('elo_verify: unknown account', r.j.reason === 'not-found', r.j);
  r = await call({ action: 'elo_verify', device: dev('a'), site: 'chesscom', user: 'kyenzo', code: 'lc-abc234', name: 'Anna' });
  check('elo_verify: the code in Location, ratings from Chess.com', r.j.ok && r.j.user === 'Kyenzo' && r.j.rapid === 2105 && r.j.blitz === 1990 && r.j.bullet === null && /^https:/.test(r.j.avatar), r.j);
  await call({ action: 'elo_verify', device: dev('b'), site: 'chesscom', user: 'bram', code: 'LC-BRAM22', name: 'Bram' });
  r = await call({ action: 'elo_top', site: 'chesscom', mode: 'rapid', device: dev('b') });
  check('elo_top: verified rapid board', r.j.rows.length === 2 && r.j.rows[0].user === 'Kyenzo' && r.j.rows[0].rating === 2105 && r.j.rows[1].you && r.j.you.rank === 2 && r.j.total === 2, r.j);
  r = await call({ action: 'elo_top', site: 'chesscom', mode: 'blitz', device: dev('b') }); check('elo_top: only players with a rating in that mode', r.j.rows.length === 1, r.j);
  r = await call({ action: 'elo_verify', device: dev('f'), site: 'chesscom', user: 'Kyenzo', code: 'LC-ABC234' }); r = await call({ action: 'elo_top', site: 'chesscom', mode: 'rapid', device: dev('a') });
  check('an account proven again by another player moves to them', r.j.rows.length === 2 && !r.j.rows.some((x) => x.you), r.j);
  r = await call({ action: 'elo_verify', device: dev('a'), site: 'lichess', user: 'Anna', code: 'LC-ABC234' }); check('elo_verify on Lichess checks the profile too', r.j.reason === 'code', r.j);
  r = await call({ action: 'elo_forget', device: dev('b'), site: 'chesscom' }); check('elo_forget', r.j.removed === 1, r.j);
  let lim = null; for (let i = 0; i < 25 && !lim; i++) { const x = await call({ action: 'elo_verify', device: dev('g'), site: 'chesscom', user: 'nobody', code: 'LC-ABC234' }); if (x.j.reason === 'limit') lim = i; }
  check('elo_verify: 20 checks a day, then "limit"', lim === 20, lim);

  r = await call({ action: 'pz_sync', device: dev('a'), name: 'Anna', bracket: 'climber', rating: 1290, peak: 1300, start: 1200, games: 6, wins: 5, trophy: 'gold', results: [] });
  check('pz_sync stores the Puzzle ELO', r.j.ok && r.j.rating === 1290 && r.j.peak === 1300, r.j);
  r = await call({ action: 'pz_sync', device: dev('a'), name: 'Anna', bracket: 'climber', trophy: 'gold', rating: 2800, peak: 2800, start: 400, games: 7, wins: 7 }); check('pz_sync: one more game moves it 48 points at most, the start stays', r.j.rating === 1338 && r.j.games === 7, r.j);
  r = await call({ action: 'pz_sync', device: dev('a'), name: 'Anna', bracket: 'climber', trophy: 'gold', rating: 1300, games: 2, wins: 1 }); check('pz_sync: games never go down', r.j.games === 7 && r.j.rating === 1338, r.j);
  await call({ action: 'pz_sync', device: dev('h'), name: 'Hugo', rating: 1400, start: 1400, games: 3, wins: 3 });
  r = await call({ action: 'pz_top', device: dev('h'), limit: 50 });
  check('pz_top: 5 rated puzzles to appear, trophy and peak', r.j.rows.length === 1 && r.j.rows[0].name === 'Anna' && r.j.rows[0].trophy === 'gold' && r.j.rows[0].peak === 1338 && !r.j.you && r.j.total === 1, r.j);
  r = await call({ action: 'lb_top', period: 'week', device: dev('a') }); check('the Puzzle ELO trophy shows on the other boards', r.j.rows[0].trophy === 'gold', r.j);

  r = await call({ action: 'lb_sync', device: dev('i'), name: 'Ivo', attempts: [] }); await env.DB.exec("UPDATE elo_accounts SET checked = 0, rapid = 1");
  await worker.scheduled({}, env, { waitUntil: (p) => p }); await new Promise((res) => setTimeout(res, 50));
  r = await call({ action: 'elo_top', site: 'chesscom', mode: 'rapid', device: dev('a') }); check('cron refreshes the verified ratings', r.j.rows[0].rating === 2105, r.j);
}
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
