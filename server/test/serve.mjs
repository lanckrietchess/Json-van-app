/* Runs the Arena server on your computer, without Cloudflare: node test/serve.mjs
   Then put http://127.0.0.1:8787 as the server address in the hub (admin mode). */
import http from 'node:http';
import fs from 'node:fs';
import worker from '../arena-worker.js';
import { makeD1 } from './d1shim.mjs';
const port = +process.env.PORT || 8787;
const env = { DB: makeD1(process.env.DB_FILE), ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'local-admin-token-change-me', ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*', PID_SALT: 'local', CONTENT_URL: process.env.CONTENT_URL || '', MAX_PUZZLES: process.env.MAX_PUZZLES || '3000' };
['ANTHROPIC_API_KEY', 'ANTHROPIC_URL', 'MODEL', 'MEMBER_KEYS', 'MAX_DEVICES', 'AI_DAILY', 'AI_DAILY_MENTOR', 'AI_DAILY_TOTAL', 'AI_DAILY_ADMIN', 'MAX_TOKENS', 'MAX_TOKENS_ADMIN'].forEach((k) => { if (process.env[k]) env[k] = process.env[k]; });
await env.DB.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = {};
  ['content-type', 'origin'].forEach((k) => { if (req.headers[k]) headers[k] = req.headers[k]; });
  const r = await worker.fetch(new Request('http://127.0.0.1:' + port + req.url, { method: req.method, headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks) }), env, { waitUntil() {} });
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, '127.0.0.1', () => console.log('Arena server on http://127.0.0.1:' + port + '  (admin token: ' + env.ADMIN_TOKEN + ')'));
