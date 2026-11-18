/* scripts/build-mspc-audio.mjs (9.61.0): the slots it voices and the text fingerprint the page checks (LC96._t.fnv).
   Run: node tests/mspc_audio.test.mjs (no network, no key). */
import { fnv, slotsOf } from '../scripts/build-mspc-audio.mjs';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
ok(fnv('MSPC is how I went from 355 to 2105.') === '0x'.slice(0, 0) + fnv('MSPC is how I went from 355 to 2105.') && /^[0-9a-f]{1,8}$/.test(fnv('x')), 'fnv is a short hex fingerprint');
ok(fnv('') === '811c9dc5', 'fnv of the empty text is the FNV-1a offset basis');
ok(fnv('a') === 'e40c292c', 'fnv("a") matches FNV-1a 32-bit');
const v = { intro: { t: 'Hello' }, steps: { M: { t: 'Their move' }, S: { t: '' } }, use: { t: ' ' }, you: { t: 'You' },
  examples: [{ id: '186390149978-31', M: { t: 'Pawn left' }, move: { t: 'Fork' } }, { id: '../x', M: { t: 'bad id' } }] };
const keys = slotsOf(v).map((s) => s.key);
ok(JSON.stringify(keys) === JSON.stringify(['intro', 'step-M', 'you', 'ex-186390149978-31-M', 'ex-186390149978-31-move', 'ex-x-M']), 'only slots with a text, safe keys: ' + keys.join(','));
ok(slotsOf(null).length === 0 && slotsOf({ examples: 'no' }).length === 0, 'an empty or odd config has no slots');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
