"""LC32: arena.js gets carousel_voice (Carousel Builder voice-over paid in tokens, per 1,000 characters).
   python3 patch_arena_v32.py <in arena.js> <out arena.js>      every anchor must match exactly once."""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def once(a, b, label):
    global s
    n = s.count(a)
    if n != 1: sys.exit(f"PATCH FAILED [{label}]: anchor found {n}x")
    s = s.replace(a, b); print("ok", label)

once("  async coach_voice_info(b, env) { return voiceInfo(b, env); },",
     "  async coach_voice_info(b, env) { return voiceInfo(b, env); },\n"
     "  /* LC32: Carousel Builder voice-over, paid in tokens. See carouselVoice(). */\n"
     "  async carousel_voice(b, env) { return carouselVoice(b, env); },", "action entry")

FN = r'''
/* LC32: Carousel Builder voice-over (Coach Lanckriet's ElevenLabs voice), paid in TOKENS instead of the tier's character allowance.
   Price: one token per 1,000 characters of NEW audio, rounded up, for the whole job (env VOICE_TOKEN_CHARS changes the 1,000).
   Text that is already in voice_cache is free: nothing is generated. The tokens come out of today's pocket first and the bonus
   (purchased or earned) pocket second, exactly like token_spend, and the same ref is never charged twice on the same day.
   If any clip cannot be generated, the tokens and the global character fuse are given back. dry:true prices a job without charging. */
const CAROUSEL_VOICE_MAX_CLIPS = 12, CAROUSEL_VOICE_MAX_TOTAL = 5000;
function voiceTokenCost(chars, env) {
  const per = envInt(env.VOICE_TOKEN_CHARS, 200, 10000, 1000);
  return chars > 0 ? Math.ceil(chars / per) : 0;
}
async function elevenClip(V, text) {
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + V.voice + '?output_format=' + V.format, {
      method: 'POST', headers: { 'xi-api-key': V.key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: V.model }), signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) { console.error('voice upstream', r.status); return null; }
    const buf = await r.arrayBuffer();
    return buf.byteLength >= 800 && buf.byteLength <= 1500000 ? buf : null;
  } catch (e) { console.error('voice upstream failed'); return null; }
}
async function carouselVoice(b, env) {
  const V = voiceCfg(env), me = await touch(env, b);
  if (me.banned) throw err('revoked', 403);
  const rawList = Array.isArray(b.texts) ? b.texts : [];
  if (rawList.length < 1 || rawList.length > CAROUSEL_VOICE_MAX_CLIPS) throw err('bad_input');
  const texts = rawList.map((x) => (typeof x === 'string' ? x.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim() : ''));
  if (texts.some((x) => x.length > VOICE_MAX_CHARS)) throw err('too_long', 413, { max: VOICE_MAX_CHARS });
  if (texts.some((x) => x.length === 1)) throw err('bad_input');
  const total = texts.reduce((n, x) => n + x.length, 0);
  if (total < 2) throw err('empty', 400);
  if (total > CAROUSEL_VOICE_MAX_TOTAL) throw err('too_long', 413, { max: CAROUSEL_VOICE_MAX_TOTAL, scope: 'job' });
  const t = await tierOf(env, b, me);
  await adoptBonus(env, t, me);
  await quota(env, t.owner, 'voicereq', 1, 800);
  const view = async () => tokenView(env, t, await tokenUsed(env, t.owner), await bonusOf(env, t.owner));
  const hashes = [], hits = [];
  for (const x of texts) {
    if (!x) { hashes.push(''); hits.push(null); continue; }
    const hash = await hashId(env, 'voice|' + V.voice + '|' + V.model + '|' + V.format + '|' + x, 32);
    hashes.push(hash);
    hits.push(await env.DB.prepare('SELECT audio FROM voice_cache WHERE hash = ?').bind(hash).first());
  }
  const miss = texts.map((x, i) => (x && !hits[i] ? i : -1)).filter((i) => i >= 0);
  const newChars = miss.reduce((n, i) => n + texts[i].length, 0), cost = voiceTokenCost(newChars, env);
  if (b.dry === true) return { dry: true, enabled: V.ok, chars: total, newChars, cost, clips: texts.filter(Boolean).length, perTokenChars: envInt(env.VOICE_TOKEN_CHARS, 200, 10000, 1000), state: await view() };
  if (miss.length && !V.ok) throw err('voice_off', 503);
  const ref = String(b.ref || '');
  if (cost > 0 && !/^[\w:|.-]{1,120}$/.test(ref)) throw err('bad_input');
  const L = limitsOf(env, t.name), day = today(), ctx = { fused: false }, taken = [];
  let logged = false, fuse = false;
  const undo = async () => {
    if (taken.length) await giveBack(env, t, taken, ipOwner);
    if (logged) await env.DB.prepare('DELETE FROM token_spend WHERE owner = ? AND day = ? AND ref = ?').bind(t.owner, day, ref).run();
    if (fuse) await voiceRefund(env, '~all', newChars);
  };
  const ipOwner = t.name === 'free' && b.__ip ? 'ip:' + (await hashId(env, 'ip|' + b.__ip, 12)) : '';
  if (cost > 0) {
    const log = await env.DB.prepare('INSERT OR IGNORE INTO token_spend (owner, day, ref, kind, t) VALUES (?, ?, ?, ?, ?)').bind(t.owner, day, ref, 'voice', now()).run();
    if (log.meta.changes) {                                                                     // a retry of a paid job is not charged again
      logged = true;
      for (let i = 0; i < cost; i++) { const s = await takeOne(env, t, L, ipOwner, ctx); if (!s) break; taken.push(s); }
      if (taken.length < cost) {
        await undo();
        throw err('token_limit', 403, { tier: t.name, scope: ctx.fused ? 'network' : 'daily', needed: cost, state: await view() });
      }
    }
  }
  if (newChars > 0) {
    if (!(await voiceSpend(env, '~all', newChars, envInt(env.VOICE_CHARS_TOTAL, 0, 1e9, 400000)))) { await undo(); throw err('voice_busy', 503); }
    fuse = true;
  }
  const clips = [];
  for (let i = 0; i < texts.length; i++) {
    if (!texts[i]) { clips.push({ i, audio: '', cached: false }); continue; }
    if (hits[i]) {
      await env.DB.prepare('UPDATE voice_cache SET last = ?, plays = plays + 1 WHERE hash = ?').bind(now(), hashes[i]).run();
      clips.push({ i, audio: hits[i].audio, cached: true });
      continue;
    }
    const buf = await elevenClip(V, texts[i]);
    if (!buf) { await undo(); throw err('voice_unavailable', 503); }
    const b64 = toBase64(buf);
    await env.DB.prepare('INSERT OR IGNORE INTO voice_cache (hash, audio, chars, created, last, plays) VALUES (?, ?, ?, ?, ?, 1)').bind(hashes[i], b64, texts[i].length, now(), now()).run();
    clips.push({ i, audio: b64, cached: false });
  }
  const fromBonus = taken.filter((x) => x === 'bonus').length;
  return { clips, chars: total, newChars, cost, charged: taken.length > 0, fromDaily: taken.length - fromBonus, fromBonus, state: await view() };
}
'''
once("/* The caller's network address. Supabase's edge sits behind Cloudflare", FN + "/* The caller's network address. Supabase's edge sits behind Cloudflare", "function")
open(dst, 'w', encoding='utf-8').write(s)
