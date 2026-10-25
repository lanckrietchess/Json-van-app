import { start, sleep } from './rig.mjs';
const rig = await start('/home/claude/build/index.html');
const d = await rig.device({}, { path: '/' });
await sleep(5000);
const v = await d.page.evaluate(()=>({studio:typeof LanckrietStudio, ver:LanckrietStudio&&LanckrietStudio.version, lc31:typeof (LanckrietStudio&&LanckrietStudio.lc31), pageVer:(typeof CONFIG!=='undefined'&&CONFIG.assetVersion)||''}));
console.log(JSON.stringify(v));
const errs=d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e));
console.log('page errors on boot:',errs.length,errs.slice(0,3));
await rig.close();
