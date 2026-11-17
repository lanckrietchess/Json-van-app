/* 9.52.0: the intro week in the DEPLOYED Arena code (arena/): a new free device gets 3 tokens a day for 7 days (week1 + week1Ends in the token
   state, which the app's LC34 and the Day-7 pop-up LC90 read), then 1. The old functions/arena copy had this; the deployed code did not.
   Needs a local PostgreSQL and `npm install` in tests/:
     createdb lc89a && psql -d lc89a -f tests/sql/arena_lc35_stub.sql -f tests/sql/arena_tokens_stub.sql
     LC_PG_DB=lc89a LC_PG_PASSWORD=... node tests/arena_week1.test.mjs */
import postgres from 'postgres';
import { makeHandler } from '../arena/handler.js';
import { PG_TYPES } from '../arena/db.js';
const sql = postgres({ host: '127.0.0.1', username: 'postgres', database: process.env.LC_PG_DB || 'lc89a', password: process.env.LC_PG_PASSWORD || undefined, max: 4, types: PG_TYPES, onnotice: () => {} });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const env = { PID_SALT: 'salt-salt-salt-salt', ADMIN_TOKEN: 'admin-token-admin-token' };
const mk = (e) => { const h = makeHandler(sql, Object.assign({}, env, e || {})); return async (action, body) => { const r = await h(new Request('https://x.test/', { method: 'POST', headers: { Origin: 'https://lanckrietchess-app.vercel.app', 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ action }, body)) })); return Object.assign({ status: r.status }, await r.json()); }; };
const call = mk();
await sql.unsafe('truncate arena.players, arena.quota, arena.token_ledger, arena.token_bonus, arena.token_spend cascade');
const NEW = { device: 'week1-device-aaaa-1' }, OLD = { device: 'week1-device-bbbb-2' };
let r = await call('token_state', NEW), st = r.state || {};
ok(st.tier === 'free' && st.limit === 3 && st.left === 3, 'a new free device: 3 tokens today');
ok(st.week1 === true && st.week1Ends > Date.now() + 6.9 * 864e5 && st.week1Ends < Date.now() + 7.1 * 864e5, 'week1 is on and ends in 7 days');
for (const ref of ['g1', 'g2', 'g3']) { r = await call('token_spend', Object.assign({ kind: 'trim', ref }, NEW)); }
ok(r.charged === true && r.state.left === 0, 'three reviews spend the three daily tokens');
r = await call('token_spend', Object.assign({ kind: 'trim', ref: 'g4' }, NEW));
ok(r.status === 403 || r.reason === 'token_limit' || r.ok === false, 'the fourth review is refused (no bonus tokens)');
const oldPid = (await call('token_state', OLD)).pid;
await sql.unsafe('update arena.players set created = $1 where pid = $2', [Date.now() - 8 * 864e5, oldPid]);
r = await call('token_state', OLD); st = r.state || {};
ok(st.limit === 1 && st.week1 === false && st.week1Ends === 0, 'a device that first came 8 days ago: 1 token, week1 off');
const off = mk({ TOKENS_FREE_BOOST_DAYS: '0' });
await sql.unsafe('truncate arena.players, arena.token_ledger, arena.token_spend cascade');
r = await off('token_state', NEW); st = r.state || {};
ok(st.limit === 1 && st.week1 === false, 'TOKENS_FREE_BOOST_DAYS=0 switches the intro week off');
console.log(`\n${pass} passed, ${fail} failed`); await sql.end(); process.exit(fail ? 1 : 0);
