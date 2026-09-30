#!/usr/bin/env node
/* Lanckriet Arena server: one-command setup.
   In this folder, run:   node setup.mjs
   It signs you in to Cloudflare (a browser window opens once), creates the
   database and its tables, publishes the Worker, sets its secrets (it asks
   you for your Anthropic API key, for the AI coach; you can skip that) and
   prints what to paste into the hub. Safe to run again: it reuses what
   exists and never changes PID_SALT once it is set (that would give every
   player a new public id). A new admin token: node setup.mjs --new-token */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WRANGLER = (process.env.WRANGLER || 'npx --yes wrangler@4').split(' ').filter(Boolean);
const DB = 'lanckriet-arena', TOML = path.join(HERE, 'wrangler.toml'), TOKEN_FILE = path.join(HERE, 'admin-token.txt');
const strip = (s) => String(s || '').replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
const say = (s) => console.log('\n== ' + s);
function w(args, opt) {
  opt = opt || {};
  const r = spawnSync(WRANGLER[0], WRANGLER.slice(1).concat(args), { cwd: HERE, encoding: 'utf8', shell: process.platform === 'win32', input: opt.input,
    stdio: [opt.input != null ? 'pipe' : 'inherit', opt.capture ? 'pipe' : 'inherit', 'inherit'] });
  if (r.error) { console.error('Could not start Wrangler: ' + r.error.message); process.exit(1); }
  const out = strip(r.stdout);
  if (opt.capture && opt.echo) process.stdout.write(out);
  if (r.status !== 0 && !opt.soft) { console.error('\nThat step failed (wrangler ' + args.slice(0, 2).join(' ') + '). Read the message above, fix it, then run node setup.mjs again.'); process.exit(r.status || 1); }
  return { ok: r.status === 0, out };
}
function jsonList(text) {
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a < 0 || b < a) return null;
  try { const v = JSON.parse(text.slice(a, b + 1)); return Array.isArray(v) ? v : null; } catch (e) { return null; }
}

if (+process.versions.node.split('.')[0] < 20) { console.error('Node.js 20 or newer is needed (this is ' + process.versions.node + '). Get the LTS version at nodejs.org.'); process.exit(1); }

say('1/6  Your Cloudflare account');
if (/not authenticated|not logged in|wrangler login/i.test(w(['whoami'], { capture: true, soft: true }).out)) w(['login']);

say('2/6  The database');
const findDb = () => (jsonList(w(['d1', 'list', '--json'], { capture: true }).out) || []).filter((d) => d && d.name === DB)[0];
let db = findDb();
if (!db) { w(['d1', 'create', DB]); db = findDb(); }
if (!db || !db.uuid) { console.error('The database ' + DB + ' was not found after creating it. Run node setup.mjs again.'); process.exit(1); }
let toml = fs.readFileSync(TOML, 'utf8');
if (toml.indexOf('database_id = "' + db.uuid + '"') < 0) {
  toml = toml.replace(/database_id = "[^"]*"/, 'database_id = "' + db.uuid + '"');
  fs.writeFileSync(TOML, toml);
  console.log('wrangler.toml now points at database ' + db.uuid);
} else console.log('Database ' + DB + ' is ready (' + db.uuid + ').');

say('3/6  The tables');
w(['d1', 'execute', DB, '--remote', '--file=schema.sql', '--yes']);

say('4/6  Publishing the Worker');
let dep = w(['deploy'], { capture: true, echo: true, soft: true });
if (!dep.ok) { console.log('\nPublishing needs an answer from you (for example a workers.dev name). Once more, interactively:'); dep = w(['deploy']); }
const url = (dep.out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0] || '';

say('5/6  Secrets');
const listed = w(['secret', 'list'], { capture: true, soft: true }).out;
const names = (jsonList(listed) || []).map((s) => s && s.name).filter(Boolean);
const has = (n) => names.indexOf(n) >= 0;
if (!has('PID_SALT')) { w(['secret', 'put', 'PID_SALT'], { input: crypto.randomBytes(24).toString('base64url') + '\n' }); console.log('PID_SALT set. It stays the same from now on.'); }
else console.log('PID_SALT is already set: kept.');
let token = '';
if (!has('ADMIN_TOKEN') || process.argv.indexOf('--new-token') >= 0) {
  token = crypto.randomBytes(24).toString('base64url');
  w(['secret', 'put', 'ADMIN_TOKEN'], { input: token + '\n' });
  fs.writeFileSync(TOKEN_FILE, token + '\n');
  console.log('ADMIN_TOKEN set.');
} else console.log('ADMIN_TOKEN is already set: kept.' + (fs.existsSync(TOKEN_FILE) ? ' It is in admin-token.txt.' : ' For a new one: node setup.mjs --new-token'));
if (!has('ANTHROPIC_API_KEY')) {
  console.log('\nThe AI coach needs an Anthropic API key: create one in the Claude Console (platform.claude.com), under API keys.\nPaste it when Wrangler asks for the secret value, or just press Enter to skip: everything else works without the AI coach.');
  const r = w(['secret', 'put', 'ANTHROPIC_API_KEY'], { soft: true });
  console.log(r.ok ? 'ANTHROPIC_API_KEY set: the AI coach is on.' : 'Skipped: no AI coach for now. Later: npx wrangler secret put ANTHROPIC_API_KEY');
} else console.log('ANTHROPIC_API_KEY is already set: the AI coach is on.');

say('6/6  Check');
if (url) {
  try {
    const j = await (await fetch(url)).json();
    console.log(j && j.service === 'lanckriet-arena' ? 'The server answers at ' + url : 'Something else answers at ' + url + '. Check the deploy output above.');
  } catch (e) { console.log('No answer yet from ' + url + ' (a new workers.dev address can take a minute). Open it in your browser in a moment.'); }
} else console.log('Copy the https://...workers.dev address from the publishing output above.');
console.log('\n' + '-'.repeat(64) + '\nDone. In the hub, admin mode: Admin menu > Weekly tournament and sales bridge > Arena server\n  Server address: ' + (url || '(the workers.dev address above)') +
  '\n  Admin token:    ' + (token || (fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '(unchanged)')) +
  '\nThen: Test the connection, Save, Publish.\nThe admin token is saved in admin-token.txt in this folder. Keep it private; never put it in the hub’s published content.\n' + '-'.repeat(64));
