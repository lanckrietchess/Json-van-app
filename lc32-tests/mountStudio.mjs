import { start, sleep } from './rig.mjs';
export async function boot(opts = {}) {
  const rig = await start('/home/claude/build/' + (opts.file || 'index.html'), opts);
  const d = await rig.device({}, { path: '/', w: opts.w, h: opts.h });
  await sleep(3500);
  const r = await d.page.evaluate((host0) => { try {
    const host = document.createElement('div'); host.id = 'harness';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#0A0B0E;overflow:auto';
    document.body.append(host);
    window.__un = LanckrietStudio.mount(host, Object.assign({ isLocked: () => false, isAdmin: () => true, tier: () => 'free', isCreator: () => true, upgrade() {}, stockfish: () => Engine, chessUser: () => (window.__ccUser || '') }), { embedded: true });
    return 'mounted'; } catch (e) { return 'ERR ' + e.message; } });
  if (r !== 'mounted') throw new Error(r);
  await sleep(1200);
  return { rig, d };
}
