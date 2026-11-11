// 9.37.0: the caption grouping and split logic of the Studio (LC33S), extracted from app.html. node tests/captions_group.test.js
const fs=require('fs');const s=fs.readFileSync(__dirname+'/../app.html','utf8');
const cut=(a,b)=>{const i=s.indexOf(a);const j=s.indexOf(b,i);if(i<0||j<0)throw new Error('missing '+a);return s.slice(i,j)};
const src='const S=()=>({capWords:6,dict:"night => knight\\ncaro can => Caro-Kann"});const clean=t=>String(t==null?"":t).replace(/[\\u0000-\\u001f\\u007f<>]/g," ").replace(/\\s+/g," ").trim().slice(0,240);'
 +cut('  function wordTimes(line){','  function drawCap(')+cut('  function group(words,maxWords){','  /* ---------- 9.37.0: writing captions')
 +cut('  function splitAt(t,i,at){','  function playLine(c)')+';module.exports={group,wordTimes,fixText,fixAll,splitAt,mergeNext};';
fs.writeFileSync('/tmp/lc33s_part.js',src.replace(/const save=t=>Takes\.persistMeta\(t\);/,''));
const M=require('/tmp/lc33s_part.js');let pass=0,fail=0;const t=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':'  FAIL ')+n)};
const w=[['Hello',0,.3],['everyone.',.35,.8],['Today',1.6,1.9],['we',1.95,2.05],['play',2.1,2.3],['the',2.35,2.4],['Caro-Kann',2.45,2.9],['and',2.95,3.05],['win',3.1,3.3]].map(x=>({t:x[0],s:x[1],e:x[2]}));
const g=M.group(w,4);
t('new caption after a sentence end and after a pause',g[0].t==='Hello everyone.'&&g[1].t.startsWith('Today'));
t('max 4 words per caption',g.every(c=>c.t.split(' ').length<=4));
t('word times kept',g[1].w.length===g[1].t.split(' ').length&&g[1].w[0].s===1.6);
t('captions never overlap',g.every((c,i)=>i===0||g[i-1].e<=c.s));
t('fix words: night => knight, caro can => Caro-Kann',M.fixText('The night jumps, caro can is solid')==='The knight jumps, Caro-Kann is solid');
const take={captions:JSON.parse(JSON.stringify(g))};const n=take.captions.length;
t('split at the playhead',M.splitAt(take,1,2.34)&&take.captions.length===n+1&&take.captions[1].e===2.34);
t('merge with the next',M.mergeNext(take,1)&&take.captions.length===n);
console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);
