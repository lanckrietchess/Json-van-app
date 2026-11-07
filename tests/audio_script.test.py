#!/usr/bin/env python3
"""Test for tools/make_lesson_audio.py against a local stand-in for ElevenLabs (real HTTP, no real key). Run: python3 tests/audio_script.test.py"""
import importlib.util, io, json, os, sys, tempfile, threading, contextlib
from http.server import BaseHTTPRequestHandler, HTTPServer
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('mla', os.path.join(ROOT, 'tools', 'make_lesson_audio.py')); mla = importlib.util.module_from_spec(spec); spec.loader.exec_module(mla)
os.environ['LC_AUDIO_WAIT'] = '0'
P = F = 0
def ok(n, c, x=''):
    global P, F
    if c: P += 1; print('PASS', n)
    else: F += 1; print('FAIL', n, x)
class H(BaseHTTPRequestHandler):
    mode = 'ok'; seen = []; fails = 0
    def log_message(self, *a): pass
    def do_POST(self):
        n = int(self.headers.get('content-length', 0)); body = json.loads(self.rfile.read(n) or b'{}')
        H.seen.append({'path': self.path, 'key': self.headers.get('xi-api-key'), 'body': body})
        m = H.mode
        if m == '401': return self.send_response(401) or self.end_headers()
        if m == '402': self.send_response(402); self.end_headers(); return self.wfile.write(b'{"detail":"quota_exceeded"}')
        if m == '404': return self.send_response(404) or self.end_headers()
        if m == '429once' and H.fails == 0: H.fails = 1; return self.send_response(429) or self.end_headers()
        self.send_response(200); self.send_header('Content-Type', 'audio/mpeg'); self.end_headers(); self.wfile.write(b'ID3' + b'x' * 400)
srv = HTTPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d' % srv.server_port
def run(args, content, env=None, d=None):
    d = d or tempfile.mkdtemp(); cp = os.path.join(d, 'content.json'); json.dump(content, open(cp, 'w'))
    ep = os.path.join(d, '.env'); open(ep, 'w').write('# test\nELEVENLABS_API_KEY=sk-secret-123\nELEVENLABS_VOICE_ID = voiceX\nELEVENLABS_BASE=%s\n' % BASE if env is None else env)
    for k in ('ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_BASE', 'VOICE_ID'): os.environ.pop(k, None)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf): code = mla.main(['--content', cp, '--out', os.path.join(d, 'out'), '--env', ep] + args)
    return code, buf.getvalue(), d
C = {'lists': {'courses.endgame': [{'id': 'e1', 'idea': 'Know **when** a game is over \u2192 stalemate, repetition.', 'takeaway': 'Do not stalemate a won position \u2705.', 'learn': ['First paragraph about the opposition and the key squares.', 'Second paragraph about triangulation and tempo.']}],
     'courses.middlegame': [{'id': 'm1', 'idea': 'Before every move, find the threat.', 'takeaway': 'Before every move, find the threat.', 'learn': []}], 'middlegame': [{'id': 'p1', 'principle': 'Count the free squares of the king first.'}], 'endgame': []},
     'trees': [{'id': 't1', 'tree': {'m': 'e4', 'n': 'The centre pawn takes space and opens lines.', 'c': [{'m': 'c6', 'n': 'The Caro-Kann prepares d5 with a solid base.'}]}}]}
code, out, d = run(['--dry'], C); n0 = len(H.seen)
ok('dry run: calls nothing, writes no audio, says what it would do', code == 0 and n0 == 0 and 'to generate: 6' in out and not [f for f in os.listdir(os.path.join(d, 'out')) if f.endswith('.mp3')], out)
code, out, d = run([], C, d=d); mp3 = sorted(f for f in os.listdir(os.path.join(d, 'out')) if f.endswith('.mp3')); idx = json.load(open(os.path.join(d, 'out', 'index.json')))
ok('normal run: one mp3 per text (the same text under two sources is ONE clip) and an index', code == 0 and len(mp3) == 6 and len(idx['clips']) == 6 and idx['refs']['courses.middlegame:m1/idea'] == idx['refs']['courses.middlegame:m1/takeaway'] and len(idx['refs']) == 7, (code, mp3))
ok('the key is sent as xi-api-key, the voice id has its stray spaces trimmed, and the key is never printed', all(s['key'] == 'sk-secret-123' for s in H.seen) and '/text-to-speech/voiceX' in H.seen[0]['path'] and 'sk-secret-123' not in out, H.seen[0]['path'])
spoken = ' '.join(s['body']['text'] for s in H.seen)
ok('what is spoken is cleaned: no markdown, no emoji, arrow said as "to"', '**' not in spoken and '\u2705' not in spoken and '\u2192' not in spoken and 'over to stalemate' in spoken, spoken[:120])
n1 = len(H.seen); code, out, d = run([], C, d=d)
ok('second run: nothing to do, no request', code == 0 and len(H.seen) == n1 and 'Nothing to do' in out, out)
C2 = json.loads(json.dumps(C)); C2['lists']['middlegame'][0]['principle'] = 'Count the free squares of the king first, then search every check.'
code, out, d = run([], C2, d=d)
ok('a changed text gets a new clip, only that one is generated, the old file stays', len(H.seen) == n1 + 1 and len([f for f in os.listdir(os.path.join(d, 'out')) if f.endswith('.mp3')]) == 7, out)
code, out, d = run(['--force'], C, d=d)
ok('--force generates everything again', len(H.seen) == n1 + 1 + 6, len(H.seen))
code, out, d = run(['--limit', '2', '--force'], C, d=tempfile.mkdtemp()); ok('--limit 2 stops after two clips', len([f for f in os.listdir(os.path.join(d, 'out')) if f.endswith('.mp3')]) == 2, out)
code, out, d = run(['--budget', '90'], C, d=tempfile.mkdtemp()); got = len([f for f in os.listdir(os.path.join(d, 'out')) if f.endswith('.mp3')])
ok('--budget stops before the characters run past it and says so', 0 < got < 6 and 'Budget reached' in out, (got, out))
code, out, d = run(['--scope', 'notes'], C, d=tempfile.mkdtemp()); ok('--scope notes reads the opening-tree move notes', 'to generate: 2' in out and code == 0, out)
code, out, d = run(['--scope', 'takeaway,nonsense'], C); ok('an unknown scope is refused with exit code 2', code == 2 and 'Unknown scope' in out, out)
code, out, d = run([], C, env='ELEVENLABS_BASE=%s\n' % BASE, d=tempfile.mkdtemp()); ok('missing key or voice: clear message, exit 2, no request', code == 2 and 'Missing ELEVENLABS_API_KEY' in out, out)
H.mode = '401'; n2 = len(H.seen); code, out, d = run([], C, d=tempfile.mkdtemp())
ok('wrong key (401): stops after the FIRST request with a clear message, exit 1, nothing half-written', code == 1 and len(H.seen) == n2 + 1 and 'refused the key' in out and not [f for f in os.listdir(os.path.join(d, 'out')) if f.endswith(('.mp3', '.part'))], out)
H.mode = '402'; n2 = len(H.seen); code, out, d = run([], C, d=tempfile.mkdtemp()); ok('plan used up (402): stops, tells what to do', code == 1 and len(H.seen) == n2 + 1 and 'used up' in out, out)
H.mode = '404'; code, out, d = run([], C, d=tempfile.mkdtemp()); ok('voice not found (404): stops with a clear message', code == 1 and 'voice not found' in out, out)
H.mode = '429once'; H.fails = 0; code, out, d = run(['--limit', '1'], C, d=tempfile.mkdtemp())
ok('a busy answer (429) is retried and then works', code == 0 and 'Generated 1 clips' in out, out)
H.mode = 'ok'
# the real content: how many texts and characters a full run would voice (informational)
buf = io.StringIO()
with contextlib.redirect_stdout(buf): mla.main(['--dry', '--out', tempfile.mkdtemp(), '--env', '/nonexistent'])
real = buf.getvalue().splitlines()[0]; print('INFO real content.json, default scope:', real)
ok('the real content.json can be read and counted', 'Texts found:' in real and 'to generate:' in real, real)
print('\nRESULT', P, 'passed', F, 'failed'); sys.exit(1 if F else 0)
