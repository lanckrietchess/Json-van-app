/* 9.50.0: the on-device caption writer (Whisper) dropped every "you" the speaker said.
   Its hallucination filter ended in "|you" and was tested on every single WORD. This test runs the real filter code from app.html:
   real words stay (you, thanks, thank you), noise tags go, Whisper's stock inventions go, and a lone "you" / "thank you" goes only on silence.
   Run: node tests/captions_you.test.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const a = src.indexOf('const NOISE='), b = src.indexOf('let whisperM={};', a);
if (a < 0 || b < 0) { console.log('RESULT 0 passed 1 failed (filter code not found)'); process.exit(1); }
const block = src.slice(a, b);
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const ctx = {};
vm.runInNewContext(block + '\nthis.NOISE=NOISE;this.HALLU=HALLU;this.HALLU_QUIET=HALLU_QUIET;this.realLines=realLines;this.loudIn=loudIn;', ctx);

/* 10 seconds of audio at 16 kHz: speech (loud) from 0 to 6 s, silence from 6 to 10 s */
const pcm = new Float32Array(16000 * 10);
for (let i = 0; i < 16000 * 6; i++) pcm[i] = 0.3 * Math.sin(i / 7);
const audio = { pcm, dur: 10, peak: 0.3 }, floor = Math.max(0.004, audio.peak * 0.03);

console.log('A. single words are never dropped for what they say');
['you', 'You', 'you,', 'You?', 'thanks', 'Thanks!', 'your', 'you’re'].forEach((w) => ok(!ctx.NOISE.test(w), '"' + w + '" is a real word'));
['[Music]', '(applause)', '♪', '♪♪ la la'].forEach((w) => ok(ctx.NOISE.test(w), '"' + w + '" is a noise tag'));

console.log('B. lines: Whisper inventions go, real speech stays');
const L = (t, s, e) => ({ t, s, e });
const kept = ctx.realLines(audio, [
  L('Do you see the fork?', 0.5, 2), L('you', 2.2, 2.5), L('Thank you', 3, 3.6), L('Thanks!', 4, 4.4),
  L('Thank you for watching', 4.5, 5.5), L('Subtitles by the community', 5.5, 5.9), L('[Music]', 1, 2),
  L('you', 7, 7.4), L('Thank you.', 8, 8.6)
], floor).map((l) => l.t + '@' + l.s);
ok(kept.indexOf('Do you see the fork?@0.5') >= 0, 'a sentence with "you" stays');
ok(kept.indexOf('you@2.2') >= 0, 'a spoken "you" on its own line stays');
ok(kept.indexOf('Thank you@3') >= 0 && kept.indexOf('Thanks!@4') >= 0, 'a spoken "thank you" / "thanks" stays');
ok(kept.indexOf('Thank you for watching@4.5') < 0, '"Thank you for watching" (a stock invention) goes');
ok(kept.indexOf('Subtitles by the community@5.5') < 0 && kept.indexOf('[Music]@1') < 0, '"Subtitles by…" and "[Music]" go');
ok(kept.indexOf('you@7') < 0 && kept.indexOf('Thank you.@8') < 0, 'a lone "you" / "thank you" on silence goes (what Whisper invents)');
ok(kept.length === 4, 'four real lines kept (' + kept.join(', ') + ')');

console.log('C. the old bug is gone');
const old = /^\W*(thank(s| you)( so much)?( for watching)?|subtitles? by.*|(\[|\().*(\]|\))|♪+.*|you)\W*$/i;
ok(old.test('you') && !ctx.NOISE.test('you'), 'the old filter dropped the word "you"; the word filter now keeps it');
ok(!/\|you\)\\W\*\$\/i;\s*\n\s*function loudIn/.test(block) && block.indexOf('words.filter') < 0, 'no word is tested against the line filter any more');
ok(/const ok=words\.filter\(w=>w\.t&&!NOISE\.test\(w\.t\)/.test(src), 'app.html filters words with NOISE only');

console.log('RESULT ' + pass + ' passed ' + fail + ' failed');
process.exit(fail ? 1 : 0);
